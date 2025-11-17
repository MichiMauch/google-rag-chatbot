import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL environment variable is required");
}

if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error("TURSO_AUTH_TOKEN environment variable is required");
}

// Create custom fetch with longer timeout to prevent UND_ERR_CONNECT_TIMEOUT
// Default timeout of 10s is often insufficient for Turso connections
const customFetch = (url: string, init?: RequestInit) => {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(60000), // 60 second timeout
  });
};

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  fetch: customFetch as any, // Custom fetch with extended timeout
  concurrency: 20, // Increase concurrent connection limit (default is 5)
});

export const db = drizzle(client, { schema });
