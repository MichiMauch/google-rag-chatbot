import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { ai } from "@/lib/gemini";
import {
  parseSitemapWithDates,
  scrapeMultiplePages,
  scrapeMultiplePagesWithRetry,
  type ScrapeResult,
} from "@/lib/scraper";
import { db } from "@/lib/db";
import { chatConfigs, scrapedPages as scrapedPagesTable } from "@/lib/schema";
import {
  createImportJob,
  updateCheckpoint,
  completeImportJob,
  failImportJob,
  sendHeartbeat,
  type FailedUrl,
  type CheckpointData,
} from "@/lib/importCheckpoint";

// Force Node.js runtime for Puppeteer
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 5400; // 90 minutes timeout for long scraping processes (up to 500 pages)

const MAX_PAGES = 500; // Maximum pages to scrape

// Event types for streaming
type LogEvent = {
  type: "info" | "progress" | "batch_start" | "batch_complete" | "complete" | "error";
  message?: string;
  current?: number;
  total?: number;
  batch?: number;
  chatConfig?: any;
};

// Helper function to save chat config to database
async function saveChatConfig(chatConfig: any) {
  const now = Date.now();

  await db.insert(chatConfigs).values({
    chatName: chatConfig.chatName,
    displayName: chatConfig.displayName,
    uploadType: chatConfig.uploadType,
    themeId: chatConfig.themeId,
    fileSearchStoreName: chatConfig.fileSearchStoreName || null,
    files: JSON.stringify(chatConfig.files),
    sitemapUrls: chatConfig.sitemapUrls ? JSON.stringify(chatConfig.sitemapUrls) : null,
    allowedDomains: chatConfig.allowedDomains ? JSON.stringify(chatConfig.allowedDomains) : null,
    systemInstruction: chatConfig.systemInstruction || null,
    createdAt: chatConfig.createdAt || now,
    updatedAt: now,
  });

  console.log(`Chat config saved to database: ${chatConfig.chatName}`);
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let chatName: string;
    let displayName: string;
    let uploadType: string;
    let themeId: string;
    let files: File[] = [];
    let sitemapUrl: string | undefined;
    let sitemapUrls: string[] | undefined;
    let maxPages = MAX_PAGES;
    let systemInstruction: string | undefined;
    let allowedDomains: string[] | undefined;

    // Parse FormData (for documents) or JSON (for websites)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      chatName = formData.get("chatName") as string;
      displayName = formData.get("displayName") as string;
      uploadType = formData.get("uploadType") as string;
      themeId = formData.get("themeId") as string;
      systemInstruction = formData.get("systemInstruction") as string || undefined;

      const allowedDomainsRaw = formData.get("allowedDomains") as string;
      if (allowedDomainsRaw) {
        allowedDomains = JSON.parse(allowedDomainsRaw);
      }

      // Get all files
      files = formData.getAll("files") as File[];
    } else {
      // JSON body (for websites)
      const body = await request.json();
      chatName = body.chatName;
      displayName = body.displayName;
      uploadType = body.uploadType;
      themeId = body.themeId;
      sitemapUrl = body.sitemapUrl;
      sitemapUrls = body.sitemapUrls;
      maxPages = body.maxPages || MAX_PAGES;
      systemInstruction = body.systemInstruction;
      allowedDomains = body.allowedDomains;
    }

    if (!chatName || !displayName || !uploadType || !themeId) {
      return NextResponse.json(
        { error: "Fehlende erforderliche Felder" },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendLog = (event: LogEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          sendLog({ type: "info", message: `📦 Erstelle File Search Store für: ${displayName}` });

          const fileSearchStore = await ai.fileSearchStores.create({
            config: {
              displayName: `${displayName} - ${chatName}`,
            },
          });

          sendLog({ type: "info", message: `✅ File Search Store erstellt: ${fileSearchStore.name}` });

          let uploadedFiles: any[] = [];

          if (uploadType === "documents") {
            if (!files || files.length === 0) {
              sendLog({ type: "error", message: "❌ Keine Dateien angegeben" });
              controller.close();
              return;
            }

            sendLog({
              type: "info",
              message: `📄 Lade ${files.length} Datei(en) in File Search Store hoch...`
            });

            const fsSync = await import("fs");

            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const originalName = file.name;

              sendLog({
                type: "progress",
                current: i + 1,
                total: files.length,
                message: `📎 Lade hoch ${i + 1}/${files.length}: ${originalName}`
              });

              try {
                // Create controlled filename with extension (like websites do)
                // Keep the extension in the filename for consistency
                const filename = `doc-${Date.now()}-${originalName
                  .normalize('NFC')
                  .replace(/[^a-z0-9.]/gi, "-")
                  .substring(0, 80)}`;

                // Write file to temp location
                const buffer = Buffer.from(await file.arrayBuffer());
                const tempPath = `/tmp/${filename}`;
                fsSync.writeFileSync(tempPath, buffer);

                // Save file locally for preview functionality (same filename)
                const uploadsDir = path.join(process.cwd(), "uploads");
                if (!fsSync.existsSync(uploadsDir)) {
                  fsSync.mkdirSync(uploadsDir, { recursive: true });
                }
                const localFilePath = path.join(uploadsDir, filename);
                fsSync.writeFileSync(localFilePath, buffer);

                // Upload via uploadToFileSearchStore (like websites)
                let operation = await ai.fileSearchStores.uploadToFileSearchStore({
                  fileSearchStoreName: fileSearchStore.name!,
                  file: tempPath,
                  config: {
                    mimeType: file.type || "application/octet-stream",
                    displayName: originalName,
                  },
                });

                // Clean up temp file
                fsSync.unlinkSync(tempPath);

                const maxWaitTime = 60000;
                const startTime = Date.now();
                let attempt = 0;

                while (!operation.done) {
                  if (Date.now() - startTime > maxWaitTime) {
                    console.error(`Timeout uploading file: ${originalName}`);
                    sendLog({ type: "error", message: `⏱️ Timeout bei: ${originalName}` });
                    break;
                  }

                  const delays = [3000, 5000, 8000, 10000];
                  const delay = delays[Math.min(attempt, delays.length - 1)];
                  await new Promise((resolve) => setTimeout(resolve, delay));
                  attempt++;

                  operation = await ai.operations.get({ operation: operation });
                }

                if (operation.done && !operation.error) {
                  // URI format matches what Gemini returns in grounding metadata
                  const fileUri = `${fileSearchStore.name}/files/${filename}`;
                  uploadedFiles.push({
                    name: filename,
                    displayName: originalName,
                    mimeType: file.type || "application/octet-stream",
                    uri: fileUri,
                    localPath: filename,
                  });
                  sendLog({ type: "info", message: `   ✓ ${originalName}` });
                } else if (operation.error) {
                  console.error(`Upload failed for ${originalName}:`, operation.error);
                  sendLog({ type: "error", message: `   ✗ Fehler bei ${originalName}` });
                }
              } catch (error: any) {
                console.error(`Error uploading file ${originalName}:`, error);
                sendLog({ type: "error", message: `   ✗ Fehler: ${error.message}` });
              }
            }

            sendLog({ type: "info", message: `✅ ${uploadedFiles.length} Datei(en) erfolgreich hochgeladen` });

            const chatConfig = {
              chatName,
              displayName,
              uploadType,
              themeId,
              fileSearchStoreName: fileSearchStore.name,
              files: uploadedFiles,
              createdAt: Date.now(),
              systemInstruction: systemInstruction || undefined,
              allowedDomains: allowedDomains || undefined,
            };

            sendLog({ type: "info", message: "💾 Speichere Chat-Konfiguration..." });
            await saveChatConfig(chatConfig);

            sendLog({
              type: "complete",
              message: `🎉 Chat "${displayName}" erfolgreich erstellt!`,
              chatConfig
            });

            controller.close();

          } else if (uploadType === "website") {
            const sitemapsToProcess = sitemapUrls || (sitemapUrl ? [sitemapUrl] : []);

            if (sitemapsToProcess.length === 0) {
              sendLog({ type: "error", message: "❌ Keine Sitemap-URL angegeben" });
              controller.close();
              return;
            }

            sendLog({ type: "info", message: `🔍 Analysiere ${sitemapsToProcess.length} Sitemap(s)...` });

            let urlsWithDates: Array<{ url: string; date?: Date }> = [];

            for (const sitemapUrl of sitemapsToProcess) {
              sendLog({ type: "info", message: `   📄 ${sitemapUrl}` });
              const urls = await parseSitemapWithDates(sitemapUrl);
              urlsWithDates.push(...urls);
            }

            sendLog({ type: "info", message: `✅ ${urlsWithDates.length} URLs gefunden` });

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
              message: `🌐 Scrappe ${urlsToScrape.length} neueste Seiten mit Retry-Logik...`
            });

            // Track failed URLs for detailed reporting
            const failedUrls: FailedUrl[] = [];
            let lastHeartbeat = Date.now();

            const batchSize = 10;
            const batches: string[][] = [];
            for (let i = 0; i < urlsToScrape.length; i += batchSize) {
              batches.push(urlsToScrape.slice(i, i + batchSize));
            }

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
              const batch = batches[batchIndex];

              sendLog({
                type: "batch_start",
                batch: batchIndex + 1,
                message: `📦 Batch ${batchIndex + 1}/${batches.length} (${batch.length} Seiten)`
              });

              // Use retry logic with detailed error tracking
              const scrapeResults = await scrapeMultiplePagesWithRetry(
                batch,
                3, // maxConcurrent
                1000, // delayMs
                3, // maxRetries
                (current, total, result) => {
                  // Progress callback
                  if (!result.success && result.error) {
                    failedUrls.push({
                      url: result.url,
                      error: result.error.message,
                      timestamp: Date.now(),
                      retryCount: result.error.attempt,
                    });
                  }
                }
              );

              const scrapedPages = scrapeResults.filter(r => r.success && r.data).map(r => r.data!);

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

                  // Track this page in the database for future updates
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
                    // Don't fail the upload if DB insert fails
                  }
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

            // Generate detailed summary
            const totalAttempted = urlsToScrape.length;
            const totalSuccessful = uploadedFiles.length;
            const totalFailed = failedUrls.length;

            sendLog({
              type: "info",
              message: `✨ Import abgeschlossen: ${totalSuccessful}/${totalAttempted} erfolgreich (${totalFailed} fehlgeschlagen)`
            });

            // Show failed URLs if any
            if (failedUrls.length > 0) {
              sendLog({
                type: "info",
                message: `⚠️ Fehlgeschlagene URLs (${failedUrls.length}):`
              });

              // Show first 10 failed URLs in log
              const failedToShow = failedUrls.slice(0, 10);
              for (const failed of failedToShow) {
                sendLog({
                  type: "error",
                  message: `   ✗ ${failed.url}: ${failed.error}`
                });
              }

              if (failedUrls.length > 10) {
                sendLog({
                  type: "info",
                  message: `   ... und ${failedUrls.length - 10} weitere Fehler`
                });
              }
            }

            const chatConfig = {
              chatName,
              displayName,
              uploadType,
              themeId,
              fileSearchStoreName: fileSearchStore.name,
              files: uploadedFiles,
              sitemapUrls: sitemapsToProcess,
              createdAt: Date.now(),
              systemInstruction: systemInstruction || undefined,
              allowedDomains: allowedDomains || undefined,
            };

            sendLog({ type: "info", message: "💾 Speichere Chat-Konfiguration..." });
            await saveChatConfig(chatConfig);

            const successMessage = totalFailed > 0
              ? `🎉 Chat "${displayName}" erstellt! ${totalSuccessful} Seiten erfolgreich, ${totalFailed} fehlgeschlagen (mit 3 Retries versucht)`
              : `🎉 Chat "${displayName}" erfolgreich erstellt mit ${totalSuccessful} Seiten!`;

            sendLog({
              type: "complete",
              message: successMessage,
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
