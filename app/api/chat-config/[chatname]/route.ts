import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatname: string }> }
) {
  try {
    const { chatname } = await params;

    // Construct path to chat config file
    const configPath = path.join(process.cwd(), "data", "chat-configs", `${chatname}.json`);

    // Check if file exists
    try {
      await fs.access(configPath);
    } catch {
      return NextResponse.json(
        { error: "Chat configuration not found" },
        { status: 404 }
      );
    }

    // Read and parse config file
    const configData = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configData);

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error fetching chat config:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat configuration" },
      { status: 500 }
    );
  }
}
