import { NextRequest, NextResponse } from "next/server";
import { getChatSessions } from "@/lib/analytics";

/**
 * GET /api/analytics/chat/[chatName]/sessions?limit=50
 * Returns all sessions with messages for a specific chat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatName: string }> }
) {
  try {
    const { chatName } = await params;

    if (!chatName) {
      return NextResponse.json(
        { error: "Chat name is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const sessions = await getChatSessions(chatName, limit);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 }
    );
  }
}
