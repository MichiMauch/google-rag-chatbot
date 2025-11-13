import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/**
 * API endpoint to manually save a chat config to filesystem
 * This is useful for migrating existing configs from localStorage
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

    const configDir = path.join(process.cwd(), "data", "chat-configs");
    const configPath = path.join(configDir, `${chatConfig.chatName}.json`);

    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Write config file
    await fs.writeFile(configPath, JSON.stringify(chatConfig, null, 2), "utf-8");

    console.log(`Chat config saved to: ${configPath}`);

    return NextResponse.json({
      success: true,
      message: `Config for ${chatConfig.chatName} saved successfully`,
      path: configPath,
    });
  } catch (error: any) {
    console.error("Save config error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save configuration" },
      { status: 500 }
    );
  }
}
