import { NextRequest, NextResponse } from "next/server";
import { getTopChats } from "@/lib/analytics";

/**
 * GET /api/analytics/top-chats?limit=10
 * Returns top chats by message count
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const topChats = await getTopChats(limit);
    return NextResponse.json(topChats);
  } catch (error) {
    console.error("Error fetching top chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch top chats" },
      { status: 500 }
    );
  }
}
