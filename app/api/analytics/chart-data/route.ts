import { NextRequest, NextResponse } from "next/server";
import { getMessagesOverTime, getPopularQuestions } from "@/lib/analytics";

/**
 * GET /api/analytics/chart-data?days=30
 * Returns chart data for analytics dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const [messagesOverTime, popularQuestions] = await Promise.all([
      getMessagesOverTime(days),
      getPopularQuestions(10),
    ]);

    return NextResponse.json({
      messagesOverTime,
      popularQuestions,
    });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
