import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";

export async function GET() {
  try {
    // List all file search stores
    const stores = await ai.fileSearchStores.list();

    // The API returns data in pageInternal
    const storeList = (stores as any).pageInternal || [];

    let totalFiles = 0;
    let totalSizeBytes = 0;

    for (const store of storeList) {
      const fileCount = parseInt(store.activeDocumentsCount || "0");
      const sizeBytes = parseInt(store.sizeBytes || "0");

      totalFiles += fileCount;
      totalSizeBytes += sizeBytes;
    }

    const totalSizeMB = totalSizeBytes / (1024 * 1024);
    const availableMB = 1024 - totalSizeMB;
    const usagePercent = (totalSizeMB / 1024) * 100;

    return NextResponse.json({
      stores: storeList,
      totalStores: storeList.length,
      totalFiles,
      totalSizeMB,
      availableMB,
      usagePercent,
    });
  } catch (error: any) {
    console.error("Error loading stores:", error);
    return NextResponse.json(
      { error: error.message || "Fehler beim Laden der Stores" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { storeName } = await request.json();

    if (!storeName) {
      return NextResponse.json(
        { error: "Store-Name erforderlich" },
        { status: 400 }
      );
    }

    console.log(`Deleting File Search Store: ${storeName}`);

    // First, we need to list all files in the store and delete them
    // Unfortunately, the Google GenAI API doesn't provide a direct way to list files in a store
    // So we need to delete the store with force option or empty it first

    // Try to delete the store - if it fails because it's not empty, we'll use allowMissing
    try {
      await ai.fileSearchStores.delete({
        name: storeName,
        allowMissing: true
      });
      console.log(`Successfully deleted store: ${storeName}`);

      return NextResponse.json({
        success: true,
        message: "Store erfolgreich gelöscht",
      });
    } catch (deleteError: any) {
      // If deletion fails because store is not empty, return specific error
      if (deleteError.message?.includes("non-empty") || deleteError.message?.includes("FAILED_PRECONDITION")) {
        return NextResponse.json(
          {
            error: "Store kann nicht gelöscht werden, da er Dateien enthält. Google GenAI erlaubt das Löschen von nicht-leeren Stores nicht. Bitte kontaktiere den Support oder warte, bis die Dateien automatisch ablaufen.",
            code: "STORE_NOT_EMPTY"
          },
          { status: 400 }
        );
      }
      throw deleteError;
    }
  } catch (error: any) {
    console.error("Error deleting store:", error);
    return NextResponse.json(
      { error: error.message || "Fehler beim Löschen des Stores" },
      { status: 500 }
    );
  }
}
