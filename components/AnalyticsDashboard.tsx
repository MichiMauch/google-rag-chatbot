"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface DashboardStats {
  totalSessions: number;
  totalMessages: number;
  activeSessions: number;
  avgResponseTime: number;
}

interface TopChat {
  chatName: string;
  displayName: string;
  totalSessions: number;
  totalMessages: number;
  lastActivity: number;
}

interface RecentMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  chatName: string;
  displayName: string;
}

interface MessageOverTime {
  date: string;
  userMessages: number;
  botMessages: number;
  totalMessages: number;
}

interface PopularQuestion {
  question: string;
  count: number;
}

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topChats, setTopChats] = useState<TopChat[]>([]);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [messagesOverTime, setMessagesOverTime] = useState<MessageOverTime[]>([]);
  const [popularQuestions, setPopularQuestions] = useState<PopularQuestion[]>([]);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all analytics data in parallel
        const [statsRes, topChatsRes, recentMessagesRes, chartDataRes] = await Promise.all([
          fetch("/api/analytics/stats"),
          fetch("/api/analytics/top-chats?limit=10"),
          fetch("/api/analytics/recent-messages?limit=20"),
          fetch("/api/analytics/chart-data?days=30"),
        ]);

        if (!statsRes.ok || !topChatsRes.ok || !recentMessagesRes.ok || !chartDataRes.ok) {
          throw new Error("Fehler beim Laden der Analytics-Daten");
        }

        const [statsData, topChatsData, recentMessagesData, chartData] = await Promise.all([
          statsRes.json(),
          topChatsRes.json(),
          recentMessagesRes.json(),
          chartDataRes.json(),
        ]);

        setStats(statsData);
        setTopChats(topChatsData);
        setRecentMessages(recentMessagesData);
        setMessagesOverTime(chartData.messagesOverTime);
        setPopularQuestions(chartData.popularQuestions);
      } catch (err: any) {
        console.error("Error loading analytics:", err);
        setError(err.message || "Ein Fehler ist aufgetreten");
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Lade Analytics-Daten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h2 className="text-red-800 font-semibold mb-1">Fehler</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.totalSessions}</span>
          </div>
          <p className="text-sm text-gray-600">Sessions</p>
          <p className="text-xs text-gray-500 mt-1">{stats.activeSessions} aktiv (24h)</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.totalMessages}</span>
          </div>
          <p className="text-sm text-gray-600">Nachrichten</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-purple-500" />
            <span className="text-2xl font-bold text-gray-900">
              {stats.avgResponseTime ? `${(stats.avgResponseTime / 1000).toFixed(2)}s` : "-"}
            </span>
          </div>
          <p className="text-sm text-gray-600">⌀ Antwortzeit</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <span className="text-2xl font-bold text-gray-900">
              {stats.totalMessages > 0 ? (stats.totalMessages / Math.max(stats.totalSessions, 1)).toFixed(1) : "0"}
            </span>
          </div>
          <p className="text-sm text-gray-600">Nachrichten/Session</p>
        </div>
      </div>

      {/* Messages Over Time Chart */}
      {messagesOverTime.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nachrichten über Zeit (30 Tage)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={messagesOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="userMessages" stroke="#3b82f6" name="User" strokeWidth={2} />
              <Line type="monotone" dataKey="botMessages" stroke="#10b981" name="Bot" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Chats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Chats</h2>
          {topChats.length > 0 ? (
            <div className="space-y-2">
              {topChats.map((chat) => (
                <Link
                  key={chat.chatName}
                  href={`/admin/chats/${encodeURIComponent(chat.chatName)}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate group-hover:text-blue-700">{chat.displayName}</p>
                    <p className="text-sm text-gray-500">
                      {chat.totalSessions} Sessions · {chat.totalMessages} Nachrichten
                    </p>
                  </div>
                  <div className="ml-4 flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs text-gray-500">
                      {new Date(chat.lastActivity).toLocaleDateString("de-DE")}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Keine Daten vorhanden</p>
          )}
        </div>

        {/* Popular Questions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Häufigste Fragen</h2>
          {popularQuestions.length > 0 ? (
            <div className="space-y-2">
              {popularQuestions.slice(0, 5).map((q, index) => (
                <div key={index} className="pb-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-gray-700 flex-1 line-clamp-2">{q.question}</p>
                    <span className="ml-3 text-xs font-semibold text-blue-600 flex-shrink-0">
                      {q.count}x
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Keine Daten vorhanden</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Letzte Aktivitäten</h2>
        {recentMessages.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentMessages.map((message) => (
              <div key={message.id} className="flex space-x-3 pb-3 border-b border-gray-100 last:border-0">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === "user" ? "bg-blue-100" : "bg-green-100"
                  }`}
                >
                  {message.role === "user" ? (
                    <span className="text-blue-600 text-xs font-semibold">U</span>
                  ) : (
                    <span className="text-green-600 text-xs font-semibold">B</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{message.displayName}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(message.createdAt).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-1">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Keine Nachrichten vorhanden</p>
        )}
      </div>
    </div>
  );
}
