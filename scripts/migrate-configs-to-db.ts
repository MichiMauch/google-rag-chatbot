import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { chatConfigs } from "../lib/schema";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// Initialize database connection
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const db = drizzle(client);

interface ChatConfigFile {
  chatName: string;
  displayName: string;
  uploadType: "documents" | "website";
  themeId: string;
  fileSearchStoreName?: string;
  files: Array<{
    name: string;
    mimeType: string;
    uri: string;
    displayName?: string;
    url?: string;
    images?: string[];
  }>;
  sitemapUrls?: string[];
  allowedDomains?: string[];
  createdAt: number;
  systemInstruction?: string;
}

async function migrateConfigs() {
  console.log("Starting migration of chat configs to database...\n");

  const configsToMigrate: ChatConfigFile[] = [];

  // 1. Read kokomo-chat.json from root
  const kokomoConfigPath = path.join(process.cwd(), "kokomo-chat.json");
  if (fs.existsSync(kokomoConfigPath)) {
    console.log("Found kokomo-chat.json in root");
    const kokomoConfig = JSON.parse(fs.readFileSync(kokomoConfigPath, "utf-8"));
    configsToMigrate.push(kokomoConfig);
  }

  // 2. Read all configs from data/chat-configs/
  const configsDir = path.join(process.cwd(), "data", "chat-configs");
  if (fs.existsSync(configsDir)) {
    const configFiles = fs.readdirSync(configsDir).filter(f => f.endsWith(".json"));
    console.log(`Found ${configFiles.length} config(s) in data/chat-configs/`);

    for (const file of configFiles) {
      const filePath = path.join(configsDir, file);
      const config = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      configsToMigrate.push(config);
    }
  }

  console.log(`\nTotal configs to migrate: ${configsToMigrate.length}\n`);

  // 3. Insert into database
  for (const config of configsToMigrate) {
    try {
      await db.insert(chatConfigs).values({
        chatName: config.chatName,
        displayName: config.displayName,
        uploadType: config.uploadType,
        themeId: config.themeId,
        fileSearchStoreName: config.fileSearchStoreName || null,
        files: JSON.stringify(config.files),
        sitemapUrls: config.sitemapUrls ? JSON.stringify(config.sitemapUrls) : null,
        allowedDomains: config.allowedDomains ? JSON.stringify(config.allowedDomains) : null,
        systemInstruction: config.systemInstruction || null,
        createdAt: config.createdAt,
        updatedAt: Date.now(),
      });

      console.log(`✓ Migrated: ${config.chatName}`);
    } catch (error: any) {
      console.error(`✗ Failed to migrate ${config.chatName}:`, error.message);
    }
  }

  console.log("\n✨ Migration complete!");
  process.exit(0);
}

migrateConfigs().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
