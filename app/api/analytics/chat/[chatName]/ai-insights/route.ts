import { NextRequest, NextResponse } from "next/server";
import { getAIInsights } from "@/lib/analytics";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ chatName: string }> }
) {
  try {
    const params = await context.params;
    const chatName = decodeURIComponent(params.chatName);

    // Get optional days parameter from query string
    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days");
    const daysNumber = days ? parseInt(days) : 30;

    const insights = await getAIInsights(chatName, daysNumber);

    return NextResponse.json(insights);
  } catch (error: any) {
    console.error("Error fetching AI insights:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch AI insights" },
      { status: 500 }
    );
  }
}
