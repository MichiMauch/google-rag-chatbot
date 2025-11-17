import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { storeName, documentName, query } = await request.json();

    if (!storeName || !documentName || !query) {
      return NextResponse.json(
        { error: "storeName, documentName und query sind erforderlich" },
        { status: 400 }
      );
    }

    console.log(`Querying document: ${documentName} with query: "${query}"`);

    // Query the document for chunks using REST API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${documentName}:query`;

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GOOGLE_AI_API_KEY || '',
      },
      body: JSON.stringify({
        query: query,
        resultsCount: 100, // Maximum allowed
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    const responseData = await apiResponse.json();

    // Extract relevant chunks from response
    const chunks = responseData.relevantChunks || [];

    console.log(`Found ${chunks.length} chunks`);

    // Format chunks for display
    const formattedChunks = chunks.map((chunk: any, index: number) => ({
      index: index + 1,
      name: chunk.chunk?.name || "Unknown",
      text: chunk.chunk?.data?.stringValue || chunk.text || "No text available",
      customMetadata: Array.isArray(chunk.chunk?.customMetadata)
        ? chunk.chunk.customMetadata.reduce((acc: any, item: any) => {
            acc[item.key] = item.stringValue || item.value || String(item);
            return acc;
          }, {})
        : chunk.chunk?.customMetadata || {},
      createTime: chunk.chunk?.createTime || null,
      relevanceScore: chunk.chunkRelevanceScore || null,
    }));

    return NextResponse.json({
      success: true,
      chunks: formattedChunks,
      totalChunks: formattedChunks.length,
      query,
      documentName,
    });
  } catch (error: any) {
    console.error("Error querying chunks:", error);
    return NextResponse.json(
      {
        error: error.message || "Fehler beim Abrufen der Chunks",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
