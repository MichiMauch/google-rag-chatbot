import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import {
  parseSitemapWithDates,
  scrapeMultiplePages,
} from "@/lib/scraper";
import fs from "fs/promises";
import path from "path";

// Force Node.js runtime for Puppeteer
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600; // 10 minutes timeout for long scraping processes

const MAX_PAGES = 30; // Reduced from 50 to optimize API usage

// Event types for streaming
type LogEvent = {
  type: "info" | "progress" | "batch_start" | "batch_complete" | "complete" | "error";
  message?: string;
  current?: number;
  total?: number;
  batch?: number;
  chatConfig?: any;
};

// Helper function to save chat config to filesystem
async function saveChatConfig(chatConfig: any) {
  const configDir = path.join(process.cwd(), "data", "chat-configs");
  const configPath = path.join(configDir, `${chatConfig.chatName}.json`);

  // Ensure directory exists
  await fs.mkdir(configDir, { recursive: true });

  // Write config file
  await fs.writeFile(configPath, JSON.stringify(chatConfig, null, 2), "utf-8");
  console.log(`Chat config saved to: ${configPath}`);
}

export async function POST(request: NextRequest) {
  try {
    const {
      chatName,
      displayName,
      uploadType,
      themeId,
      files,
      sitemapUrl,
      maxPages = MAX_PAGES,
      allowedDomains,
    } = await request.json();

    // Validation
    if (!chatName || !displayName || !uploadType || !themeId) {
      return NextResponse.json(
        { error: "Fehlende erforderliche Felder" },
        { status: 400 }
      );
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendLog = (event: LogEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          sendLog({ type: "info", message: `📦 Erstelle File Search Store für: ${displayName}` });

          // Create File Search Store for this chat
          const fileSearchStore = await ai.fileSearchStores.create({
            config: {
              displayName: `${displayName} - ${chatName}`,
            },
          });

          sendLog({ type: "info", message: `✅ File Search Store erstellt: ${fileSearchStore.name}` });

          let uploadedFiles: any[] = [];

          if (uploadType === "documents") {
            // Files are already uploaded via /api/upload - import them into File Search Store
            if (!files || files.length === 0) {
              sendLog({ type: "error", message: "❌ Keine Dateien angegeben" });
              controller.close();
              return;
            }

            sendLog({
              type: "info",
              message: `📄 Importiere ${files.length} Datei(en) in File Search Store...`
            });

            // Import each file into the File Search Store
            for (let i = 0; i < files.length; i++) {
              const file = files[i];

              sendLog({
                type: "progress",
                current: i + 1,
                total: files.length,
                message: `📎 Importiere ${i + 1}/${files.length}: ${file.displayName}`
              });

              try {
                let operation = await ai.fileSearchStores.importFile({
                  fileSearchStoreName: fileSearchStore.name!,
                  fileName: file.name,
                });

                // Wait for import operation to complete
                const maxWaitTime = 60000;
                const startTime = Date.now();
                let attempt = 0;

                while (!operation.done) {
                  if (Date.now() - startTime > maxWaitTime) {
                    console.error(`Timeout importing file: ${file.displayName}`);
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
                  uploadedFiles.push({
                    name: file.name,
                    displayName: file.displayName,
                    mimeType: file.mimeType,
                    uri: file.uri,
                  });
                  sendLog({ type: "info", message: `   ✓ ${file.displayName}` });
                } else if (operation.error) {
                  console.error(`Import failed for ${file.displayName}:`, operation.error);
                  sendLog({ type: "error", message: `   ✗ Fehler bei ${file.displayName}` });
                }
              } catch (error: any) {
                console.error(`Error importing file ${file.displayName}:`, error);
                sendLog({ type: "error", message: `   ✗ Fehler: ${error.message}` });
              }
            }

            sendLog({ type: "info", message: `✅ ${uploadedFiles.length} Datei(en) erfolgreich importiert` });

            // Create chat configuration
            const chatConfig = {
              chatName,
              displayName,
              uploadType,
              themeId,
              fileSearchStoreName: fileSearchStore.name,
              files: uploadedFiles,
              createdAt: Date.now(),
              allowedDomains: allowedDomains || undefined,
            };

            // Save config to filesystem
            sendLog({ type: "info", message: "💾 Speichere Chat-Konfiguration..." });
            await saveChatConfig(chatConfig);

            sendLog({
              type: "complete",
              message: `🎉 Chat "${displayName}" erfolgreich erstellt!`,
              chatConfig
            });

            controller.close();

          } else if (uploadType === "website") {
            // Scrape website from sitemap URL - STREAMED
            if (!sitemapUrl) {
              sendLog({ type: "error", message: "❌ Keine Sitemap-URL angegeben" });
              controller.close();
              return;
            }

            sendLog({ type: "info", message: `🔍 Analysiere Sitemap: ${sitemapUrl}` });

            // Parse sitemap with dates
            let urlsWithDates = await parseSitemapWithDates(sitemapUrl);

            // Handle sitemap index by recursively fetching child sitemaps
            if (
              urlsWithDates.length > 0 &&
              urlsWithDates[0].url.includes("sitemap") &&
              urlsWithDates[0].url.endsWith(".xml")
            ) {
              sendLog({ type: "info", message: "📑 Sitemap-Index erkannt, verarbeite Kinder..." });

              const allUrlsWithDates: Array<{ url: string; date?: Date }> = [];

              // Fetch first 5 child sitemaps
              for (const childSitemapUrl of urlsWithDates.slice(0, 5).map(u => u.url)) {
                const childUrls = await parseSitemapWithDates(childSitemapUrl);
                allUrlsWithDates.push(...childUrls);
              }
              urlsWithDates = allUrlsWithDates;
            }

            sendLog({ type: "info", message: `✅ ${urlsWithDates.length} URLs in Sitemap gefunden` });

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

            // Take the newest maxPages articles
            const urlsToScrape = urlsWithDates.slice(0, maxPages).map(u => u.url);

            sendLog({
              type: "info",
              message: `🌐 Scrappe ${urlsToScrape.length} neueste Seiten in Batches...`
            });

            // Split into batches of 10
            const batchSize = 10;
            const batches: string[][] = [];
            for (let i = 0; i < urlsToScrape.length; i += batchSize) {
              batches.push(urlsToScrape.slice(i, i + batchSize));
            }

            // Process each batch
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
              const batch = batches[batchIndex];

              sendLog({
                type: "batch_start",
                batch: batchIndex + 1,
                message: `📦 Batch ${batchIndex + 1}/${batches.length} (${batch.length} Seiten)`
              });

              // Scrape pages in this batch
              const scrapedPages = await scrapeMultiplePages(batch, 3, 1000);

              if (scrapedPages.length === 0) {
                sendLog({ type: "info", message: `   ⚠️ Batch ${batchIndex + 1} ergab 0 Seiten` });
                continue;
              }

              sendLog({
                type: "info",
                message: `   ✓ ${scrapedPages.length} Seiten erfolgreich gescraped`
              });

              // Upload scraped content from this batch
              for (let pageIndex = 0; pageIndex < scrapedPages.length; pageIndex++) {
                const page = scrapedPages[pageIndex];
                const totalProcessed = uploadedFiles.length + pageIndex + 1;

                sendLog({
                  type: "progress",
                  current: totalProcessed,
                  total: urlsToScrape.length,
                  message: `   📄 Lade hoch ${totalProcessed}/${urlsToScrape.length}: ${page.title.substring(0, 60)}...`
                });

                const textContent = `Title: ${page.title}\nURL: ${page.url}\n${
                  page.description ? `Description: ${page.description}\n` : ""
                }\n\n${page.content}`;

                const buffer = Buffer.from(textContent, "utf-8");
                const filename = `scraped-${Date.now()}-${page.title
                  .replace(/[^a-z0-9]/gi, "-")
                  .substring(0, 50)}.txt`;

                const fsSync = await import("fs");
                const tempPath = `/tmp/${filename}`;
                fsSync.writeFileSync(tempPath, buffer);

                // Upload to File Search Store
                let operation = await ai.fileSearchStores.uploadToFileSearchStore({
                  fileSearchStoreName: fileSearchStore.name!,
                  file: tempPath,
                  config: {
                    mimeType: "text/plain",
                    displayName: `${page.title}`,
                    customMetadata: [
                      { key: "url", stringValue: page.url },
                      { key: "pageTitle", stringValue: page.title },
                    ],
                  },
                });

                fsSync.unlinkSync(tempPath);

                // Wait for operation to complete
                const maxWaitTime = 60000;
                const startTime = Date.now();
                let attempt = 0;

                while (!operation.done) {
                  if (Date.now() - startTime > maxWaitTime) {
                    console.error(`Timeout uploading: ${page.title}`);
                    break;
                  }

                  const delays = [3000, 5000, 8000, 10000];
                  const delay = delays[Math.min(attempt, delays.length - 1)];
                  await new Promise((resolve) => setTimeout(resolve, delay));
                  attempt++;

                  operation = await ai.operations.get({ operation: operation });
                }

                if (operation.done && !operation.error) {
                  const fileUri = `${fileSearchStore.name}/files/${filename}`;
                  uploadedFiles.push({
                    name: filename,
                    displayName: page.title,
                    mimeType: "text/plain",
                    uri: fileUri,
                    url: page.url,
                    images: page.images || [],
                  });
                } else if (operation.error) {
                  console.error(`Upload failed for ${page.title}:`, operation.error);
                  sendLog({ type: "error", message: `      ✗ Upload-Fehler: ${page.title}` });
                }
              }

              sendLog({
                type: "batch_complete",
                batch: batchIndex + 1,
                message: `   ✅ Batch ${batchIndex + 1}/${batches.length} abgeschlossen (${uploadedFiles.length} total)`
              });
            }

            sendLog({
              type: "info",
              message: `✨ Alle Batches abgeschlossen! ${uploadedFiles.length} Dateien hochgeladen`
            });

            // Create chat configuration
            const chatConfig = {
              chatName,
              displayName,
              uploadType,
              themeId,
              fileSearchStoreName: fileSearchStore.name,
              files: uploadedFiles,
              createdAt: Date.now(),
              allowedDomains: allowedDomains || undefined,
            };

            // Save config to filesystem
            sendLog({ type: "info", message: "💾 Speichere Chat-Konfiguration..." });
            await saveChatConfig(chatConfig);

            sendLog({
              type: "complete",
              message: `🎉 Chat "${displayName}" erfolgreich erstellt mit ${uploadedFiles.length} Seiten!`,
              chatConfig
            });

            controller.close();

          } else {
            sendLog({ type: "error", message: "❌ Ungültiger Upload-Typ" });
            controller.close();
          }

        } catch (error: any) {
          console.error("Create chat streaming error:", error);
          sendLog({
            type: "error",
            message: `❌ Fehler: ${error.message || "Unbekannter Fehler"}`
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Create chat error:", error);
    return NextResponse.json(
      { error: error.message || "Fehler beim Erstellen des Chats" },
      { status: 500 }
    );
  }
}
