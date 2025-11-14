import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { db } from "@/lib/db";
import { chatConfigs } from "@/lib/schema";
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

    // Always delete config from database (even if store didn't exist)
    try {
      await db.delete(chatConfigs).where(eq(chatConfigs.chatName, chatName));
      console.log(`Config deleted from database: ${chatName}`);
    } catch (error: any) {
      console.warn(`Could not delete config for ${chatName}:`, error.message);
      // Don't fail the request if config deletion fails
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
