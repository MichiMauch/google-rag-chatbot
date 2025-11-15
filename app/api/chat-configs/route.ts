import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatConfigs } from "@/lib/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat-configs
 * Returns all chat configurations
 */
export async function GET() {
  try {
    // Query all configs from database
    const dbConfigs = await db.select().from(chatConfigs);

    // Parse JSON fields and reconstruct config objects
    const configs = dbConfigs.map((dbConfig) => ({
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
    }));

    return NextResponse.json(configs);
  } catch (error) {
    console.error("Error loading chat configs:", error);
    return NextResponse.json(
      { error: "Failed to load chat configurations" },
      { status: 500 }
    );
  }
}
