import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || "libsql://google-rag-analytics-netnode-ag.turso.io",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
  },
});
