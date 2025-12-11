import { db } from "./db";
import { chatSessions, chatMessages, NewChatSession, NewChatMessage } from "./schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Get or create a chat session
 */
export async function getOrCreateSession(
  chatName: string,
  chatConfig: {
    displayName: string;
    uploadType: string;
    themeId: string;
    fileSearchStoreName?: string;
    systemInstruction?: string;
  }
): Promise<string> {
  try {
    // Try to find existing active session for this chat (case-insensitive)
    const existingSessions = await db
      .select()
      .from(chatSessions)
      .where(sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`)
      .orderBy(desc(chatSessions.lastActivityAt))
      .limit(1);

    const now = Date.now();

    if (existingSessions.length > 0) {
      const session = existingSessions[0];

      // Update last activity
      await db
        .update(chatSessions)
        .set({ lastActivityAt: now })
        .where(eq(chatSessions.id, session.id));

      return session.id;
    }

    // Create new session
    const sessionId = `session_${now}_${Math.random().toString(36).substring(7)}`;

    const newSession: NewChatSession = {
      id: sessionId,
      chatName,
      displayName: chatConfig.displayName,
      fileSearchStoreName: chatConfig.fileSearchStoreName,
      uploadType: chatConfig.uploadType,
      themeId: chatConfig.themeId,
      systemInstruction: chatConfig.systemInstruction,
      createdAt: now,
      lastActivityAt: now,
      totalMessages: 0,
      totalUserMessages: 0,
      totalBotMessages: 0,
    };

    await db.insert(chatSessions).values(newSession);

    return sessionId;
  } catch (error) {
    console.error("Error in getOrCreateSession:", error);
    throw error;
  }
}

/**
 * Log a chat message
 */
export async function logChatMessage(params: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  responseTimeMs?: number;
  modelUsed?: string;
  sourcesUsed?: string[];
  hadError?: boolean;
  errorMessage?: string;
}): Promise<string | null> {
  try {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const newMessage: NewChatMessage = {
      id: messageId,
      sessionId: params.sessionId,
      role: params.role,
      content: params.content,
      createdAt: Date.now(),
      responseTimeMs: params.responseTimeMs,
      modelUsed: params.modelUsed,
      tokensUsed: undefined, // Could be added later if available
      sourcesUsed: params.sourcesUsed ? JSON.stringify(params.sourcesUsed) : undefined,
      hadError: params.hadError ? true : false,
      errorMessage: params.errorMessage,
    };

    await db.insert(chatMessages).values(newMessage);

    // Update session stats
    await updateSessionStats(params.sessionId, params.role);

    // Return the message ID
    return messageId;
  } catch (error) {
    console.error("Error in logChatMessage:", error);
    // Don't throw - logging should not break the chat
    return null;
  }
}

/**
 * Update session statistics
 */
async function updateSessionStats(sessionId: string, role: "user" | "assistant"): Promise<void> {
  try {
    const session = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (session.length === 0) return;

    const updates: any = {
      totalMessages: (session[0].totalMessages || 0) + 1,
      lastActivityAt: Date.now(),
    };

    if (role === "user") {
      updates.totalUserMessages = (session[0].totalUserMessages || 0) + 1;
    } else {
      updates.totalBotMessages = (session[0].totalBotMessages || 0) + 1;
    }

    await db
      .update(chatSessions)
      .set(updates)
      .where(eq(chatSessions.id, sessionId));
  } catch (error) {
    console.error("Error in updateSessionStats:", error);
  }
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  try {
    // Total sessions
    const totalSessionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatSessions);
    const totalSessions = totalSessionsResult[0]?.count || 0;

    // Total messages (only user questions)
    const totalMessagesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .where(eq(chatMessages.role, "user"));
    const totalMessages = totalMessagesResult[0]?.count || 0;

    // Active sessions (last 24h)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeSessionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatSessions)
      .where(sql`${chatSessions.lastActivityAt} > ${oneDayAgo}`);
    const activeSessions = activeSessionsResult[0]?.count || 0;

    // Average response time
    const avgResponseTimeResult = await db
      .select({
        avg: sql<number>`avg(${chatMessages.responseTimeMs})`,
      })
      .from(chatMessages)
      .where(and(
        eq(chatMessages.role, "assistant"),
        sql`${chatMessages.responseTimeMs} IS NOT NULL`
      ));
    const avgResponseTime = Math.round(avgResponseTimeResult[0]?.avg || 0);

    return {
      totalSessions,
      totalMessages,
      activeSessions,
      avgResponseTime,
    };
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    return {
      totalSessions: 0,
      totalMessages: 0,
      activeSessions: 0,
      avgResponseTime: 0,
    };
  }
}

/**
 * Get top chats by message count
 */
export async function getTopChats(limit = 10) {
  try {
    const result = await db
      .select({
        chatName: chatSessions.chatName,
        displayName: chatSessions.displayName,
        totalSessions: sql<number>`count(distinct ${chatSessions.id})`,
        totalMessages: sql<number>`sum(${chatSessions.totalMessages})`,
        lastActivity: sql<number>`max(${chatSessions.lastActivityAt})`,
      })
      .from(chatSessions)
      .groupBy(chatSessions.chatName, chatSessions.displayName)
      .orderBy(desc(sql`sum(${chatSessions.totalMessages})`))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("Error in getTopChats:", error);
    return [];
  }
}

/**
 * Get recent messages for activity feed
 */
export async function getRecentMessages(limit = 20) {
  try {
    const result = await db
      .select({
        id: chatMessages.id,
        sessionId: chatMessages.sessionId,
        role: chatMessages.role,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
        chatName: chatSessions.chatName,
        displayName: chatSessions.displayName,
      })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("Error in getRecentMessages:", error);
    return [];
  }
}

/**
 * Get messages over time (for charts)
 */
export async function getMessagesOverTime(days = 30) {
  try {
    const startDate = Date.now() - days * 24 * 60 * 60 * 1000;

    const result = await db
      .select({
        date: sql<string>`date(${chatMessages.createdAt} / 1000, 'unixepoch')`,
        userMessages: sql<number>`sum(case when ${chatMessages.role} = 'user' then 1 else 0 end)`,
        botMessages: sql<number>`sum(case when ${chatMessages.role} = 'assistant' then 1 else 0 end)`,
        totalMessages: sql<number>`count(*)`,
      })
      .from(chatMessages)
      .where(sql`${chatMessages.createdAt} > ${startDate}`)
      .groupBy(sql`date(${chatMessages.createdAt} / 1000, 'unixepoch')`)
      .orderBy(sql`date(${chatMessages.createdAt} / 1000, 'unixepoch')`);

    return result;
  } catch (error) {
    console.error("Error in getMessagesOverTime:", error);
    return [];
  }
}

/**
 * Get popular questions (most common user messages)
 */
export async function getPopularQuestions(limit = 10) {
  try {
    const result = await db
      .select({
        question: chatMessages.content,
        count: sql<number>`count(*)`,
      })
      .from(chatMessages)
      .where(eq(chatMessages.role, "user"))
      .groupBy(chatMessages.content)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("Error in getPopularQuestions:", error);
    return [];
  }
}

/**
 * Get statistics for a specific chat
 */
export async function getChatStats(chatName: string) {
  try {
    // Total sessions for this chat (case-insensitive)
    const totalSessionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatSessions)
      .where(sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`);
    const totalSessions = totalSessionsResult[0]?.count || 0;

    // Total messages for this chat (only user questions, case-insensitive)
    const totalMessagesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(and(
        sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`,
        eq(chatMessages.role, "user")
      ));
    const totalMessages = totalMessagesResult[0]?.count || 0;

    // Active sessions (last 24h, case-insensitive)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeSessionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatSessions)
      .where(and(
        sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`,
        sql`${chatSessions.lastActivityAt} > ${oneDayAgo}`
      ));
    const activeSessions = activeSessionsResult[0]?.count || 0;

    // Average response time (case-insensitive)
    const avgResponseTimeResult = await db
      .select({
        avg: sql<number>`avg(${chatMessages.responseTimeMs})`,
      })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(and(
        sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`,
        eq(chatMessages.role, "assistant"),
        sql`${chatMessages.responseTimeMs} IS NOT NULL`
      ));
    const avgResponseTime = Math.round(avgResponseTimeResult[0]?.avg || 0);

    // Error count (case-insensitive)
    const errorCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(and(
        sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`,
        eq(chatMessages.hadError, true)
      ));
    const errorCount = errorCountResult[0]?.count || 0;

    return {
      totalSessions,
      totalMessages,
      activeSessions,
      avgResponseTime,
      errorCount,
      errorRate: totalMessages > 0 ? (errorCount / totalMessages) * 100 : 0,
    };
  } catch (error) {
    console.error("Error in getChatStats:", error);
    return {
      totalSessions: 0,
      totalMessages: 0,
      activeSessions: 0,
      avgResponseTime: 0,
      errorCount: 0,
      errorRate: 0,
    };
  }
}

