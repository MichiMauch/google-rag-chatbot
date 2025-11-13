import { NextRequest, NextResponse } from "next/server";
import {
  getChatMessagesOverTime,
  getChatPopularQuestions,
  getChatResponseTimes,
} from "@/lib/analytics";

/**
 * GET /api/analytics/chat/[chatName]/chart-data?days=30
 * Returns chart data for a specific chat
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
    const days = parseInt(searchParams.get("days") || "30");

    const [messagesOverTime, popularQuestions, responseTimes] = await Promise.all([
      getChatMessagesOverTime(chatName, days),
      getChatPopularQuestions(chatName, 10),
      getChatResponseTimes(chatName, days),
    ]);

    return NextResponse.json({
      messagesOverTime,
      popularQuestions,
      responseTimes,
    });
  } catch (error) {
    console.error("Error fetching chat chart data:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat chart data" },
      { status: 500 }
    );
  }
}
