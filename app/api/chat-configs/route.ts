import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat-configs
 * Returns all chat configurations
 */
export async function GET() {
  try {
    const configDir = path.join(process.cwd(), "data", "chat-configs");

    // Read all files in the config directory
    const files = await fs.readdir(configDir);
    const jsonFiles = files.filter(file => file.endsWith(".json"));

    // Read and parse each config file
    const configs = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const filePath = path.join(configDir, file);
          const content = await fs.readFile(filePath, "utf-8");
          return JSON.parse(content);
        } catch (error) {
          console.error(`Error reading config file ${file}:`, error);
          return null;
        }
      })
    );

    // Filter out null values (failed reads)
    const validConfigs = configs.filter(config => config !== null);

    return NextResponse.json(validConfigs);
  } catch (error) {
    console.error("Error loading chat configs:", error);
    return NextResponse.json(
      { error: "Failed to load chat configurations" },
      { status: 500 }
    );
  }
}
