import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// Chat Sessions Table
export const chatSessions = sqliteTable(
  "chat_sessions",
  {
    id: text("id").primaryKey(),
    chatName: text("chat_name").notNull(),
    displayName: text("display_name").notNull(),
    fileSearchStoreName: text("file_search_store_name"),
    uploadType: text("upload_type").notNull(),
    themeId: text("theme_id").notNull(),
    systemInstruction: text("system_instruction"),
    createdAt: integer("created_at").notNull(),
    lastActivityAt: integer("last_activity_at").notNull(),
    totalMessages: integer("total_messages").default(0),
    totalUserMessages: integer("total_user_messages").default(0),
    totalBotMessages: integer("total_bot_messages").default(0),
  },
  (table) => ({
    chatNameIdx: index("idx_sessions_chat_name").on(table.chatName),
    createdAtIdx: index("idx_sessions_created").on(table.createdAt),
  })
);

// Chat Messages Table
export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "user" or "assistant"
    content: text("content").notNull(),
    createdAt: integer("created_at").notNull(),

    // Response metadata (for assistant messages)
    responseTimeMs: integer("response_time_ms"),
    modelUsed: text("model_used"),
    tokensUsed: integer("tokens_used"),

    // Sources used (JSON stringified array)
    sourcesUsed: text("sources_used"),

    // Error tracking
    hadError: integer("had_error", { mode: "boolean" }).default(false),
    errorMessage: text("error_message"),
  },
  (table) => ({
    sessionIdIdx: index("idx_messages_session").on(table.sessionId),
    createdAtIdx: index("idx_messages_created").on(table.createdAt),
  })
);

// Chat Analytics (Aggregated Stats)
export const chatAnalytics = sqliteTable(
  "chat_analytics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(), // YYYY-MM-DD
    chatName: text("chat_name").notNull(),

    // Message counts
    totalMessages: integer("total_messages").default(0),
    userMessages: integer("user_messages").default(0),
    botMessages: integer("bot_messages").default(0),
    errorMessages: integer("error_messages").default(0),

    // Performance metrics
    avgResponseTimeMs: real("avg_response_time_ms"),
    minResponseTimeMs: integer("min_response_time_ms"),
    maxResponseTimeMs: integer("max_response_time_ms"),

    // Usage metrics
    uniqueSessions: integer("unique_sessions").default(0),
    totalFilesUsed: integer("total_files_used").default(0),

    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    dateIdx: index("idx_analytics_date").on(table.date),
    chatNameIdx: index("idx_analytics_chat").on(table.chatName),
  })
);

// Scraped Pages Table - Tracks all scraped pages for change detection
export const scrapedPages = sqliteTable(
  "scraped_pages",
  {
    id: text("id").primaryKey(),
    chatName: text("chat_name").notNull(),
    url: text("url").notNull(),
    fileSearchDocumentName: text("file_search_document_name"),

    // Tracking timestamps
    lastScrapedAt: integer("last_scraped_at").notNull(),
    sitemapLastMod: integer("sitemap_last_mod"),

    // Metadata
    title: text("title"),
    displayName: text("display_name"),

    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    chatUrlIdx: index("idx_scraped_chat_url").on(table.chatName, table.url),
    urlIdx: index("idx_scraped_url").on(table.url),
    chatNameIdx: index("idx_scraped_chat").on(table.chatName),
  })
);

// Update History Table - Tracks all content update runs
export const updateHistory = sqliteTable(
  "update_history",
  {
    id: text("id").primaryKey(),
    chatName: text("chat_name").notNull(),
    triggeredBy: text("triggered_by").notNull(), // user ID or "system"

    // Status tracking
    status: text("status").notNull(), // "pending" | "running" | "completed" | "failed"

    // Statistics
    totalPages: integer("total_pages").default(0),
    checkedPages: integer("checked_pages").default(0),
    updatedPages: integer("updated_pages").default(0),
    unchangedPages: integer("unchanged_pages").default(0),
    errorPages: integer("error_pages").default(0),

    // Timing
    startedAt: integer("started_at"),
    completedAt: integer("completed_at"),
    durationMs: integer("duration_ms"),

    // Error tracking
    error: text("error"),

    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    chatNameIdx: index("idx_updates_chat").on(table.chatName),
    statusIdx: index("idx_updates_status").on(table.status),
    createdAtIdx: index("idx_updates_created").on(table.createdAt),
  })
);

// Page Update Logs Table - Detailed logs for each page in an update
export const pageUpdateLogs = sqliteTable(
  "page_update_logs",
  {
    id: text("id").primaryKey(),
    updateHistoryId: text("update_history_id")
      .notNull()
      .references(() => updateHistory.id, { onDelete: "cascade" }),

    // Page info
    url: text("url").notNull(),
    pageTitle: text("page_title"),

    // Action taken
    action: text("action").notNull(), // "created" | "updated" | "unchanged" | "error"

    // Change detection details
    oldLastMod: integer("old_last_mod"),
    newLastMod: integer("new_last_mod"),

    // Error tracking
    errorMessage: text("error_message"),

    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    updateHistoryIdx: index("idx_page_logs_update").on(table.updateHistoryId),
    actionIdx: index("idx_page_logs_action").on(table.action),
  })
);

// TypeScript types
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export type ChatAnalytics = typeof chatAnalytics.$inferSelect;
export type NewChatAnalytics = typeof chatAnalytics.$inferInsert;

export type ScrapedPage = typeof scrapedPages.$inferSelect;
export type NewScrapedPage = typeof scrapedPages.$inferInsert;

export type UpdateHistory = typeof updateHistory.$inferSelect;
export type NewUpdateHistory = typeof updateHistory.$inferInsert;

export type PageUpdateLog = typeof pageUpdateLogs.$inferSelect;
export type NewPageUpdateLog = typeof pageUpdateLogs.$inferInsert;
