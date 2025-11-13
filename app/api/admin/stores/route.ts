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

    // Step 1: List all files in the store
    console.log(`Listing files in store: ${storeName}`);
    let files: any[] = [];

    try {
      const listResponse = await ai.fileSearchStores.files.list({
        fileSearchStoreName: storeName,
      });

      // The API returns an async iterator
      for await (const file of listResponse) {
        files.push(file);
      }

      console.log(`Found ${files.length} files in store`);
    } catch (listError: any) {
      console.error("Error listing files:", listError);
      // If we can't list files, try to delete anyway
    }

    // Step 2: Delete all files from the store
    if (files.length > 0) {
      console.log(`Deleting ${files.length} files from store...`);

      for (const file of files) {
        try {
          console.log(`Deleting file: ${file.name}`);
          await ai.files.delete({ name: file.name });
        } catch (fileDeleteError: any) {
          console.error(`Error deleting file ${file.name}:`, fileDeleteError);
          // Continue with other files even if one fails
        }
      }

      // Wait a bit for deletions to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Step 3: Delete the now-empty store
    console.log(`Deleting empty store: ${storeName}`);
    await ai.fileSearchStores.delete({
      name: storeName,
    });

    console.log(`Successfully deleted store: ${storeName}`);

    return NextResponse.json({
      success: true,
      message: "Store erfolgreich gelöscht",
      filesDeleted: files.length,
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
