import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "libsql://google-rag-analytics-netnode-ag.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjMwNjg4ODksImlkIjoiMTk3YmM0NWEtMjliZC00OTA5LTljNDctMmE2OTAxODNjMTQ5In0.b_fkOy5AzcUEqY-HDqeYrTrfOy85AO1_tehQPti2HwZAIc_GUECAgPKxBhOImqrPdh_GC4lN60zYVGfQzroLAw",
  },
});
