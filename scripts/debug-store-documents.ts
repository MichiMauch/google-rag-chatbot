import { ai } from "../lib/gemini";

async function debugStoreDocuments(fileSearchStoreName: string) {
  console.log(`\n🔍 Debugging File Search Store: ${fileSearchStoreName}\n`);

  try {
    const documentsIterator = await ai.fileSearchStores.documents.list({
      parent: fileSearchStoreName
    });

    const documents: any[] = [];
    for await (const doc of documentsIterator) {
      documents.push(doc);
    }

    console.log(`📊 Total documents: ${documents.length}\n`);

    // Group by URL metadata
    const withUrl = documents.filter(d => d.customMetadata?.url);
    const withoutUrl = documents.filter(d => !d.customMetadata?.url);

    console.log(`✅ Documents WITH URL metadata: ${withUrl.length}`);
    console.log(`❌ Documents WITHOUT URL metadata: ${withoutUrl.length}\n`);

    // Show URL duplicates
    const urlMap = new Map<string, any[]>();
    withUrl.forEach(doc => {
      const url = doc.customMetadata?.url;
      if (!urlMap.has(url)) {
        urlMap.set(url, []);
      }
      urlMap.get(url)!.push(doc);
    });

    const duplicates = Array.from(urlMap.entries()).filter(([_, docs]) => docs.length > 1);

    console.log(`🔄 URLs with duplicates: ${duplicates.length}\n`);

    if (duplicates.length > 0) {
      console.log(`Duplicate URLs:`);
      duplicates.slice(0, 10).forEach(([url, docs]) => {
        console.log(`  - ${url}: ${docs.length} copies`);
        docs.forEach((doc, i) => {
          console.log(`    [${i+1}] ${doc.name} (created: ${doc.createTime})`);
        });
      });

      if (duplicates.length > 10) {
        console.log(`  ... and ${duplicates.length - 10} more URLs with duplicates\n`);
      }
    }

    // Show sample documents
    console.log(`\n📄 Sample documents (first 5):`);
    documents.slice(0, 5).forEach((doc, i) => {
      console.log(`\n${i+1}. ${doc.name}`);
      console.log(`   Display: ${doc.displayName || 'N/A'}`);
      console.log(`   Created: ${doc.createTime}`);
      console.log(`   URL metadata: ${doc.customMetadata?.url || 'NONE'}`);
      console.log(`   Title metadata: ${doc.customMetadata?.pageTitle || 'NONE'}`);
    });

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

const storeName = process.argv[2];
if (!storeName) {
  console.error("Usage: npx tsx scripts/debug-store-documents.ts <fileSearchStoreName>");
  process.exit(1);
}

debugStoreDocuments(storeName);
