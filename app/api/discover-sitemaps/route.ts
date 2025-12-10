import { NextRequest, NextResponse } from "next/server";
import { parseSitemapWithDates } from "@/lib/scraper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SitemapInfo {
  url: string;
  type: "index" | "urlset";
  urlCount?: number;
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    const { websiteUrl } = await request.json();

    if (!websiteUrl) {
      return NextResponse.json(
        { error: "Website-URL fehlt" },
        { status: 400 }
      );
    }

    const parsedUrl = new URL(websiteUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

    const commonSitemapPaths = [
      "/sitemap.xml",
      "/sitemap_index.xml",
      "/sitemap-index.xml",
      "/sitemaps/sitemap.xml",
      "/sitemap/sitemap.xml",
    ];

    const discoveredSitemaps: SitemapInfo[] = [];

    for (const path of commonSitemapPaths) {
      const sitemapUrl = `${baseUrl}${path}`;

      try {
        const urlsWithDates = await parseSitemapWithDates(sitemapUrl);

        if (urlsWithDates.length > 0) {
          // Check if this is a sitemap index by checking the pathname (not query params)
          let isSitemapIndex = false;
          if (urlsWithDates.length > 0) {
            try {
              const firstUrlPath = new URL(urlsWithDates[0].url).pathname;
              isSitemapIndex = firstUrlPath.includes("sitemap");
            } catch {
              isSitemapIndex = urlsWithDates[0].url.includes("sitemap");
            }
          }

          if (isSitemapIndex) {
            discoveredSitemaps.push({
              url: sitemapUrl,
              type: "index",
              urlCount: urlsWithDates.length,
              description: `Sitemap-Index mit ${urlsWithDates.length} Kind-Sitemaps`,
            });

            for (const child of urlsWithDates.slice(0, 10)) {
              try {
                const childUrls = await parseSitemapWithDates(child.url);
                discoveredSitemaps.push({
                  url: child.url,
                  type: "urlset",
                  urlCount: childUrls.length,
                  description: `${childUrls.length} URLs`,
                });
              } catch (error: any) {
                console.error(`Error parsing child sitemap ${child.url}:`, error);
                discoveredSitemaps.push({
                  url: child.url,
                  type: "urlset",
                  urlCount: 0,
                  description: `Fehler: ${error.message || 'Nicht verfügbar'}`,
                });
              }
            }
          } else {
            discoveredSitemaps.push({
              url: sitemapUrl,
              type: "urlset",
              urlCount: urlsWithDates.length,
              description: `${urlsWithDates.length} URLs`,
            });
          }

          break;
        }
      } catch (error) {
        console.log(`Sitemap not found at ${sitemapUrl}`);
      }
    }

    if (discoveredSitemaps.length === 0) {
      return NextResponse.json(
        { error: "Keine Sitemaps gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sitemaps: discoveredSitemaps,
      baseUrl,
    });

  } catch (error: any) {
    console.error("Discover sitemaps error:", error);
    return NextResponse.json(
      { error: error.message || "Fehler beim Suchen der Sitemaps" },
      { status: 500 }
    );
  }
}
