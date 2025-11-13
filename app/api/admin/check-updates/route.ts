import { NextRequest, NextResponse } from "next/server";
import { checkForUpdates } from "@/lib/contentUpdater";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/check-updates?chatName=xxx&sitemapUrl=xxx
 * Check which pages need updates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatName = searchParams.get("chatName");
    const sitemapUrl = searchParams.get("sitemapUrl");

    if (!chatName) {
      return NextResponse.json(
        { error: "Chat name is required" },
        { status: 400 }
      );
    }

    if (!sitemapUrl) {
      return NextResponse.json(
        { error: "Sitemap URL is required" },
        { status: 400 }
      );
    }

    console.log(`Checking for updates: ${chatName} - ${sitemapUrl}`);

    const result = await checkForUpdates(chatName, sitemapUrl);

    return NextResponse.json({
      success: true,
      totalPages: result.totalPages,
      outdatedPages: result.outdatedPages,
      outdatedCount: result.outdatedPages.length,
    });
  } catch (error) {
    console.error("Error checking for updates:", error);
    return NextResponse.json(
      {
        error: "Failed to check for updates",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
