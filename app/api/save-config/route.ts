import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatConfigs } from "@/lib/schema";
import { eq } from "drizzle-orm";

/**
 * API endpoint to manually save or update a chat config in database
 */
export async function POST(request: NextRequest) {
  try {
    const { chatConfig } = await request.json();

    if (!chatConfig || !chatConfig.chatName) {
      return NextResponse.json(
        { error: "Chat configuration with chatName is required" },
        { status: 400 }
      );
    }

    const now = Date.now();

    // Check if config already exists
    const existing = await db
      .select()
      .from(chatConfigs)
      .where(eq(chatConfigs.chatName, chatConfig.chatName))
      .limit(1);

    if (existing.length > 0) {
      // Update existing config
      await db
        .update(chatConfigs)
        .set({
          displayName: chatConfig.displayName,
          uploadType: chatConfig.uploadType,
          themeId: chatConfig.themeId,
          fileSearchStoreName: chatConfig.fileSearchStoreName || null,
          files: JSON.stringify(chatConfig.files),
          sitemapUrls: chatConfig.sitemapUrls ? JSON.stringify(chatConfig.sitemapUrls) : null,
          allowedDomains: chatConfig.allowedDomains ? JSON.stringify(chatConfig.allowedDomains) : null,
          systemInstruction: chatConfig.systemInstruction || null,
          updatedAt: now,
        })
        .where(eq(chatConfigs.chatName, chatConfig.chatName));

      console.log(`Chat config updated in database: ${chatConfig.chatName}`);
    } else {
      // Insert new config
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

    return NextResponse.json({
      success: true,
      message: `Config for ${chatConfig.chatName} saved successfully`,
    });
  } catch (error: any) {
    console.error("Save config error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save configuration" },
      { status: 500 }
    );
  }
}