/**
 * Get all sessions with their messages for a specific chat
 */
export async function getChatSessions(chatName: string, limit = 50) {
  try {
    // Get sessions for this chat (case-insensitive)
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`)
      .orderBy(desc(chatSessions.lastActivityAt))
      .limit(limit);

    // Get messages for each session
    const sessionsWithMessages = await Promise.all(
      sessions.map(async (session) => {
        const messages = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.sessionId, session.id))
          .orderBy(desc(chatMessages.createdAt));

        return {
          ...session,
          messages,
        };
      })
    );

    return sessionsWithMessages;
  } catch (error) {
    console.error("Error in getChatSessions:", error);
    return [];
  }
}

/**
 * Get messages over time for a specific chat
 */
export async function getChatMessagesOverTime(chatName: string, days = 30) {
  try {
    const startDate = Date.now() - days * 24 * 60 * 60 * 1000;

    const result = await db
      .select({
        date: sql<string>`date(${chatMessages.createdAt} / 1000, 'unixepoch')`,
        userMessages: sql<number>`sum(case when ${chatMessages.role} = 'user' then 1 else 0 end)`,
        botMessages: sql<number>`sum(case when ${chatMessages.role} = 'assistant' then 1 else 0 end)`,
        totalMessages: sql<number>`count(*)`,
      })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(and(
        sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`,
        sql`${chatMessages.createdAt} > ${startDate}`
      ))
      .groupBy(sql`date(${chatMessages.createdAt} / 1000, 'unixepoch')`)
      .orderBy(sql`date(${chatMessages.createdAt} / 1000, 'unixepoch')`);

    return result;
  } catch (error) {
    console.error("Error in getChatMessagesOverTime:", error);
    return [];
  }
}

