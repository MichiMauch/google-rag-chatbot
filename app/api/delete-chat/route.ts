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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large deletions

// Event types for streaming
type LogEvent = {
  type: "info" | "progress" | "batch_start" | "batch_complete" | "complete" | "error";
  message?: string;
  current?: number;
  total?: number;
  batch?: number;
};

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { chatName, fileSearchStoreName } = body;

  if (!chatName || !fileSearchStoreName) {
    return NextResponse.json(
      { error: "Chat-Name und File Search Store Name erforderlich" },
      { status: 400 }
    );
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (event: LogEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        sendLog({ type: "info", message: `🗑️ Lösche Chat "${chatName}"...` });
        sendLog({ type: "info", message: `📦 Store: ${fileSearchStoreName}` });

        // First, delete all documents from the store
        // Note: We need to delete documents in batches since there might be many
        let storeDeleted = false;

        sendLog({ type: "info", message: "📄 Lösche Dokumente aus dem Store..." });

        let totalDeleted = 0;
        let batchCount = 0;
        let hasMoreDocuments = true;

        // Keep deleting documents until the store is empty
        while (hasMoreDocuments) {
          batchCount++;
          sendLog({ type: "batch_start", batch: batchCount, message: `Batch ${batchCount}: Lade Dokumente...` });

          const documentsIterator = await ai.fileSearchStores.documents.list({
            parent: fileSearchStoreName,
          });

          const documents: any[] = [];
          for await (const doc of documentsIterator) {
            documents.push(doc);
          }

          sendLog({ type: "info", message: `   📋 ${documents.length} Dokumente gefunden` });

          if (documents.length === 0) {
            hasMoreDocuments = false;
            break;
          }

          // Delete all documents in this batch
          for (const doc of documents) {
            try {
              await ai.fileSearchStores.documents.delete({
                name: doc.name,
                config: { force: true }
              });
              totalDeleted++;

              // Log progress every 10 documents
              if (totalDeleted % 10 === 0) {
                sendLog({
                  type: "progress",
                  current: totalDeleted,
                  message: `   🗑️ ${totalDeleted} Dokumente gelöscht...`
                });
              }
            } catch (docError: any) {
              sendLog({ type: "info", message: `   ⚠️ Fehler beim Löschen eines Dokuments (überspringe)` });
              // Continue with other documents even if one fails
            }
          }

          sendLog({
            type: "batch_complete",
            batch: batchCount,
            message: `   ✅ Batch ${batchCount} abgeschlossen (${totalDeleted} gesamt gelöscht)`
          });
        }

        sendLog({ type: "info", message: `✅ Alle Dokumente gelöscht (${totalDeleted} total)` });

        // Now delete the empty store
        sendLog({ type: "info", message: "🗑️ Lösche File Search Store..." });

        try {
          await ai.fileSearchStores.delete({
            name: fileSearchStoreName,
          });
          sendLog({ type: "info", message: "✅ File Search Store gelöscht" });
          storeDeleted = true;
        } catch (error: any) {
          if (error.status === 404 || error.message?.includes("not found")) {
            sendLog({ type: "info", message: "ℹ️ Store existierte bereits nicht mehr" });
            storeDeleted = true;
          } else {
            throw error;
          }
        }

        // Always delete from database (even if store didn't exist)
        sendLog({ type: "info", message: "💾 Lösche Datenbank-Einträge..." });

        try {
          // Delete analytics data first (no cascade dependencies)
          await db.delete(chatAnalytics).where(eq(chatAnalytics.chatName, chatName));
          sendLog({ type: "info", message: "   ✅ Analytics-Daten gelöscht" });

          // Delete scraped pages
          await db.delete(scrapedPages).where(eq(scrapedPages.chatName, chatName));
          sendLog({ type: "info", message: "   ✅ Gescrapte Seiten gelöscht" });

          // Delete update history (this will cascade delete pageUpdateLogs)
          await db.delete(updateHistory).where(eq(updateHistory.chatName, chatName));
          sendLog({ type: "info", message: "   ✅ Update-Historie gelöscht" });

          // Delete chat sessions (this will cascade delete chatMessages)
          await db.delete(chatSessions).where(eq(chatSessions.chatName, chatName));
          sendLog({ type: "info", message: "   ✅ Chat-Sessions gelöscht" });

          // Finally, delete config
          await db.delete(chatConfigs).where(eq(chatConfigs.chatName, chatName));
          sendLog({ type: "info", message: "   ✅ Chat-Konfiguration gelöscht" });
        } catch (error: any) {
          sendLog({ type: "info", message: `   ⚠️ Datenbankfehler (fortfahren): ${error.message}` });
          // Don't fail the request if database deletion fails
        }

        sendLog({
          type: "complete",
          message: storeDeleted
            ? `🎉 Chat "${chatName}" erfolgreich gelöscht!`
            : `🎉 Chat-Konfiguration gelöscht (Store existierte bereits nicht mehr)`
        });

      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
        console.error("Delete chat error:", error);
        sendLog({
          type: "error",
          message: `❌ Fehler beim Löschen: ${errorMessage}`
        });
      } finally {
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
