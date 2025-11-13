import { db } from "./db";
import { scrapedPages, updateHistory, pageUpdateLogs, NewScrapedPage, NewUpdateHistory, NewPageUpdateLog } from "./schema";
import { eq, and } from "drizzle-orm";
import { parseSitemapWithDates, scrapePage, launchBrowser } from "./scraper";
import { ai } from "./gemini";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { Browser } from "puppeteer";

/**
 * Log event type for streaming updates
 */
export type LogEvent = {
  type: "info" | "progress" | "complete" | "error";
  message?: string;
  current?: number;
  total?: number;
};

/**
 * Check which pages need updates by comparing sitemap dates with database
 */
export async function checkForUpdates(chatName: string, sitemapUrl: string): Promise<{
  totalPages: number;
  outdatedPages: Array<{
    url: string;
    title?: string;
    lastScraped: number;
    sitemapLastMod?: number;
  }>;
}> {
  try {
    // Parse sitemap to get current modification dates
    const sitemapPages = await parseSitemapWithDates(sitemapUrl);

    if (sitemapPages.length === 0) {
      return { totalPages: 0, outdatedPages: [] };
    }

    // Get all scraped pages for this chat from database
    const dbPages = await db
      .select()
      .from(scrapedPages)
      .where(eq(scrapedPages.chatName, chatName));

    // Create a map for faster lookup
    const dbPageMap = new Map(
      dbPages.map((p) => [p.url, p])
    );

    const outdatedPages: Array<{
      url: string;
      title?: string;
      lastScraped: number;
      sitemapLastMod?: number;
    }> = [];

    // Check each sitemap page
    for (const sitemapPage of sitemapPages) {
      const dbPage = dbPageMap.get(sitemapPage.url);

      if (!dbPage) {
        // Page is in sitemap but not in database - new page
        outdatedPages.push({
          url: sitemapPage.url,
          lastScraped: 0,
          sitemapLastMod: sitemapPage.date?.getTime(),
        });
        continue;
      }

      // Page exists in database
      if (sitemapPage.date) {
        const sitemapTime = sitemapPage.date.getTime();

        // Compare sitemap lastmod with last scrape time
        // If sitemap date is newer, page needs update
        if (sitemapTime > dbPage.lastScrapedAt) {
          outdatedPages.push({
            url: dbPage.url,
            title: dbPage.title || undefined,
            lastScraped: dbPage.lastScrapedAt,
            sitemapLastMod: sitemapTime,
          });
        }
      }
    }

    return {
      totalPages: sitemapPages.length,
      outdatedPages,
    };
  } catch (error) {
    console.error("Error in checkForUpdates:", error);
    throw error;
  }
}

/**
 * Perform incremental update for changed pages
 */
