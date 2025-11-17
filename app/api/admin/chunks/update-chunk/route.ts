import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { chunkName, text, customMetadata } = await request.json();

    if (!chunkName || !text) {
      return NextResponse.json(
        { error: "chunkName und text sind erforderlich" },
        { status: 400 }
      );
    }

    console.log(`Updating chunk: ${chunkName}`);

    // Update chunk using REST API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${chunkName}`;

    const body: any = {
      data: {
        stringValue: text,
      },
    };

    // Add custom metadata if provided
    if (customMetadata && Object.keys(customMetadata).length > 0) {
      body.customMetadata = Object.entries(customMetadata).map(([key, value]) => ({
        key,
        stringValue: String(value),
      }));
    }

    const apiResponse = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GOOGLE_AI_API_KEY || '',
      },
      body: JSON.stringify(body),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    const updatedChunk = await apiResponse.json();

    console.log(`Chunk updated successfully: ${chunkName}`);

    return NextResponse.json({
      success: true,
      chunk: updatedChunk,
    });
  } catch (error: any) {
    console.error("Error updating chunk:", error);
    return NextResponse.json(
      {
        error: error.message || "Fehler beim Aktualisieren des Chunks",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
