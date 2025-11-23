import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    // Fetch the page with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    let response;
    try {
      response = await fetch(targetUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChatBot/1.0)',
        },
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { ogImage: null, error: "Request timeout" },
          { status: 200 }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return NextResponse.json(
        { ogImage: null, error: `HTTP ${response.status}` },
        { status: 200 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to extract Open Graph image
    let imageUrl: string | null = null;

    // 1. Try og:image (Open Graph)
    imageUrl = $('meta[property="og:image"]').attr("content") ||
               $('meta[property="og:image:secure_url"]').attr("content") || null;

    // 2. Try Twitter image
    if (!imageUrl) {
      imageUrl = $('meta[name="twitter:image"]').attr("content") ||
                 $('meta[name="twitter:image:src"]').attr("content") || null;
    }

    // 3. Try link rel="image_src"
    if (!imageUrl) {
      imageUrl = $('link[rel="image_src"]').attr("href") || null;
    }

    // 4. Try article:image
    if (!imageUrl) {
      imageUrl = $('meta[property="article:image"]').attr("content") || null;
    }

    // Convert relative URLs to absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        imageUrl = new URL(imageUrl, targetUrl.origin).toString();
      } catch {
        imageUrl = null;
      }
    }

    // Return with cache headers
    return NextResponse.json(
      { ogImage: imageUrl },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      }
    );

  } catch (error: any) {
    console.error("Error fetching OG image:", error);
    return NextResponse.json(
      { ogImage: null, error: error.message },
      { status: 200 }
    );
  }
}
