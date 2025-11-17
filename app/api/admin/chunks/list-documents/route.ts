import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { storeName, page = 1, pageSize = 20 } = await request.json();

    if (!storeName) {
      return NextResponse.json(
        { error: "storeName ist erforderlich" },
        { status: 400 }
      );
    }

    console.log(`Listing documents for store: ${storeName}, page: ${page}`);

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // Fetch documents with pagination using REST API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${storeName}/documents`;
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
    });

    const apiResponse = await fetch(`${apiUrl}?${params}`, {
      method: 'GET',
      headers: {
        'x-goog-api-key': process.env.GOOGLE_AI_API_KEY || '',
      },
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    const response = await apiResponse.json();

    // Format documents
    const documents = (response.documents || []).map((doc: any) => ({
      name: doc.name,
      displayName: doc.displayName || "Unbekannt",
      createTime: doc.createTime,
      updateTime: doc.updateTime,
      customMetadata: doc.customMetadata || {},
      state: doc.state || "UNKNOWN",
    }));

    console.log(`Found ${documents.length} documents`);

    return NextResponse.json({
      success: true,
      documents,
      page,
      pageSize,
      hasMore: !!response.nextPageToken,
      nextPageToken: response.nextPageToken,
    });
  } catch (error: any) {
    console.error("Error listing documents:", error);
    return NextResponse.json(
      {
        error: error.message || "Fehler beim Abrufen der Dokumente",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
