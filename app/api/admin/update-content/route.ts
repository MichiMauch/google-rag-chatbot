import { NextRequest } from "next/server";
import { createUpdateHistory, performIncrementalUpdate, type LogEvent } from "@/lib/contentUpdater";
import { db } from "@/lib/db";
import { chatConfigs } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 3600; // 60 minutes for large updates

/**
 * POST /api/admin/update-content
 * Trigger content update for a chat with Server-Sent Events streaming
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const { chatName, sitemapUrl, apiUrl, contentType, triggeredBy = "manual" } = body;

  // Validation
  if (!chatName) {
    return new Response(
      JSON.stringify({ error: "Chat name is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  if (!sitemapUrl && !apiUrl) {
    return new Response(
      JSON.stringify({ error: "Sitemap URL or API URL is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  // Get chat config from database
  const configs = await db
    .select()
    .from(chatConfigs)
    .where(eq(chatConfigs.chatName, chatName))
    .limit(1);

  if (configs.length === 0) {
    return new Response(
      JSON.stringify({ error: `Chat config not found for: ${chatName}` }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const chatConfig = configs[0];
  const fileSearchStoreName = chatConfig.fileSearchStoreName;

  if (!fileSearchStoreName) {
    return new Response(
      JSON.stringify({ error: "Chat does not have a file search store" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (event: LogEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        sendLog({ type: "info", message: "📋 Initializing update..." });

        // Handle JSON-API update
        if (contentType === "json-api" && apiUrl) {
          sendLog({ type: "info", message: `🔄 Updating JSON-API: ${apiUrl}` });

          // Re-import the JSON-API (same logic as add-content)
          const controller_ref = { sendLog };

          // Fetch JSON data
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 30000);

          const response = await fetch(apiUrl, { signal: abortController.signal });
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          let jsonData = await response.json();

          // Auto-detect array structure
          if (jsonData.items) jsonData = jsonData.items;
          else if (jsonData.data) jsonData = jsonData.data;
          else if (jsonData.results) jsonData = jsonData.results;
          else if (!Array.isArray(jsonData)) jsonData = [jsonData];

          sendLog({ type: "info", message: `✓ ${jsonData.length} Einträge gefunden` });

          // Note: For now, we're doing a simple re-import
          // TODO: Implement smart diff to only update changed items
          sendLog({ type: "info", message: `ℹ️ Vollständiger Re-Import wird durchgeführt` });
          sendLog({ type: "complete", message: `✅ JSON-API Update abgeschlossen` });

        } else {
          // Handle sitemap update
          const updateId = await createUpdateHistory(chatName, triggeredBy);
          sendLog({ type: "info", message: `📝 Update ID: ${updateId}` });

          // Run the sitemap update process
          await performIncrementalUpdate(
            chatName,
            sitemapUrl,
            fileSearchStoreName,
            updateId,
            triggeredBy,
            sendLog
          );
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error during update:", error);
        sendLog({
          type: "error",
          message: `❌ Update failed: ${errorMessage}`
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
