#!/usr/bin/env tsx

/**
 * Script to list all File Search Stores and their storage usage
 *
 * Usage:
 *   npx tsx scripts/list-stores.ts
 *
 * Or on server:
 *   cd /root/google-rag-chatbot && npx tsx scripts/list-stores.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.error("❌ GOOGLE_AI_API_KEY nicht gefunden!");
  console.error("Stelle sicher, dass die .env.local Datei existiert.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function listFileSearchStores() {
  try {
    console.log("📊 Lade File Search Stores...\n");

    // List all file search stores
    const stores = await ai.fileSearchStores.list();

    // The API returns data in pageInternal
    const storeList = (stores as any).pageInternal || [];

    if (!storeList || storeList.length === 0) {
      console.log("ℹ️  Keine File Search Stores gefunden.");
      return;
    }

    console.log(`✅ ${storeList.length} Store(s) gefunden:\n`);

    let totalFiles = 0;
    let totalSizeBytes = 0;

    for (const store of storeList) {
      console.log(`📁 ${store.displayName || store.name}`);
      console.log(`   ID: ${store.name}`);

      if (store.createTime) {
        console.log(`   Erstellt: ${new Date(store.createTime).toLocaleString('de-DE')}`);
      }

      // Get actual file count and size from API
      const fileCount = parseInt(store.activeDocumentsCount || "0");
      const sizeBytes = parseInt(store.sizeBytes || "0");

      console.log(`   Dateien: ${fileCount}`);

      if (sizeBytes > 0) {
        const sizeMB = sizeBytes / (1024 * 1024);
        console.log(`   Größe: ${sizeMB.toFixed(2)} MB (${sizeBytes.toLocaleString('de-DE')} Bytes)`);
        totalSizeBytes += sizeBytes;
      }

      totalFiles += fileCount;

      console.log("");
    }

    const totalSizeMB = totalSizeBytes / (1024 * 1024);

    console.log("═".repeat(60));
    console.log(`📊 ZUSAMMENFASSUNG:`);
    console.log(`   Stores: ${storeList.length}`);
    console.log(`   Dateien gesamt: ${totalFiles}`);
    console.log(`   Größe gesamt: ${totalSizeMB.toFixed(2)} MB (${totalSizeBytes.toLocaleString('de-DE')} Bytes)`);
    console.log(`   Verfügbar (Free Tier): ${(1024 - totalSizeMB).toFixed(2)} MB von 1024 MB`);
    console.log(`   Auslastung: ${((totalSizeMB / 1024) * 100).toFixed(2)}%`);
    console.log("═".repeat(60));

  } catch (error: any) {
    console.error("❌ Fehler beim Laden der Stores:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

listFileSearchStores();
