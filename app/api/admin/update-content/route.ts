import { NextRequest } from "next/server";
import { createUpdateHistory, performIncrementalUpdate, type LogEvent } from "@/lib/contentUpdater";
import { db } from "@/lib/db";
import { chatConfigs, scrapedPages } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ai } from "@/lib/gemini";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";

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

          // Helper function to extract field values (same as add-content)
          const getField = (obj: any, keys: string[]) => {
            for (const key of keys) {
              if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
                return obj[key];
              }
            }
            return null;
          };

          // Get existing URLs from database for this chat
          const existingPages = await db
            .select()
            .from(scrapedPages)
            .where(eq(scrapedPages.chatName, chatName));

          const existingUrls = new Set(existingPages.map(p => p.url));
          sendLog({ type: "info", message: `📊 ${existingUrls.size} bestehende Einträge gefunden` });

          // Filter to only new items (items with URLs that don't exist yet)
          const newItems = jsonData.filter((item: any) => {
            const url = getField(item, ['url', 'link', 'href']);
            return url && !existingUrls.has(url);
          });

          const skippedCount = jsonData.length - newItems.length;

          if (newItems.length === 0) {
            sendLog({ type: "info", message: `ℹ️ Keine neuen Einträge zum Importieren` });
            sendLog({ type: "complete", message: `✅ JSON-API Update abgeschlossen (${skippedCount} bestehende Einträge übersprungen)` });
          } else {
            sendLog({ type: "info", message: `📝 ${newItems.length} neue Einträge zum Importieren, ${skippedCount} übersprungen` });

            // Import new items
            let uploadedCount = 0;

            for (let i = 0; i < newItems.length; i++) {
              const item = newItems[i];

              // Auto-detect fields
              const title = getField(item, ['title', 'name', 'heading', 'label']) || `Item ${i + 1}`;
              const content = getField(item, ['content', 'body', 'text', 'description']) || JSON.stringify(item, null, 2);
              const url = getField(item, ['url', 'link', 'href']);
              const itemId = getField(item, ['id', 'identifier', 'key']);

              sendLog({
                type: "progress",
                current: i + 1,
                total: newItems.length,
                message: `📄 Importiere ${i + 1}/${newItems.length}: ${title}`
              });

              try {
                // Write to temp file
                const tempDir = os.tmpdir();
                const filename = `json-api-${Date.now()}-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
                const tempPath = path.join(tempDir, filename);
                await fs.writeFile(tempPath, content, "utf-8");

                // Upload to File Search Store
                let operation = await ai.fileSearchStores.uploadToFileSearchStore({
                  fileSearchStoreName: fileSearchStoreName,
                  file: tempPath,
                  config: {
                    mimeType: "text/plain",
                    displayName: title,
                    customMetadata: [
                      { key: "title", stringValue: title },
                      { key: "source", stringValue: "json-api" },
                      { key: "apiUrl", stringValue: apiUrl },
                      ...(url ? [{ key: "url", stringValue: url }] : []),
                      ...(itemId ? [{ key: "itemId", stringValue: itemId }] : []),
                    ],
                  },
                });

                const maxWaitTime = 60000;
                const startTime = Date.now();
                let attempt = 0;

                while (!operation.done) {
                  if (Date.now() - startTime > maxWaitTime) {
                    sendLog({ type: "info", message: `   ⏱️ Timeout bei: ${title}` });
                    break;
                  }

                  const delays = [3000, 5000, 8000, 10000];
                  const delay = delays[Math.min(attempt, delays.length - 1)];
                  await new Promise((resolve) => setTimeout(resolve, delay));
                  attempt++;

                  operation = await ai.operations.get({ operation: operation });
                }

                if (operation.done && !operation.error) {
                  // Track in database
                  if (url) {
                    try {
                      const pageId = `json_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                      await db.insert(scrapedPages).values({
                        id: pageId,
                        chatName,
                        url: url,
                        fileSearchDocumentName: operation.response?.documentName || null,
                        lastScrapedAt: Date.now(),
                        sitemapLastMod: null,
                        title: title,
                        displayName: title,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                      });
                    } catch (dbError) {
                      console.error(`Failed to insert scrapedPage for ${url}:`, dbError);
                    }
                  }

                  uploadedCount++;
                  sendLog({ type: "info", message: `   ✓ ${title}` });
                } else if (operation.error) {
                  sendLog({ type: "info", message: `   ✗ Fehler bei ${title}` });
                }

                // Clean up temp file
                try {
                  await fs.unlink(tempPath);
                } catch (err) {
                  // Ignore cleanup errors
                }
              } catch (error: any) {
                sendLog({ type: "info", message: `   ✗ Fehler: ${error.message}` });
              }
            }

            sendLog({
              type: "complete",
              message: `✅ ${uploadedCount} von ${newItems.length} neuen Einträgen importiert (${skippedCount} übersprungen)`
            });
          }

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
