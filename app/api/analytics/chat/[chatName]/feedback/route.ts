import { NextRequest, NextResponse } from "next/server";
import { getFeedbackStats } from "@/lib/analytics";

export async function GET(
  request: NextRequest,
  { params }: { params: { chatName: string } }
) {
  try {
    const chatName = decodeURIComponent(params.chatName);
    const feedbackStats = await getFeedbackStats(chatName);

    return NextResponse.json(feedbackStats);
  } catch (error: any) {
    console.error("Error fetching feedback stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch feedback stats" },
      { status: 500 }
    );
  }
}
