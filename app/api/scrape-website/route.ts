import { NextRequest, NextResponse } from "next/server";
import { findSitemapUrl, parseSitemap, scrapeMultiplePages } from "@/lib/scraper";
import { uploadFile, ai } from "@/lib/gemini";

// Force Node.js runtime for Puppeteer
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAGES = 50; // Limit to prevent abuse

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL ist erforderlich", success: false },
        { status: 400 }
      );
    }

    // Validate URL
    let baseUrl: URL;
    try {
      baseUrl = new URL(url);
    } catch (error) {
      return NextResponse.json(
        { error: "Ungültige URL", success: false },
        { status: 400 }
      );
    }

    console.log(`Starting scrape for: ${baseUrl.href}`);

    // Step 1: Find sitemap
    const sitemapUrl = await findSitemapUrl(baseUrl.href);

    let urlsToScrape: string[] = [];

    if (sitemapUrl) {
      console.log(`Found sitemap: ${sitemapUrl}`);

      // Parse sitemap
      let sitemapUrls = await parseSitemap(sitemapUrl);

      // If sitemap index, recursively fetch child sitemaps
      if (sitemapUrls.length > 0 && sitemapUrls[0].includes('sitemap')) {
        console.log(`Sitemap index detected, fetching child sitemaps...`);
        const childUrls: string[] = [];
        for (const childSitemapUrl of sitemapUrls.slice(0, 5)) { // Limit to 5 child sitemaps
          const childSitemapUrls = await parseSitemap(childSitemapUrl);
          childUrls.push(...childSitemapUrls);
        }
        sitemapUrls = childUrls;
      }

      urlsToScrape = sitemapUrls.slice(0, MAX_PAGES);
      console.log(`Found ${sitemapUrls.length} URLs in sitemap, will scrape ${urlsToScrape.length}`);
    } else {
      console.log('No sitemap found, using homepage only');
      urlsToScrape = [baseUrl.href];
    }

    if (urlsToScrape.length === 0) {
      return NextResponse.json(
        { error: "Keine URLs zum Scrapen gefunden", success: false },
        { status: 400 }
      );
    }

    // Step 2: Scrape pages
    console.log(`Scraping ${urlsToScrape.length} pages...`);
    const scrapedPages = await scrapeMultiplePages(urlsToScrape, 3, 1000);

    if (scrapedPages.length === 0) {
      return NextResponse.json(
        { error: "Keine Seiten erfolgreich gescraped", success: false },
        { status: 500 }
      );
    }

    console.log(`Successfully scraped ${scrapedPages.length} pages`);

    // Step 3: Convert to text files and upload to Gemini
    const uploadedFiles = [];

    for (const page of scrapedPages) {
      try {
        // Create text content
        const textContent = `Title: ${page.title}\nURL: ${page.url}\n${page.description ? `Description: ${page.description}\n` : ''}\n\n${page.content}`;

        // Create a File object (for Node.js environment, we use Buffer)
        const buffer = Buffer.from(textContent, 'utf-8');
        const filename = `scraped-${Date.now()}-${page.title.replace(/[^a-z0-9]/gi, '-').substring(0, 50)}.txt`;

        // Save to temp file
        const fs = await import('fs');
        const tempPath = `/tmp/${filename}`;
        fs.writeFileSync(tempPath, buffer);

        // Upload to Gemini
        const uploadedFile = await ai.files.upload({
          file: tempPath,
          config: {
            mimeType: 'text/plain',
            displayName: `${page.title} (${page.url})`,
          },
        });

        // Clean up temp file
        fs.unlinkSync(tempPath);

        // Wait for file to be ACTIVE
        let fileStatus = uploadedFile;
        const maxWaitTime = 30000;
        const startTime = Date.now();

        while (fileStatus.state && fileStatus.state !== "ACTIVE") {
          if (fileStatus.state === "FAILED") {
            console.error(`File processing failed for ${page.url}`);
            break;
          }

          if (Date.now() - startTime > maxWaitTime) {
            console.error(`Timeout waiting for file processing: ${page.url}`);
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 2000));

          if (!fileStatus.name) break;
          fileStatus = await ai.files.get({ name: fileStatus.name });
        }

        if (fileStatus.state === "ACTIVE") {
          uploadedFiles.push({
            name: fileStatus.name,
            displayName: fileStatus.displayName,
            mimeType: fileStatus.mimeType,
            sizeBytes: fileStatus.sizeBytes,
            uri: fileStatus.uri,
            url: page.url, // Keep original URL for reference
          });
          console.log(`Uploaded: ${page.title}`);
        }
      } catch (uploadError: any) {
        console.error(`Error uploading page ${page.url}:`, uploadError);
        // Continue with other pages
      }
    }

    console.log(`Uploaded ${uploadedFiles.length}/${scrapedPages.length} files to Gemini`);

    return NextResponse.json({
      success: true,
      filesUploaded: uploadedFiles.length,
      totalScraped: scrapedPages.length,
      files: uploadedFiles,
    });
  } catch (error: any) {
    console.error("Scrape website error:", error);
    return NextResponse.json(
      {
        error: error.message || "Fehler beim Scrapen der Website",
        success: false,
      },
      { status: 500 }
    );
  }
}
