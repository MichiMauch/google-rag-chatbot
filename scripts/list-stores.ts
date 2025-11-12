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

    if (!stores.fileSearchStores || stores.fileSearchStores.length === 0) {
      console.log("ℹ️  Keine File Search Stores gefunden.");
      return;
    }

    console.log(`✅ ${stores.fileSearchStores.length} Store(s) gefunden:\n`);

    let totalFiles = 0;
    let totalEstimatedSize = 0;

    for (const store of stores.fileSearchStores) {
      console.log(`📁 ${store.displayName || store.name}`);
      console.log(`   ID: ${store.name}`);

      if (store.createTime) {
        console.log(`   Erstellt: ${new Date(store.createTime).toLocaleString('de-DE')}`);
      }

      // Try to get file count
      const fileCount = (store as any).fileCount || "unbekannt";
      console.log(`   Dateien: ${fileCount}`);

      if (typeof fileCount === 'number') {
        totalFiles += fileCount;
        // Estimate: Each text file is roughly 20-50 KB, let's use 30 KB average
        const estimatedSize = (fileCount * 30) / 1024; // in MB
        totalEstimatedSize += estimatedSize;
        console.log(`   Geschätzte Größe: ~${estimatedSize.toFixed(2)} MB`);
      }

      console.log("");
    }

    console.log("═".repeat(60));
    console.log(`📊 ZUSAMMENFASSUNG:`);
    console.log(`   Stores: ${stores.fileSearchStores.length}`);
    console.log(`   Dateien gesamt: ${totalFiles}`);
    console.log(`   Geschätzte Größe gesamt: ~${totalEstimatedSize.toFixed(2)} MB`);
    console.log(`   Verfügbar (Free Tier): ~${(1024 - totalEstimatedSize).toFixed(2)} MB von 1024 MB`);
    console.log(`   Auslastung: ${((totalEstimatedSize / 1024) * 100).toFixed(1)}%`);
    console.log("═".repeat(60));

  } catch (error: any) {
    console.error("❌ Fehler beim Laden der Stores:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

listFileSearchStores();
