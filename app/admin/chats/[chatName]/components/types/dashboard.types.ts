/**
 * Type definitions for Chat Dashboard
 */

export interface ChatStats {
  totalSessions: number;
  totalMessages: number;
  activeSessions: number;
  avgResponseTime: number;
  errorCount: number;
  errorRate: number;
}

export interface FeedbackStats {
  thumbsUp: number;
  thumbsDown: number;
  totalFeedback: number;
  satisfactionScore: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  responseTimeMs?: number | null;
  sourcesUsed?: string | null;
  hadError?: number | null;
  errorMessage?: string | null;
}

export interface Session {
  id: string;
  chatName: string;
  displayName: string;
  createdAt: number;
  lastActivityAt: number;
  totalMessages: number | null;
  totalUserMessages: number | null;
  totalBotMessages: number | null;
  messages: Message[];
}

export interface MessageOverTime {
  date: string;
  userMessages: number;
  botMessages: number;
  totalMessages: number;
}

export interface ResponseTime {
  date: string;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
}

export interface PopularQuestion {
  question: string;
  count: number;
}

export interface TemporalData {
  weekdayData: { weekday: string; count: number }[];
  hourData: { hour: number; count: number }[];
  heatmapData: {
    weekday: number;
    weekdayLabel: string;
    hours: { hour: number; count: number }[];
  }[];
  timeOfDayData: { period: string; count: number }[];
  totalMessages: number;
}

export interface AIInsights {
  sentimentData: { sentiment: string; count: number; percentage: number }[];
  categoryData: { category: string; count: number }[];
  urgencyData: { urgency: string; count: number }[];
  timelineData: { date: string; positive: number; neutral: number; negative: number }[];
  totalAnalyzed: number;
}

export interface ChatConfig {
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
  systemInstruction?: string;
  aiAnalysisEnabled?: boolean;
  createdAt: number;
}

export type TabType = "analytics" | "temporal" | "ai-insights" | "content" | "settings";
