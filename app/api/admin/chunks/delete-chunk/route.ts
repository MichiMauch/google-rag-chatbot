import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { chunkName } = await request.json();

    if (!chunkName) {
      return NextResponse.json(
        { error: "chunkName ist erforderlich" },
        { status: 400 }
      );
    }

    console.log(`Deleting chunk: ${chunkName}`);

    // Delete chunk using REST API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${chunkName}`;

    const apiResponse = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'x-goog-api-key': process.env.GOOGLE_AI_API_KEY || '',
      },
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    console.log(`Chunk deleted successfully: ${chunkName}`);

    return NextResponse.json({
      success: true,
      chunkName,
    });
  } catch (error: any) {
    console.error("Error deleting chunk:", error);
    return NextResponse.json(
      {
        error: error.message || "Fehler beim Löschen des Chunks",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
