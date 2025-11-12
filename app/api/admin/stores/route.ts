import { NextResponse } from "next/server";
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
