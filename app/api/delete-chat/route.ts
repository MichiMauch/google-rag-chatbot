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

    // Try to delete the File Search Store (but don't fail if it doesn't exist)
    let storeDeleted = false;
    try {
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
