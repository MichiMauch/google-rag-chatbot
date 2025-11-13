#!/usr/bin/env tsx

/**
 * Script to delete ALL files from the Files API
 * This will empty all File Search Stores
 *
 * Usage:
 *   npx tsx scripts/delete-all-files.ts
 *
 * Or on server:
 *   cd /root/google-rag-chatbot && npx tsx scripts/delete-all-files.ts
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

async function deleteAllFiles() {
  try {
    console.log("📊 Lade alle Dateien...\n");

    // List all files
    const filesResponse = await ai.files.list({});
    const files: any[] = [];

    for await (const file of filesResponse) {
      files.push(file);
    }

    if (files.length === 0) {
      console.log("ℹ️  Keine Dateien gefunden.");
      return;
    }

    console.log(`✅ ${files.length} Datei(en) gefunden:\n`);

    for (const file of files) {
      console.log(`📄 ${file.displayName || file.name}`);
      console.log(`   ID: ${file.name}`);
      console.log(`   Erstellt: ${new Date(file.createTime).toLocaleString('de-DE')}`);
      console.log("");
    }

    console.log("═".repeat(60));
    console.log("🗑️  LÖSCHE ALLE DATEIEN...\n");

    let deletedCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        console.log(`Lösche: ${file.displayName || file.name}...`);
        await ai.files.delete({ name: file.name });
        deletedCount++;
        console.log(`✅ Gelöscht`);
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Fehler beim Löschen: ${error.message}`);
      }
    }

    console.log("\n" + "═".repeat(60));
    console.log(`📊 ZUSAMMENFASSUNG:`);
    console.log(`   Gelöscht: ${deletedCount}`);
    console.log(`   Fehler: ${errorCount}`);
    console.log("═".repeat(60));

  } catch (error: any) {
    console.error("❌ Fehler:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

deleteAllFiles();
