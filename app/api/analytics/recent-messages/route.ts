import { NextRequest, NextResponse } from "next/server";
import { getRecentMessages } from "@/lib/analytics";

/**
 * GET /api/analytics/recent-messages?limit=20
 * Returns recent messages for activity feed
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const messages = await getRecentMessages(limit);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching recent messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent messages" },
      { status: 500 }
    );
  }
}
