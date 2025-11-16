import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import {
  parseSitemapWithDates,
  scrapeMultiplePages,
} from "@/lib/scraper";
import { db } from "@/lib/db";
import { chatConfigs, scrapedPages as scrapedPagesTable } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 3600; // 60 minutes

const MAX_PAGES = 100;

type LogEvent = {
  type: "info" | "progress" | "batch_start" | "batch_complete" | "complete" | "error";
  message?: string;
  current?: number;
  total?: number;
  batch?: number;
};

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { chatName, contentType, sitemapUrl, file, apiUrl, maxPages = MAX_PAGES } = body;

  if (!chatName || !contentType) {
    return NextResponse.json(
      { error: "Chat-Name und Content-Type erforderlich" },
      { status: 400 }
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
        sendLog({ type: "info", message: `📦 Lade Inhalt für Chat "${chatName}"...` });

        // Get existing chat config
        const configs = await db
          .select()
          .from(chatConfigs)
          .where(eq(chatConfigs.chatName, chatName))
          .limit(1);

        if (configs.length === 0) {
          sendLog({ type: "error", message: "❌ Chat nicht gefunden" });
          controller.close();
          return;
        }

        const chatConfig = configs[0];
        const fileSearchStoreName = chatConfig.fileSearchStoreName;

        if (!fileSearchStoreName) {
          sendLog({ type: "error", message: "❌ Kein File Search Store vorhanden" });
          controller.close();
          return;
        }

        if (contentType === "sitemap") {
          if (!sitemapUrl) {
            sendLog({ type: "error", message: "❌ Keine Sitemap-URL angegeben" });
            controller.close();
            return;
          }

          sendLog({ type: "info", message: `🔍 Analysiere Sitemap: ${sitemapUrl}` });

          const urlsWithDates = await parseSitemapWithDates(sitemapUrl);
          sendLog({ type: "info", message: `✅ ${urlsWithDates.length} URLs gefunden` });

          // Sort by date (newest first)
          urlsWithDates.sort((a, b) => {
            if (a.date && b.date) {
              return b.date.getTime() - a.date.getTime();
            } else if (a.date) {
              return -1;
            } else if (b.date) {
              return 1;
            }
            return 0;
          });

          const urlsToScrape = urlsWithDates.slice(0, maxPages).map(u => u.url);

          sendLog({
            type: "info",
            message: `🌐 Scrappe ${urlsToScrape.length} Seiten...`
          });

          const batchSize = 10;
          const batches: string[][] = [];
          for (let i = 0; i < urlsToScrape.length; i += batchSize) {
            batches.push(urlsToScrape.slice(i, i + batchSize));
          }

          let uploadedFiles = 0;

          for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];

            sendLog({
              type: "batch_start",
              batch: batchIndex + 1,
              message: `📦 Batch ${batchIndex + 1}/${batches.length} (${batch.length} Seiten)`
            });

            const scrapedPages = await scrapeMultiplePages(batch, 3, 1000);

            if (scrapedPages.length === 0) {
              sendLog({ type: "info", message: `   ⚠️ Batch ${batchIndex + 1} ergab 0 Seiten` });
              continue;
            }

            sendLog({
              type: "info",
              message: `   ✓ ${scrapedPages.length} Seiten erfolgreich gescraped`
            });

            for (let pageIndex = 0; pageIndex < scrapedPages.length; pageIndex++) {
              const page = scrapedPages[pageIndex];

              sendLog({
                type: "progress",
                current: uploadedFiles + pageIndex + 1,
                total: urlsToScrape.length,
                message: `📄 Uploade: ${page.title || page.url}`
              });

              try {
                // Write to temp file
                const tempDir = os.tmpdir();
                const filename = `scraped-${Date.now()}-${(page.title || 'page').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
                const tempPath = path.join(tempDir, filename);
                await fs.writeFile(tempPath, page.content, "utf-8");

                let operation = await ai.fileSearchStores.uploadToFileSearchStore({
                  fileSearchStoreName: fileSearchStoreName,
                  file: tempPath,
                  config: {
                    mimeType: "text/plain",
                    displayName: page.title || page.url,
                    customMetadata: [
                      { key: "url", stringValue: page.url },
                      { key: "pageTitle", stringValue: page.title || "" },
                    ],
                  },
                });

                const maxWaitTime = 60000;
                const startTime = Date.now();
                let attempt = 0;

                while (!operation.done) {
                  if (Date.now() - startTime > maxWaitTime) {
                    sendLog({ type: "info", message: `   ⏱️ Timeout bei: ${page.title}` });
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
                  try {
                    const urlEntry = urlsWithDates.find(u => u.url === page.url);
                    const pageId = `page_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                    await db.insert(scrapedPagesTable).values({
                      id: pageId,
                      chatName,
                      url: page.url,
                      fileSearchDocumentName: operation.response?.documentName || null,
                      lastScrapedAt: Date.now(),
                      sitemapLastMod: urlEntry?.date?.getTime() || null,
                      title: page.title,
                      displayName: page.title,
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    });
                  } catch (dbError) {
                    console.error(`Failed to insert scrapedPage for ${page.url}:`, dbError);
                  }

                  sendLog({ type: "info", message: `   ✓ ${page.title}` });
                } else if (operation.error) {
                  sendLog({ type: "info", message: `   ✗ Fehler bei ${page.title}` });
                }
              } catch (error: any) {
                sendLog({ type: "info", message: `   ✗ Fehler: ${error.message}` });
              }
            }

            uploadedFiles += scrapedPages.length;

            sendLog({
              type: "batch_complete",
              batch: batchIndex + 1,
              message: `   ✅ Batch ${batchIndex + 1} abgeschlossen`
            });
          }

          // Update chat config to include new sitemap URL
          const existingSitemaps = chatConfig.sitemapUrls ? JSON.parse(chatConfig.sitemapUrls) : [];
          if (!existingSitemaps.includes(sitemapUrl)) {
            existingSitemaps.push(sitemapUrl);
            await db
              .update(chatConfigs)
              .set({
                sitemapUrls: JSON.stringify(existingSitemaps),
                updatedAt: Date.now(),
              })
              .where(eq(chatConfigs.chatName, chatName));
            sendLog({ type: "info", message: "💾 Sitemap-URL in Chat-Konfiguration gespeichert" });
          }

          sendLog({
            type: "complete",
            message: `🎉 ${uploadedFiles} Seiten erfolgreich hinzugefügt!`
          });

        } else if (contentType === "document") {
          if (!file) {
            sendLog({ type: "error", message: "❌ Keine Datei angegeben" });
            controller.close();
            return;
          }

          sendLog({ type: "info", message: `📄 Importiere Dokument: ${file.displayName}` });

          try {
            let operation = await ai.fileSearchStores.importFile({
              fileSearchStoreName: fileSearchStoreName,
              fileName: file.name,
            });

            const maxWaitTime = 60000;
            const startTime = Date.now();
            let attempt = 0;

            while (!operation.done) {
              if (Date.now() - startTime > maxWaitTime) {
                sendLog({ type: "error", message: `⏱️ Timeout bei: ${file.displayName}` });
                break;
              }

              const delays = [3000, 5000, 8000, 10000];
              const delay = delays[Math.min(attempt, delays.length - 1)];
              await new Promise((resolve) => setTimeout(resolve, delay));
              attempt++;

              operation = await ai.operations.get({ operation: operation });
            }

            if (operation.done && !operation.error) {
              // Update chat config to include new file
              const existingFiles = chatConfig.files ? JSON.parse(chatConfig.files) : [];
              existingFiles.push({
                name: file.name,
                displayName: file.displayName,
                mimeType: file.mimeType,
                uri: file.uri,
              });

              await db
                .update(chatConfigs)
                .set({
                  files: JSON.stringify(existingFiles),
                  updatedAt: Date.now(),
                })
                .where(eq(chatConfigs.chatName, chatName));

              sendLog({ type: "info", message: `✓ ${file.displayName} erfolgreich importiert` });
              sendLog({
                type: "complete",
                message: `🎉 Dokument erfolgreich hinzugefügt!`
              });
            } else if (operation.error) {
              sendLog({ type: "error", message: `❌ Fehler beim Import: ${operation.error}` });
            }
          } catch (error: any) {
            sendLog({ type: "error", message: `❌ Fehler: ${error.message}` });
          }

        } else if (contentType === "json-api") {
          if (!apiUrl) {
            sendLog({ type: "error", message: "❌ Keine API-URL angegeben" });
            controller.close();
            return;
          }

          sendLog({ type: "info", message: `📡 Lade JSON von API: ${apiUrl}` });

          try {
            // Fetch JSON from API
            const apiResponse = await fetch(apiUrl, {
              headers: {
                'Accept': 'application/json',
              },
              signal: AbortSignal.timeout(30000), // 30s timeout
            });

            if (!apiResponse.ok) {
              throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`);
            }

            const jsonData = await apiResponse.json();
            sendLog({ type: "info", message: "✅ JSON erfolgreich geladen" });

            // Auto-detect structure
            let items: any[] = [];
            if (Array.isArray(jsonData)) {
              items = jsonData;
            } else if (jsonData.items && Array.isArray(jsonData.items)) {
              items = jsonData.items;
            } else if (jsonData.data && Array.isArray(jsonData.data)) {
              items = jsonData.data;
            } else if (jsonData.results && Array.isArray(jsonData.results)) {
              items = jsonData.results;
            } else {
              // Single object
              items = [jsonData];
            }

            sendLog({ type: "info", message: `✅ ${items.length} Einträge gefunden` });

            if (items.length === 0) {
              sendLog({ type: "error", message: "❌ Keine Einträge im JSON gefunden" });
              controller.close();
              return;
            }

            // Helper function to get field value
            const getField = (obj: any, possibleKeys: string[]): string | null => {
              for (const key of possibleKeys) {
                if (obj[key] && typeof obj[key] === 'string') {
                  return obj[key];
                }
              }
              return null;
            };

            let uploadedCount = 0;

            // Process each item
            for (let i = 0; i < items.length; i++) {
              const item = items[i];

              // Auto-detect fields
              const title = getField(item, ['title', 'name', 'heading', 'label']) || `Item ${i + 1}`;
              const content = getField(item, ['content', 'body', 'text', 'description']) || JSON.stringify(item, null, 2);
              const url = getField(item, ['url', 'link', 'href']);
              const itemId = getField(item, ['id', 'identifier', 'key']);

              sendLog({
                type: "progress",
                current: i + 1,
                total: items.length,
                message: `📄 Importiere ${i + 1}/${items.length}: ${title}`
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
                  // Track in database if URL is present
                  if (url) {
                    try {
                      const pageId = `json_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                      await db.insert(scrapedPagesTable).values({
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
              } catch (error: any) {
                sendLog({ type: "info", message: `   ✗ Fehler: ${error.message}` });
              }
            }

            // Save API URL to chat config for future updates
            const existingApiUrls = chatConfig.apiUrls && chatConfig.apiUrls.trim() !== ""
              ? JSON.parse(chatConfig.apiUrls)
              : [];

            if (!existingApiUrls.includes(apiUrl)) {
              existingApiUrls.push(apiUrl);
              await db.update(chatConfigs)
                .set({
                  apiUrls: JSON.stringify(existingApiUrls),
                  updatedAt: Date.now()
                })
                .where(sql`LOWER(${chatConfigs.chatName}) = LOWER(${chatName})`);

              sendLog({ type: "info", message: `✓ API-URL für Updates gespeichert` });
            }

            sendLog({
              type: "complete",
              message: `🎉 ${uploadedCount} von ${items.length} Einträgen erfolgreich importiert!`
            });

          } catch (error: any) {
            if (error.name === 'AbortError') {
              sendLog({ type: "error", message: "❌ Timeout beim Laden der API" });
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
              sendLog({ type: "error", message: "❌ Netzwerkfehler - CORS oder Verbindungsproblem" });
            } else {
              sendLog({ type: "error", message: `❌ Fehler: ${error.message}` });
            }
          }

        } else {
          sendLog({ type: "error", message: "❌ Ungültiger Content-Type" });
        }

      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
        console.error("Add content error:", error);
        sendLog({
          type: "error",
          message: `❌ Fehler: ${errorMessage}`
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
