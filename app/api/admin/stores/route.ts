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

    // The Google GenAI API doesn't provide a way to list files in a specific store
    // We need to use a workaround: get the store info which contains file count
    // Then delete the store with force parameter if available, or return an error

    // First, get store info to see how many files it contains
    const stores = await ai.fileSearchStores.list();
    const storeList = (stores as any).pageInternal || [];
    const targetStore = storeList.find((s: any) => s.name === storeName);

    if (!targetStore) {
      throw new Error("Store nicht gefunden");
    }

    const fileCount = parseInt(targetStore.activeDocumentsCount || "0");
    console.log(`Store contains ${fileCount} files`);

    if (fileCount > 0) {
      // Store is not empty - we cannot delete it directly
      // The API doesn't provide a way to list/delete files from a store
      return NextResponse.json(
        {
          error: `Der Store enthält noch ${fileCount} Datei(en). Leider bietet die Google GenAI API aktuell keine Möglichkeit, Dateien aus einem File Search Store zu löschen. Du musst warten, bis die Dateien automatisch ablaufen, oder einen neuen Store erstellen.`,
          code: "STORE_NOT_EMPTY",
          fileCount: fileCount
        },
        { status: 400 }
      );
    }

    // Store is empty, we can delete it
    console.log(`Deleting empty store: ${storeName}`);
    await ai.fileSearchStores.delete({
      name: storeName,
    });

    console.log(`Successfully deleted store: ${storeName}`);

    return NextResponse.json({
      success: true,
      message: "Store erfolgreich gelöscht",
    });
  } catch (error: any) {
    console.error("Error deleting store:", error);

    // Check if it's still the "non-empty" error
    if (error.message?.includes("non-empty") || error.message?.includes("FAILED_PRECONDITION")) {
      return NextResponse.json(
        {
          error: "Store konnte nicht gelöscht werden. Möglicherweise sind noch Dateien vorhanden, die gelöscht werden müssen.",
          code: "STORE_NOT_EMPTY"
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Fehler beim Löschen des Stores" },
      { status: 500 }
    );
  }
}
