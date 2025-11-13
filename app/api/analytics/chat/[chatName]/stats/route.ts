import { NextRequest, NextResponse } from "next/server";
import { getChatStats } from "@/lib/analytics";

/**
 * GET /api/analytics/chat/[chatName]/stats
 * Returns statistics for a specific chat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { chatName: string } }
) {
  try {
    const chatName = params.chatName;

    if (!chatName) {
      return NextResponse.json(
        { error: "Chat name is required" },
        { status: 400 }
      );
    }

    const stats = await getChatStats(chatName);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching chat stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat stats" },
      { status: 500 }
    );
  }
}
