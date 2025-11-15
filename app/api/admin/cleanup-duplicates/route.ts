import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { db } from "@/lib/db";
import { chatConfigs, scrapedPages } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/admin/cleanup-duplicates
 * Remove duplicate files from Google Gemini File Search Store
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatName, debug = false } = body;

    if (!chatName) {
      return NextResponse.json(
        { error: "Chat name is required" },
        { status: 400 }
      );
    }

    // Get chat config
    const configs = await db
      .select()
      .from(chatConfigs)
      .where(eq(chatConfigs.chatName, chatName))
      .limit(1);

    if (configs.length === 0) {
      return NextResponse.json(
        { error: `Chat config not found for: ${chatName}` },
        { status: 404 }
      );
    }

    const chatConfig = configs[0];
    const fileSearchStoreName = chatConfig.fileSearchStoreName;

    if (!fileSearchStoreName) {
      return NextResponse.json(
        { error: "Chat does not have a file search store" },
        { status: 400 }
      );
    }

    // Get all documents from the file search store using REST API directly for pagination
    console.log(`Fetching documents from: ${fileSearchStoreName}`);
    const documents: any[] = [];
    let nextPageToken: string | undefined = undefined;
    let pageCount = 0;

    do {
      pageCount++;
      const apiUrl: string = `https://generativelanguage.googleapis.com/v1beta/${fileSearchStoreName}/documents?pageSize=100${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.GOOGLE_AI_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      const data = await response.json();
      const pageDocs = data.documents || [];
      documents.push(...pageDocs);
      nextPageToken = data.nextPageToken;

      console.log(`Page ${pageCount}: Fetched ${pageDocs.length} documents (total: ${documents.length})`);
    } while (nextPageToken);

    console.log(`Total documents fetched: ${documents.length}`);

    if (documents.length === 0) {
      return NextResponse.json(
        { error: "File search store is empty" },
        { status: 404 }
      );
    }

    // Helper function to extract metadata value from Google's array format
    const getMetadataValue = (metadata: any[], key: string): string | null => {
      if (!Array.isArray(metadata)) return null;
      const item = metadata.find((m: any) => m.key === key);
      return item?.stringValue || null;
    };

    // Debug mode: return detailed info without deleting
    if (debug) {
      const withUrl = documents.filter(d => getMetadataValue(d.customMetadata, "url"));
      const withoutUrl = documents.filter(d => !getMetadataValue(d.customMetadata, "url"));

      return NextResponse.json({
        debug: true,
        totalDocuments: documents.length,
        withUrlMetadata: withUrl.length,
        withoutUrlMetadata: withoutUrl.length,
        sampleDocuments: documents.slice(0, 5).map(d => ({
          name: d.name,
          displayName: d.displayName,
          createTime: d.createTime,
          hasUrlMetadata: !!getMetadataValue(d.customMetadata, "url"),
          url: getMetadataValue(d.customMetadata, "url"),
          allMetadata: d.customMetadata || null
        })),
        documentsWithoutUrl: withoutUrl.slice(0, 10).map(d => ({
          name: d.name,
          displayName: d.displayName,
          createTime: d.createTime
        }))
      });
    }

    // Group documents by URL (from customMetadata)
    const documentsByUrl: Map<string, typeof documents> = new Map();

    for (const doc of documents) {
      const url = getMetadataValue(doc.customMetadata, "url");
      if (!url) continue; // Skip if no URL metadata

      if (!documentsByUrl.has(url)) {
        documentsByUrl.set(url, []);
      }
      documentsByUrl.get(url)!.push(doc);
    }

    // Find duplicates and delete older versions
    let duplicatesFound = 0;
    let filesDeleted = 0;
    const deletionResults: { url: string; kept: number; deleted: number }[] = [];

    for (const [url, docs] of documentsByUrl.entries()) {
      if (docs.length <= 1) continue; // Skip if no duplicates

      duplicatesFound++;

      // Sort by creation time (newest first)
      // Assuming document names contain timestamps or we use create time from API
      const sortedDocs = docs.sort((a, b) => {
        // Try to extract timestamp from document name or use creation time
        const timeA = a.createTime ? new Date(a.createTime).getTime() : 0;
        const timeB = b.createTime ? new Date(b.createTime).getTime() : 0;
        return timeB - timeA; // Newest first
      });

      // Keep the first (newest), delete the rest
      const toKeep = sortedDocs[0];
      const toDelete = sortedDocs.slice(1);

      for (const doc of toDelete) {
        try {
          await ai.fileSearchStores.documents.delete({
            name: doc.name,
            config: { force: true }
          });
          filesDeleted++;

          // Update scrapedPages table to point to the kept document
          try {
            await db
              .update(scrapedPages)
              .set({
                fileSearchDocumentName: toKeep.name,
                updatedAt: Date.now(),
              })
              .where(eq(scrapedPages.url, url));
          } catch (dbError) {
            console.error(`Failed to update scrapedPages for ${url}:`, dbError);
          }
        } catch (deleteError) {
          console.error(`Failed to delete document ${doc.name}:`, deleteError);
        }
      }

      deletionResults.push({
        url,
        kept: 1,
        deleted: toDelete.length,
      });
    }

    return NextResponse.json({
      success: true,
      chatName,
      totalDocuments: documents.length,
      uniqueUrls: documentsByUrl.size,
      duplicatesFound,
      filesDeleted,
      details: deletionResults,
      message: `Cleanup abgeschlossen! ${filesDeleted} Duplikate von ${duplicatesFound} URLs entfernt.`,
    });
  } catch (error: any) {
    console.error("Error cleaning up duplicates:", error);
    return NextResponse.json(
      {
        error: "Failed to cleanup duplicates",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