/**
 * Get popular questions for a specific chat
 */
export async function getChatPopularQuestions(chatName: string, limit = 10) {
  try {
    const result = await db
      .select({
        question: chatMessages.content,
        count: sql<number>`count(*)`,
      })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(and(
        sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`,
        eq(chatMessages.role, "user")
      ))
      .groupBy(chatMessages.content)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("Error in getChatPopularQuestions:", error);
    return [];
  }
}

/**
 * Get response time statistics for a specific chat
 */
export async function getChatResponseTimes(chatName: string, days = 30) {
  try {
    const startDate = Date.now() - days * 24 * 60 * 60 * 1000;

    const result = await db
      .select({
        date: sql<string>`date(${chatMessages.createdAt} / 1000, 'unixepoch')`,
        avgResponseTime: sql<number>`avg(${chatMessages.responseTimeMs})`,
        minResponseTime: sql<number>`min(${chatMessages.responseTimeMs})`,
        maxResponseTime: sql<number>`max(${chatMessages.responseTimeMs})`,
      })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(and(
        sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`,
        eq(chatMessages.role, "assistant"),
        sql`${chatMessages.responseTimeMs} IS NOT NULL`,
        sql`${chatMessages.createdAt} > ${startDate}`
      ))
      .groupBy(sql`date(${chatMessages.createdAt} / 1000, 'unixepoch')`)
      .orderBy(sql`date(${chatMessages.createdAt} / 1000, 'unixepoch')`);

    return result;
  } catch (error) {
    console.error("Error in getChatResponseTimes:", error);
    return [];
  }
}

