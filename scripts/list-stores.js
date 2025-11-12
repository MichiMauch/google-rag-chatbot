#!/usr/bin/env node

/**
 * Script to list all File Search Stores and their storage usage
 *
 * Usage:
 *   node scripts/list-stores.js
 *
 * Or on server:
 *   cd /root/google-rag-chatbot && node scripts/list-stores.js
 */

import { GoogleAIFileManager } from "@google/genai/files";

const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.error("❌ GOOGLE_AI_API_KEY nicht gefunden!");
  console.error("Stelle sicher, dass die .env.local Datei existiert.");
  process.exit(1);
}

const fileManager = new GoogleAIFileManager(apiKey);

async function listFileSearchStores() {
  try {
    console.log("📊 Lade File Search Stores...\n");

    // List all file search stores
    const stores = await fileManager.fileSearchStores.list();

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
      console.log(`   Erstellt: ${new Date(store.createTime).toLocaleString('de-DE')}`);

      // Try to get file count (this might not work directly, we'll estimate)
      const fileCount = store.fileCount || "unbekannt";
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

  } catch (error) {
    console.error("❌ Fehler beim Laden der Stores:", error.message);
    console.error(error);
  }
}

listFileSearchStores();