export async function performIncrementalUpdate(
  chatName: string,
  sitemapUrl: string,
  fileSearchStoreName: string,
  updateId: string,
  triggeredBy: string,
  sendLog?: (event: LogEvent) => void
): Promise<void> {
  const startTime = Date.now();
  let browser: Browser | null = null;

  try {
    sendLog?.({ type: "info", message: "🔍 Checking for updates..." });
    // Update status to running
    await db
      .update(updateHistory)
      .set({
        status: "running",
        startedAt: startTime,
      })
      .where(eq(updateHistory.id, updateId));

    // Check which pages need updates
    const { totalPages, outdatedPages } = await checkForUpdates(chatName, sitemapUrl);

    sendLog?.({
      type: "info",
      message: `✅ Found ${outdatedPages.length} pages needing updates out of ${totalPages} total`
    });

    // Update total pages count
    await db
      .update(updateHistory)
      .set({
        totalPages,
        checkedPages: totalPages,
      })
      .where(eq(updateHistory.id, updateId));

    if (outdatedPages.length === 0) {
      // No updates needed
      await db
        .update(updateHistory)
        .set({
          status: "completed",
          unchangedPages: totalPages,
          completedAt: Date.now(),
          durationMs: Date.now() - startTime,
        })
        .where(eq(updateHistory.id, updateId));
      return;
    }

    // Launch browser for scraping
    browser = await launchBrowser();
    sendLog?.({ type: "info", message: "🚀 Browser launched for scraping" });

    // Process each outdated page
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < outdatedPages.length; i++) {
      const outdatedPage = outdatedPages[i];
      try {
        const isNewPage = outdatedPage.lastScraped === 0;

        // Send progress update
        sendLog?.({
          type: "progress",
          current: i + 1,
          total: outdatedPages.length,
          message: `🔄 Updating ${i + 1}/${outdatedPages.length}: ${outdatedPage.url}`
        });

        // Scrape the page
        const scrapedContent = await scrapePage(outdatedPage.url, browser!);

        if (!scrapedContent) {
          throw new Error("Failed to scrape page content");
        }

        // Find existing document if this is an update
        let existingDocumentName: string | undefined;
        if (!isNewPage) {
          const dbPage = await db
            .select()
            .from(scrapedPages)
            .where(
              and(
                eq(scrapedPages.chatName, chatName),
                eq(scrapedPages.url, outdatedPage.url)
              )
            )
            .limit(1);

          if (dbPage.length > 0 && dbPage[0].fileSearchDocumentName) {
            existingDocumentName = dbPage[0].fileSearchDocumentName;
          }
        }

        // Delete old document if it exists
        if (existingDocumentName) {
          try {
            await ai.fileSearchStores.documents.delete({
              name: existingDocumentName,
              config: { force: true },
            });
          } catch (deleteError) {
            console.error(`Failed to delete old document: ${existingDocumentName}`, deleteError);
            // Continue anyway - we'll upload the new version
          }
        }

        // Upload new version to File Search Store
        const tempDir = os.tmpdir();
        const filename = `scraped-${Date.now()}-${scrapedContent.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
        const tempPath = path.join(tempDir, filename);

        await fs.writeFile(tempPath, scrapedContent.content, "utf-8");

        sendLog?.({
          type: "info",
          message: `  ⏳ Uploading to File Search Store...`
        });

        let operation = await ai.fileSearchStores.uploadToFileSearchStore({
          fileSearchStoreName,
          file: tempPath,
          config: {
            mimeType: "text/plain",
            displayName: scrapedContent.title,
            customMetadata: [
              { key: "url", stringValue: scrapedContent.url },
              { key: "pageTitle", stringValue: scrapedContent.title },
            ],
          },
        });

        // Wait for the upload operation to complete (LRO pattern)
        const maxWaitTime = 60000; // 60 seconds
        const startTime = Date.now();
        let attempt = 0;

        while (!operation.done) {
          if (Date.now() - startTime > maxWaitTime) {
            throw new Error(`Timeout uploading: ${scrapedContent.title}`);
          }

          // Exponential backoff delays
          const delays = [3000, 5000, 8000, 10000];
          const delay = delays[Math.min(attempt, delays.length - 1)];
          await new Promise((resolve) => setTimeout(resolve, delay));
          attempt++;

          operation = await ai.operations.get({ operation: operation });
        }

        if (operation.error) {
          throw new Error(`Upload failed: ${JSON.stringify(operation.error)}`);
        }

        if (!operation.response?.documentName) {
          throw new Error("Upload completed but no document name returned");
        }

        sendLog?.({
          type: "info",
          message: `  ✅ Uploaded successfully`
        });

        // Clean up temp file
        await fs.unlink(tempPath);

        const now = Date.now();
        const newDocumentName = operation.response.documentName;

        if (isNewPage) {
          // Insert new page record
          const pageId = `page_${now}_${Math.random().toString(36).substring(7)}`;
          const newPage: NewScrapedPage = {
            id: pageId,
            chatName,
            url: scrapedContent.url,
            fileSearchDocumentName: newDocumentName,
            lastScrapedAt: now,
            sitemapLastMod: outdatedPage.sitemapLastMod,
            title: scrapedContent.title,
            displayName: scrapedContent.title,
            createdAt: now,
            updatedAt: now,
          };

          await db.insert(scrapedPages).values(newPage);

          // Log the creation
          await recordPageUpdate(updateId, {
            url: scrapedContent.url,
            pageTitle: scrapedContent.title,
            action: "created",
            oldLastMod: undefined,
            newLastMod: outdatedPage.sitemapLastMod,
          });
        } else {
          // Update existing page record
          await db
            .update(scrapedPages)
            .set({
              fileSearchDocumentName: newDocumentName,
              lastScrapedAt: now,
              sitemapLastMod: outdatedPage.sitemapLastMod,
              title: scrapedContent.title,
              displayName: scrapedContent.title,
              updatedAt: now,
            })
            .where(
              and(
                eq(scrapedPages.chatName, chatName),
                eq(scrapedPages.url, scrapedContent.url)
              )
            );

          // Log the update
          await recordPageUpdate(updateId, {
            url: scrapedContent.url,
            pageTitle: scrapedContent.title,
            action: "updated",
            oldLastMod: outdatedPage.lastScraped,
            newLastMod: outdatedPage.sitemapLastMod,
          });
        }

        updatedCount++;

      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error processing page ${outdatedPage.url}:`, errorMessage);

        // Log the error
        await recordPageUpdate(updateId, {
          url: outdatedPage.url,
          pageTitle: outdatedPage.title,
          action: "error",
          oldLastMod: outdatedPage.lastScraped,
          newLastMod: outdatedPage.sitemapLastMod,
          errorMessage,
        });
      }
    }

    // Update final statistics
    const endTime = Date.now();
    await db
      .update(updateHistory)
      .set({
        status: errorCount === outdatedPages.length ? "failed" : "completed",
        updatedPages: updatedCount,
        unchangedPages: totalPages - outdatedPages.length,
        errorPages: errorCount,
        completedAt: endTime,
        durationMs: endTime - startTime,
      })
      .where(eq(updateHistory.id, updateId));

    sendLog?.({
      type: "complete",
      message: `✨ Update completed! ${updatedCount} pages updated, ${errorCount} errors`
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Fatal error in update ${updateId}:`, errorMessage);

    sendLog?.({
      type: "error",
      message: `❌ Fatal error: ${errorMessage}`
    });

    // Mark update as failed
    await db
      .update(updateHistory)
      .set({
        status: "failed",
        error: errorMessage,
        completedAt: Date.now(),
        durationMs: Date.now() - startTime,
      })
      .where(eq(updateHistory.id, updateId));

    throw error;
  } finally {
    // Always close browser if it was opened
    if (browser) {
      await browser.close().catch((err) => {
        console.error("Error closing browser:", err);
      });
      sendLog?.({ type: "info", message: "🔒 Browser closed" });
    }
  }
}

/**
 * Record a page update action in the logs
 */
async function recordPageUpdate(
  updateId: string,
  details: {
    url: string;
    pageTitle?: string;
    action: "created" | "updated" | "unchanged" | "error";
    oldLastMod?: number;
    newLastMod?: number;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const newLog: NewPageUpdateLog = {
      id: logId,
      updateHistoryId: updateId,
      url: details.url,
      pageTitle: details.pageTitle,
      action: details.action,
      oldLastMod: details.oldLastMod,
      newLastMod: details.newLastMod,
      errorMessage: details.errorMessage,
      createdAt: Date.now(),
    };

    await db.insert(pageUpdateLogs).values(newLog);
  } catch (error) {
    console.error("Error recording page update log:", error);
    // Don't throw - logging should not break the update process
  }
}

/**
 * Create a new update history entry
 */
export async function createUpdateHistory(
  chatName: string,
  triggeredBy: string
): Promise<string> {
  const updateId = `update_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const newUpdate: NewUpdateHistory = {
    id: updateId,
    chatName,
    triggeredBy,
    status: "pending",
    createdAt: Date.now(),
  };

  await db.insert(updateHistory).values(newUpdate);

  return updateId;
}

/**
 * Get update history for a chat
 */
export async function getUpdateHistory(chatName: string, limit = 20) {
  try {
    const updates = await db
      .select()
      .from(updateHistory)
      .where(eq(updateHistory.chatName, chatName))
      .orderBy(updateHistory.createdAt)
      .limit(limit);

    // Get logs for each update
    const updatesWithLogs = await Promise.all(
      updates.map(async (update) => {
        const logs = await db
          .select()
          .from(pageUpdateLogs)
          .where(eq(pageUpdateLogs.updateHistoryId, update.id))
          .orderBy(pageUpdateLogs.createdAt);

        return {
          ...update,
          logs,
        };
      })
    );

    return updatesWithLogs;
  } catch (error) {
    console.error("Error in getUpdateHistory:", error);
    return [];
  }
}
