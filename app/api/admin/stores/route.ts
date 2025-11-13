import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";

export async function GET() {
  try {
    // Check if API key is configured
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error("GOOGLE_AI_API_KEY not configured");
      return NextResponse.json(
        { error: "API Key nicht konfiguriert. Bitte GOOGLE_AI_API_KEY in .env.local setzen." },
        { status: 500 }
      );
    }

    // List all file search stores
    console.log("Fetching file search stores...");
    const stores = await ai.fileSearchStores.list();
    console.log("Stores fetched successfully");

    // The API returns data in pageInternal
    const storeList = (stores as any).pageInternal || [];
    console.log(`Found ${storeList.length} stores`);

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
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
      code: error.code,
    });

    // Check for specific error types
    let errorMessage = error.message || "Fehler beim Laden der Stores";

    if (error.message?.includes("fetch failed")) {
      errorMessage = "Netzwerk-Fehler: Kann Google AI API nicht erreichen. Bitte prüfe:\n" +
                     "1. Firewall-Einstellungen auf dem Server\n" +
                     "2. DNS-Auflösung (generativelanguage.googleapis.com)\n" +
                     "3. Ausgehende HTTPS-Verbindungen erlaubt";
      console.error("Network error - cannot reach Google AI API");
      console.error("Check firewall, DNS, and outbound HTTPS connections");
    }

    if (error.cause) {
      console.error("Error cause:", error.cause);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        type: error.name,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Log event types for streaming
type LogEvent =
  | { type: "info"; message: string }
  | { type: "batch_start"; batch: number }
  | { type: "progress"; current: number; total: number; message: string }
  | { type: "batch_complete"; batch: number; deleted: number; total: number }
  | { type: "error"; message: string }
  | { type: "complete"; deletedCount: number; errorCount: number }
  | { type: "store_deleted"; message: string };

export async function DELETE(request: NextRequest) {
  const { storeName } = await request.json();

  if (!storeName) {
    return NextResponse.json(
      { error: "Store-Name erforderlich" },
      { status: 400 }
    );
  }

  // Create a ReadableStream for streaming logs
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (event: LogEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        sendLog({ type: "info", message: `Starte Löschung von Store: ${storeName}` });

        // First, get store info
        const stores = await ai.fileSearchStores.list();
        const storeList = (stores as any).pageInternal || [];
        const targetStore = storeList.find((s: any) => s.name === storeName);

        if (!targetStore) {
          sendLog({ type: "error", message: "Store nicht gefunden" });
          controller.close();
          return;
        }

        const fileCount = parseInt(targetStore.activeDocumentsCount || "0");
        sendLog({ type: "info", message: `Store enthält ${fileCount} Dokument(e)` });

        // Delete all documents in the store first (if any)
        if (fileCount > 0) {
          let totalDeletedCount = 0;
          let errorCount = 0;
          let batchNumber = 1;

          // Keep deleting batches until no more documents are found
          while (true) {
            sendLog({ type: "batch_start", batch: batchNumber });

            // List documents in the store (will get first page/batch)
            const documentsIterator = await ai.fileSearchStores.documents.list({
              parent: storeName
            });

            // Collect documents from this batch
            const documents: any[] = [];
            for await (const doc of documentsIterator) {
              if (doc.name) {
                documents.push(doc);
              }
            }

            sendLog({ type: "info", message: `Batch ${batchNumber}: ${documents.length} Dokument(e) gefunden` });

            // If no more documents, we're done
            if (documents.length === 0) {
              sendLog({ type: "info", message: "Keine weiteren Dokumente zum Löschen" });
              break;
            }

            // Delete each document in this batch
            let batchDeletedCount = 0;

            for (const doc of documents) {
              const current = totalDeletedCount + batchDeletedCount + 1;
              try {
                sendLog({
                  type: "progress",
                  current,
                  total: fileCount,
                  message: `Lösche: ${doc.displayName || doc.name}`
                });

                await ai.fileSearchStores.documents.delete({
                  name: doc.name,
                  config: { force: true }
                });
                batchDeletedCount++;
              } catch (docError: any) {
                errorCount++;
                sendLog({
                  type: "error",
                  message: `Fehler beim Löschen von ${doc.displayName || doc.name}: ${docError.message}`
                });
              }
            }

            totalDeletedCount += batchDeletedCount;
            sendLog({
              type: "batch_complete",
              batch: batchNumber,
              deleted: batchDeletedCount,
              total: documents.length
            });

            // If we couldn't delete any in this batch, stop to avoid infinite loop
            if (batchDeletedCount === 0) {
              sendLog({ type: "error", message: "Keine Dokumente konnten in diesem Batch gelöscht werden" });
              break;
            }

            batchNumber++;
          }

          sendLog({
            type: "complete",
            deletedCount: totalDeletedCount,
            errorCount
          });

          if (errorCount > 0) {
            sendLog({ type: "error", message: `${errorCount} Fehler sind aufgetreten` });
            controller.close();
            return;
          }
        }

        // Now delete the empty store
        sendLog({ type: "info", message: "Lösche Store..." });
        await ai.fileSearchStores.delete({
          name: storeName,
        });

        sendLog({ type: "store_deleted", message: "Store erfolgreich gelöscht" });
        controller.close();

      } catch (error: any) {
        console.error("Error deleting store:", error);
        sendLog({ type: "error", message: error.message || "Ein Fehler ist aufgetreten" });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
