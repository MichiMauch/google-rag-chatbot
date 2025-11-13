import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "libsql://google-rag-analytics-netnode-ag.turso.io",
    authToken: "***REMOVED***",
  },
});
