import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatConfigs } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatname: string }> }
) {
  try {
    const { chatname } = await params;

    // Query database for chat config (case-insensitive)
    const configs = await db
      .select()
      .from(chatConfigs)
      .where(sql`LOWER(${chatConfigs.chatName}) = LOWER(${chatname})`)
      .limit(1);

    if (configs.length === 0) {
      return NextResponse.json(
        { error: "Chat configuration not found" },
        { status: 404 }
      );
    }

    const dbConfig = configs[0];

    // Parse JSON fields and reconstruct config object
    const config = {
      chatName: dbConfig.chatName,
      displayName: dbConfig.displayName,
      uploadType: dbConfig.uploadType,
      themeId: dbConfig.themeId,
      fileSearchStoreName: dbConfig.fileSearchStoreName || undefined,
      files: dbConfig.files && dbConfig.files.trim() !== "" ? JSON.parse(dbConfig.files) : [],
      sitemapUrls: dbConfig.sitemapUrls && dbConfig.sitemapUrls.trim() !== "" ? JSON.parse(dbConfig.sitemapUrls) : undefined,
      allowedDomains: dbConfig.allowedDomains && dbConfig.allowedDomains.trim() !== "" ? JSON.parse(dbConfig.allowedDomains) : undefined,
      systemInstruction: dbConfig.systemInstruction || undefined,
      aiAnalysisEnabled: dbConfig.aiAnalysisEnabled ?? false,
      createdAt: dbConfig.createdAt,
    };

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error fetching chat config:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat configuration" },
      { status: 500 }
    );
  }
}