/**
 * Get feedback statistics for a specific chat
 */
export async function getFeedbackStats(chatName?: string) {
  try {
    let query = db
      .select({
        thumbsUp: sql<number>`sum(case when ${chatMessages.feedback} = 1 then 1 else 0 end)`,
        thumbsDown: sql<number>`sum(case when ${chatMessages.feedback} = -1 then 1 else 0 end)`,
        totalFeedback: sql<number>`sum(case when ${chatMessages.feedback} IS NOT NULL then 1 else 0 end)`,
      })
      .from(chatMessages)
      .where(eq(chatMessages.role, "assistant"));

    if (chatName) {
      query = db
        .select({
          thumbsUp: sql<number>`sum(case when ${chatMessages.feedback} = 1 then 1 else 0 end)`,
          thumbsDown: sql<number>`sum(case when ${chatMessages.feedback} = -1 then 1 else 0 end)`,
          totalFeedback: sql<number>`sum(case when ${chatMessages.feedback} IS NOT NULL then 1 else 0 end)`,
        })
        .from(chatMessages)
        .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
        .where(and(
          sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`,
          eq(chatMessages.role, "assistant")
        ));
    }

    const result = await query;
    const stats = result[0];

    const thumbsUp = Number(stats?.thumbsUp) || 0;
    const thumbsDown = Number(stats?.thumbsDown) || 0;
    const totalFeedback = Number(stats?.totalFeedback) || 0;

    // Calculate satisfaction score (percentage of positive feedback)
    const satisfactionScore = totalFeedback > 0
      ? Math.round((thumbsUp / totalFeedback) * 100)
      : 0;

    return {
      thumbsUp,
      thumbsDown,
      totalFeedback,
      satisfactionScore,
    };
  } catch (error) {
    console.error("Error in getFeedbackStats:", error);
    return {
      thumbsUp: 0,
      thumbsDown: 0,
      totalFeedback: 0,
      satisfactionScore: 0,
    };
  }
}

/**
 * Get messages with feedback for a specific chat
 */
export async function getMessagesWithFeedback(chatName: string, limit = 50) {
  try {
    const result = await db
      .select({
        messageId: chatMessages.id,
        sessionId: chatMessages.sessionId,
        content: chatMessages.content,
        feedback: chatMessages.feedback,
        feedbackAt: chatMessages.feedbackAt,
        createdAt: chatMessages.createdAt,
        responseTimeMs: chatMessages.responseTimeMs,
      })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(and(
        sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`,
        eq(chatMessages.role, "assistant"),
        sql`${chatMessages.feedback} IS NOT NULL`
      ))
      .orderBy(desc(chatMessages.feedbackAt))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("Error in getMessagesWithFeedback:", error);
    return [];
  }
}

/**
 * Get temporal patterns for user messages (when users ask questions)
 * Converts UTC timestamps to Europe/Zurich timezone
 */
export async function getTemporalPatterns(chatName: string, days: number = 30) {
  try {
    const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get all user messages for the chat
    const messages = await db
      .select({
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(and(
        sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`,
        eq(chatMessages.role, "user"),
        sql`${chatMessages.createdAt} >= ${cutoffDate}`
      ));

    // Initialize data structures
    const weekdayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const hourCount: Record<number, number> = {};
    const heatmapData: Record<number, Record<number, number>> = {};
    const timeOfDayCount = { morning: 0, midday: 0, afternoon: 0, evening: 0 };

    // Initialize hour counts (0-23)
    for (let i = 0; i < 24; i++) {
      hourCount[i] = 0;
    }

    // Initialize heatmap data (weekday 0-6, hour 0-23)
    for (let day = 0; day < 7; day++) {
      heatmapData[day] = {};
      for (let hour = 0; hour < 24; hour++) {
        heatmapData[day][hour] = 0;
      }
    }

    // Process each message
    for (const message of messages) {
      // Convert UTC timestamp to Europe/Zurich timezone
      const date = new Date(message.createdAt);
      const zurichTime = new Intl.DateTimeFormat("de-CH", {
        timeZone: "Europe/Zurich",
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
      });

      // Get weekday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
      const weekday = date.getUTCDay();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Zurich",
        hour: "numeric",
        hour12: false,
      });
      const hour = parseInt(formatter.format(date));

      // Count by weekday
      weekdayCount[weekday]++;

      // Count by hour
      hourCount[hour]++;

      // Heatmap data
      heatmapData[weekday][hour]++;

      // Time of day categorization
      if (hour >= 6 && hour < 12) {
        timeOfDayCount.morning++;
      } else if (hour >= 12 && hour < 14) {
        timeOfDayCount.midday++;
      } else if (hour >= 14 && hour < 18) {
        timeOfDayCount.afternoon++;
      } else {
        timeOfDayCount.evening++;
      }
    }

    // Format weekday data with German labels
    const weekdayLabels = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    const weekdayData = weekdayLabels.map((label, index) => ({
      weekday: label,
      count: weekdayCount[index],
    }));

    // Format hour data
    const hourData = Object.entries(hourCount).map(([hour, count]) => ({
      hour: parseInt(hour),
      count: count,
    }));

    // Format heatmap data
    const formattedHeatmap = Object.entries(heatmapData).map(([weekday, hours]) => ({
      weekday: parseInt(weekday),
      weekdayLabel: weekdayLabels[parseInt(weekday)],
      hours: Object.entries(hours).map(([hour, count]) => ({
        hour: parseInt(hour),
        count: count,
      })),
    }));

    // Format time of day data
    const timeOfDayData = [
      { period: "Morgen (6-12)", count: timeOfDayCount.morning },
      { period: "Mittag (12-14)", count: timeOfDayCount.midday },
      { period: "Nachmittag (14-18)", count: timeOfDayCount.afternoon },
      { period: "Abend/Nacht", count: timeOfDayCount.evening },
    ];

    return {
      weekdayData,
      hourData,
      heatmapData: formattedHeatmap,
      timeOfDayData,
      totalMessages: messages.length,
    };
  } catch (error) {
    console.error("Error in getTemporalPatterns:", error);
    return {
      weekdayData: [],
      hourData: [],
      heatmapData: [],
      timeOfDayData: [],
      totalMessages: 0,
    };
  }
}

/**
 * Update message with AI analysis results
 */
export async function updateMessageAnalysis(
  messageId: string,
  analysis: {
    sentiment: string;
    sentimentScore: number;
    categories: string[];
    urgency: string;
  }
): Promise<void> {
  try {
    await db
      .update(chatMessages)
      .set({
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        categories: JSON.stringify(analysis.categories),
        urgency: analysis.urgency,
        analysisCompletedAt: Date.now(),
      })
      .where(eq(chatMessages.id, messageId));

    console.log(`[Analytics] AI analysis updated for message ${messageId}`);
  } catch (error) {
    console.error("Error in updateMessageAnalysis:", error);
    // Don't throw - analysis update should not break the chat
  }
}

/**
 * Get AI insights for a specific chat
 */
export async function getAIInsights(chatName: string, days: number = 30) {
  try {
    const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get all user messages with AI analysis for the chat
    const messages = await db
      .select({
        sentiment: chatMessages.sentiment,
        sentimentScore: chatMessages.sentimentScore,
        categories: chatMessages.categories,
        urgency: chatMessages.urgency,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(
        and(
          sql`LOWER(${chatSessions.chatName}) = LOWER(${chatName})`,
          eq(chatMessages.role, "user"),
          sql`${chatMessages.createdAt} >= ${cutoffDate}`,
          sql`${chatMessages.sentiment} IS NOT NULL`
        )
      );

    // Count sentiments
    const sentimentCounts = {
      positive: 0,
      negative: 0,
      neutral: 0,
    };

    // Count urgency levels
    const urgencyCounts = {
      low: 0,
      medium: 0,
      high: 0,
    };

    // Collect all categories
    const categoryMap: Record<string, number> = {};

    // Process sentiment over time (daily aggregation)
    const dailySentiment: Record<
      string,
      { positive: number; negative: number; neutral: number }
    > = {};

    for (const message of messages) {
      // Count sentiments
      if (message.sentiment === "positive") sentimentCounts.positive++;
      else if (message.sentiment === "negative") sentimentCounts.negative++;
      else if (message.sentiment === "neutral") sentimentCounts.neutral++;

      // Count urgency
      if (message.urgency === "low") urgencyCounts.low++;
      else if (message.urgency === "medium") urgencyCounts.medium++;
      else if (message.urgency === "high") urgencyCounts.high++;

      // Collect categories
      if (message.categories) {
        try {
          const cats = JSON.parse(message.categories);
          for (const cat of cats) {
            categoryMap[cat] = (categoryMap[cat] || 0) + 1;
          }
        } catch (e) {
          // Invalid JSON, skip
        }
      }

      // Daily sentiment aggregation
      const date = new Date(message.createdAt);
      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!dailySentiment[dateKey]) {
        dailySentiment[dateKey] = { positive: 0, negative: 0, neutral: 0 };
      }

      if (message.sentiment === "positive") dailySentiment[dateKey].positive++;
      else if (message.sentiment === "negative") dailySentiment[dateKey].negative++;
      else if (message.sentiment === "neutral") dailySentiment[dateKey].neutral++;
    }

    // Format sentiment data
    const totalAnalyzed = messages.length;
    const sentimentData = [
      {
        sentiment: "Positiv",
        count: sentimentCounts.positive,
        percentage:
          totalAnalyzed > 0
            ? Math.round((sentimentCounts.positive / totalAnalyzed) * 100)
            : 0,
      },
      {
        sentiment: "Neutral",
        count: sentimentCounts.neutral,
        percentage:
          totalAnalyzed > 0
            ? Math.round((sentimentCounts.neutral / totalAnalyzed) * 100)
            : 0,
      },
      {
        sentiment: "Negativ",
        count: sentimentCounts.negative,
        percentage:
          totalAnalyzed > 0
            ? Math.round((sentimentCounts.negative / totalAnalyzed) * 100)
            : 0,
      },
    ];

    // Format category data (top 10)
    const categoryData = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Format urgency data
    const urgencyData = [
      { urgency: "Niedrig", count: urgencyCounts.low },
      { urgency: "Mittel", count: urgencyCounts.medium },
      { urgency: "Hoch", count: urgencyCounts.high },
    ];

    // Format timeline data (sorted by date)
    const timelineData = Object.entries(dailySentiment)
      .map(([date, counts]) => ({
        date,
        positive: counts.positive,
        neutral: counts.neutral,
        negative: counts.negative,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      sentimentData,
      categoryData,
      urgencyData,
      timelineData,
      totalAnalyzed,
    };
  } catch (error) {
    console.error("Error in getAIInsights:", error);
    return {
      sentimentData: [],
      categoryData: [],
      urgencyData: [],
      timelineData: [],
      totalAnalyzed: 0,
    };
  }
}
