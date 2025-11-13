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

// TypeScript types
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export type ChatAnalytics = typeof chatAnalytics.$inferSelect;
export type NewChatAnalytics = typeof chatAnalytics.$inferInsert;
