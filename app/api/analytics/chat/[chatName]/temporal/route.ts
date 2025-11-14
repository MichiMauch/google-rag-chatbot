import { NextRequest, NextResponse } from "next/server";
import { getTemporalPatterns } from "@/lib/analytics";

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

    const temporalData = await getTemporalPatterns(chatName, daysNumber);

    return NextResponse.json(temporalData);
  } catch (error: any) {
    console.error("Error fetching temporal patterns:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch temporal patterns" },
      { status: 500 }
    );
  }
}
