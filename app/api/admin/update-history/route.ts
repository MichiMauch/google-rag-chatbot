import { NextRequest, NextResponse } from "next/server";
import { getUpdateHistory } from "@/lib/contentUpdater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/update-history?chatName=xxx&limit=20
 * Get update history for a chat
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatName = searchParams.get("chatName");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!chatName) {
      return NextResponse.json(
        { error: "Chat name is required" },
        { status: 400 }
      );
    }

    const history = await getUpdateHistory(chatName, limit);

    return NextResponse.json({
      success: true,
      updates: history,
    });
  } catch (error) {
    console.error("Error fetching update history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch update history",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
