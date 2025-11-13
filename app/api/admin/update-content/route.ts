import { NextRequest } from "next/server";
import { createUpdateHistory, performIncrementalUpdate, type LogEvent } from "@/lib/contentUpdater";
import fs from "fs/promises";
import path from "path";

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

  const { chatName, sitemapUrl, triggeredBy = "manual" } = body;

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

  if (!sitemapUrl) {
    return new Response(
      JSON.stringify({ error: "Sitemap URL is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  // Get chat config to find file search store
  const configPath = path.join(process.cwd(), "data", "chat-configs", `${chatName}.json`);

  let chatConfig;
  try {
    const configContent = await fs.readFile(configPath, "utf-8");
    chatConfig = JSON.parse(configContent);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Chat config not found for: ${chatName}` }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  if (!chatConfig.fileSearchStoreName) {
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

        // Create update history entry
        const updateId = await createUpdateHistory(chatName, triggeredBy);
        sendLog({ type: "info", message: `📝 Update ID: ${updateId}` });

        // Run the update process with streaming logs
        await performIncrementalUpdate(
          chatName,
          sitemapUrl,
          chatConfig.fileSearchStoreName,
          updateId,
          triggeredBy,
          sendLog  // Pass the log callback
        );

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
