import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { db } from "@/lib/db";
import {
  chatConfigs,
  chatSessions,
  chatAnalytics,
  scrapedPages,
  updateHistory,
} from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { chatName, fileSearchStoreName } = await request.json();

    if (!chatName || !fileSearchStoreName) {
      return NextResponse.json(
        { error: "Chat-Name und File Search Store Name erforderlich" },
        { status: 400 }
      );
    }

    console.log(`Deleting File Search Store for chat: ${chatName}`);
    console.log(`Store name: ${fileSearchStoreName}`);

    // First, delete all documents from the store using pagination
    let storeDeleted = false;
    try {
      console.log(`Fetching all documents from store using REST API...`);

      const documents: any[] = [];
      let nextPageToken: string | undefined = undefined;
      let pageCount = 0;

      // Use REST API for pagination
      do {
        pageCount++;
        const apiUrl: string = `https://generativelanguage.googleapis.com/v1beta/${fileSearchStoreName}/documents?pageSize=100${nextPageToken ? `&pageToken=${nextPageToken}` : ''}&key=${process.env.GOOGLE_AI_API_KEY}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch documents: ${response.statusText}`);
        }

        const data = await response.json();
        const pageDocs = data.documents || [];
        documents.push(...pageDocs);
        nextPageToken = data.nextPageToken;

        console.log(`Page ${pageCount}: Fetched ${pageDocs.length} documents (total: ${documents.length})`);
      } while (nextPageToken);

      console.log(`Found ${documents.length} documents to delete`);

      // Delete all documents
      let deletedCount = 0;
      for (const doc of documents) {
        try {
          await ai.fileSearchStores.documents.delete({
            name: doc.name,
            config: { force: true }
          });
          deletedCount++;

          // Log progress every 10 documents
          if (deletedCount % 10 === 0) {
            console.log(`Progress: ${deletedCount}/${documents.length} documents deleted`);
          }
        } catch (docError: any) {
          console.warn(`Failed to delete document ${doc.name}:`, docError.message);
          // Continue with other documents even if one fails
        }
      }

      console.log(`Deleted ${deletedCount} of ${documents.length} documents`);

      // Now delete the empty store
      await ai.fileSearchStores.delete({
        name: fileSearchStoreName,
      });
      console.log(`File Search Store deleted successfully: ${fileSearchStoreName}`);
      storeDeleted = true;
    } catch (error: any) {
      if (error.status === 404 || error.message?.includes("not found")) {
        console.log(`File Search Store not found (already deleted): ${fileSearchStoreName}`);
        storeDeleted = true; // Consider it successful if already deleted
      } else {
        console.error(`Error deleting File Search Store:`, error);
        throw error; // Re-throw other errors
      }
    }

    // Always delete from database (even if store didn't exist)
    try {
      // Delete analytics data first (no cascade dependencies)
      await db.delete(chatAnalytics).where(eq(chatAnalytics.chatName, chatName));
      console.log(`Analytics data deleted for: ${chatName}`);

      // Delete scraped pages
      await db.delete(scrapedPages).where(eq(scrapedPages.chatName, chatName));
      console.log(`Scraped pages deleted for: ${chatName}`);

      // Delete update history (this will cascade delete pageUpdateLogs)
      await db.delete(updateHistory).where(eq(updateHistory.chatName, chatName));
      console.log(`Update history deleted for: ${chatName}`);

      // Delete chat sessions (this will cascade delete chatMessages)
      await db.delete(chatSessions).where(eq(chatSessions.chatName, chatName));
      console.log(`Chat sessions deleted for: ${chatName}`);

      // Finally, delete config
      await db.delete(chatConfigs).where(eq(chatConfigs.chatName, chatName));
      console.log(`Config deleted from database: ${chatName}`);
    } catch (error: any) {
      console.warn(`Could not delete data for ${chatName}:`, error.message);
      // Don't fail the request if database deletion fails
    }

    return NextResponse.json({
      success: true,
      message: storeDeleted
        ? "Chat erfolgreich gelöscht"
        : "Chat-Konfiguration gelöscht (Store existierte bereits nicht mehr)",
    });
  } catch (error: any) {
    console.error("Delete chat error:", error);

    return NextResponse.json(
      { error: error.message || "Fehler beim Löschen des Chats" },
      { status: 500 }
    );
  }
}
