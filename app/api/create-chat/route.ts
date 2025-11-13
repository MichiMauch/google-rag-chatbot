import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import {
  parseSitemapWithDates,
  scrapeMultiplePages,
} from "@/lib/scraper";
import { createJob, updateJob } from "@/lib/jobStore";
import { randomUUID } from "crypto";

// Force Node.js runtime for Puppeteer
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600; // 10 minutes timeout for long scraping processes

const MAX_PAGES = 30; // Reduced from 50 to optimize API usage

// Async function to process website scraping in background
async function processWebsiteScraping(
  jobId: string,
  chatName: string,
  displayName: string,
  uploadType: string,
  themeId: string,
  sitemapUrl: string,
  maxPages: number,
  fileSearchStore: any,
  allowedDomains?: string[]
) {
  try {
    updateJob(jobId, {
      status: 'processing',
      message: 'Sitemap wird analysiert...',
      progress: 5,
    });

    console.log(`Parsing sitemap: ${sitemapUrl}`);

    // Parse sitemap with dates
    let urlsWithDates = await parseSitemapWithDates(sitemapUrl);

    // Handle sitemap index by recursively fetching child sitemaps
    if (
      urlsWithDates.length > 0 &&
      urlsWithDates[0].url.includes("sitemap") &&
      urlsWithDates[0].url.endsWith(".xml")
    ) {
      console.log("Detected sitemap index, fetching child sitemaps...");
      updateJob(jobId, {
        message: 'Sitemap-Index wird verarbeitet...',
        progress: 10,
      });

      const allUrlsWithDates: Array<{ url: string; date?: Date }> = [];

      // Fetch first 5 child sitemaps
      for (const childSitemapUrl of urlsWithDates.slice(0, 5).map(u => u.url)) {
        const childUrls = await parseSitemapWithDates(childSitemapUrl);
        allUrlsWithDates.push(...childUrls);
      }
      urlsWithDates = allUrlsWithDates;
    }

    console.log(`Found ${urlsWithDates.length} URLs in sitemap`);

    // Sort by date (newest first) - URLs with dates come first, then URLs without dates
    urlsWithDates.sort((a, b) => {
      if (a.date && b.date) {
        return b.date.getTime() - a.date.getTime(); // Newest first
      } else if (a.date) {
        return -1; // URLs with dates come first
      } else if (b.date) {
        return 1; // URLs with dates come first
      }
      return 0; // Keep original order for URLs without dates
    });

    // Take the newest maxPages articles
    const urlsToScrape = urlsWithDates.slice(0, maxPages).map(u => u.url);

    console.log(`Scraping ${urlsToScrape.length} newest pages in batches...`);
    updateJob(jobId, {
      message: `${urlsToScrape.length} Seiten werden gescraped...`,
      progress: 15,
    });

    // Split into batches of 10 to avoid timeout
    const batchSize = 10;
    const batches: string[][] = [];
    for (let i = 0; i < urlsToScrape.length; i += batchSize) {
      batches.push(urlsToScrape.slice(i, i + batchSize));
    }

    const uploadedFiles: any[] = [];
    let totalScrapedPages = 0;

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchProgress = 15 + Math.floor((batchIndex / batches.length) * 70);

      updateJob(jobId, {
        message: `Batch ${batchIndex + 1}/${batches.length} wird verarbeitet...`,
        progress: batchProgress,
        currentBatch: batchIndex + 1,
        totalBatches: batches.length,
      });

      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} pages)...`);

      // Scrape pages in this batch
      const scrapedPages = await scrapeMultiplePages(batch, 3, 1000);
      console.log(`Successfully scraped ${scrapedPages.length} pages in batch ${batchIndex + 1}`);

      if (scrapedPages.length === 0) {
        console.warn(`Batch ${batchIndex + 1} resulted in 0 pages`);
        continue;
      }

      // Upload scraped content from this batch immediately
      for (const page of scrapedPages) {
        const textContent = `Title: ${page.title}\nURL: ${page.url}\n${
          page.description ? `Description: ${page.description}\n` : ""
        }\n\n${page.content}`;

        const buffer = Buffer.from(textContent, "utf-8");
        const filename = `scraped-${Date.now()}-${page.title
          .replace(/[^a-z0-9]/gi, "-")
          .substring(0, 50)}.txt`;

        const fs = await import("fs");
        const tempPath = `/tmp/${filename}`;
        fs.writeFileSync(tempPath, buffer);

        // Upload to File Search Store with custom metadata
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

        fs.unlinkSync(tempPath);

        // Wait for operation to complete (with exponential backoff)
        const maxWaitTime = 60000; // 60 seconds timeout for File Search
        const startTime = Date.now();
        let attempt = 0;

        while (!operation.done) {
          // Check timeout
          if (Date.now() - startTime > maxWaitTime) {
            console.error(`Timeout waiting for file upload operation: ${page.title}`);
            break;
          }

          // Exponential backoff: 3s, 5s, 8s, 10s, 10s...
          const delays = [3000, 5000, 8000, 10000];
          const delay = delays[Math.min(attempt, delays.length - 1)];
          await new Promise((resolve) => setTimeout(resolve, delay));
          attempt++;

          // Refresh operation status
          operation = await ai.operations.get({ operation: operation });
        }

        if (operation.done && !operation.error) {
          // Construct URI - operation.response doesn't contain file details for uploadToFileSearchStore
          // The file is accessible via the store name + filename
          const fileUri = `${fileSearchStore.name}/files/${filename}`;

          uploadedFiles.push({
            name: filename,
            displayName: page.title,
            mimeType: "text/plain",
            uri: fileUri,
            url: page.url, // Store original URL for reference
            images: page.images || [], // Store extracted images from the page
          });

          console.log(`Uploaded: ${page.title} with URI: ${fileUri}`);
          totalScrapedPages++;
        } else if (operation.error) {
          console.error(`Upload failed for ${page.title}:`, operation.error);
        }
      }

      console.log(`Batch ${batchIndex + 1}/${batches.length} completed. Total uploaded so far: ${uploadedFiles.length}`);
    }

    console.log(`All batches completed! Successfully uploaded ${uploadedFiles.length} files to Gemini`);

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

    // Update job as completed
    updateJob(jobId, {
      status: 'completed',
      message: 'Scraping erfolgreich abgeschlossen!',
      progress: 100,
      chatConfig,
    });

    console.log(`Job ${jobId} completed successfully`);
  } catch (error: any) {
    console.error("Website scraping error in background job:", error);
    updateJob(jobId, {
      status: 'error',
      message: error.message || 'Fehler beim Scrapen der Website',
      progress: 0,
      error: error.message,
    });
  }
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

    // Create File Search Store for this chat
    console.log(`Creating File Search Store for chat: ${chatName}`);
    const fileSearchStore = await ai.fileSearchStores.create({
      config: {
        displayName: `${displayName} - ${chatName}`,
      },
    });
    console.log(`File Search Store created: ${fileSearchStore.name}`);

    let uploadedFiles: any[] = [];

    if (uploadType === "documents") {
      // Files are already uploaded via /api/upload - import them into File Search Store
      if (!files || files.length === 0) {
        return NextResponse.json(
          { error: "Keine Dateien angegeben" },
          { status: 400 }
        );
      }

      console.log(`Importing ${files.length} files into File Search Store...`);

      // Import each file into the File Search Store
      for (const file of files) {
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
              // For documents, no URL or images
            });
            console.log(`Imported: ${file.displayName}`);
          } else if (operation.error) {
            console.error(`Import failed for ${file.displayName}:`, operation.error);
          }
        } catch (error: any) {
          console.error(`Error importing file ${file.displayName}:`, error);
        }
      }

      console.log(`Imported ${uploadedFiles.length} files into File Search Store`);

      // For documents: Create chat configuration immediately
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

      return NextResponse.json({
        success: true,
        chatConfig,
        filesUploaded: uploadedFiles.length,
      });
    } else if (uploadType === "website") {
      // Scrape website from sitemap URL - ASYNC
      if (!sitemapUrl) {
        return NextResponse.json(
          { error: "Keine Sitemap-URL angegeben" },
          { status: 400 }
        );
      }

      // Generate job ID
      const jobId = randomUUID();

      // Create job in store
      createJob(jobId);

      // Start async scraping in background (don't await!)
      processWebsiteScraping(
        jobId,
        chatName,
        displayName,
        uploadType,
        themeId,
        sitemapUrl,
        maxPages,
        fileSearchStore,
        allowedDomains
      ).catch((error) => {
        console.error(`Background job ${jobId} failed:`, error);
      });

      // Return job ID immediately
      return NextResponse.json({
        success: true,
        jobId,
        message: "Scraping started - poll /api/job-status/" + jobId,
      });
    } else {
      return NextResponse.json(
        { error: "Ungültiger Upload-Typ" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Create chat error:", error);
    return NextResponse.json(
      { error: error.message || "Fehler beim Erstellen des Chats" },
      { status: 500 }
    );
  }
}

