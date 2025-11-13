"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  Users,
  Clock,
  AlertCircle,
  TrendingUp,
  Activity,
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
} from "recharts";
import ChatSessionDetails from "@/components/ChatSessionDetails";

interface ChatStats {
  totalSessions: number;
  totalMessages: number;
  activeSessions: number;
  avgResponseTime: number;
  errorCount: number;
  errorRate: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  responseTimeMs?: number | null;
  sourcesUsed?: string | null;
  hadError?: number | null;
  errorMessage?: string | null;
}

interface Session {
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

interface MessageOverTime {
  date: string;
  userMessages: number;
  botMessages: number;
  totalMessages: number;
}

interface ResponseTime {
  date: string;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
}

interface PopularQuestion {
  question: string;
  count: number;
}

export default function ChatDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const chatName = params.chatName as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messagesOverTime, setMessagesOverTime] = useState<MessageOverTime[]>([]);
  const [responseTimes, setResponseTimes] = useState<ResponseTime[]>([]);
  const [popularQuestions, setPopularQuestions] = useState<PopularQuestion[]>([]);

  useEffect(() => {
    async function loadChatData() {
      if (!chatName) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [statsRes, sessionsRes, chartDataRes] = await Promise.all([
          fetch(`/api/analytics/chat/${chatName}/stats`),
          fetch(`/api/analytics/chat/${chatName}/sessions?limit=50`),
          fetch(`/api/analytics/chat/${chatName}/chart-data?days=30`),
        ]);

        if (!statsRes.ok || !sessionsRes.ok || !chartDataRes.ok) {
          throw new Error("Fehler beim Laden der Chat-Daten");
        }

        const [statsData, sessionsData, chartData] = await Promise.all([
          statsRes.json(),
          sessionsRes.json(),
          chartDataRes.json(),
        ]);

        setStats(statsData);
        setSessions(sessionsData);
        setMessagesOverTime(chartData.messagesOverTime);
        setResponseTimes(chartData.responseTimes);
        setPopularQuestions(chartData.popularQuestions);
      } catch (err: any) {
        console.error("Error loading chat data:", err);
        setError(err.message || "Ein Fehler ist aufgetreten");
      } finally {
        setLoading(false);
      }
    }

    loadChatData();
  }, [chatName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Lade Chat-Analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push("/admin")}
            className="mb-6 flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zum Admin</span>
          </button>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h2 className="text-red-800 font-semibold mb-1">Fehler</h2>
                <p className="text-red-600">{error || "Daten konnten nicht geladen werden"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin")}
            className="mb-4 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zum Admin</span>
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chat Analytics: {decodeURIComponent(chatName)}
          </h1>
          <p className="text-gray-600">Detaillierte Statistiken und Konversationen</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              <AlertCircle className={`w-5 h-5 ${stats.errorRate > 5 ? "text-red-500" : "text-orange-500"}`} />
              <span className={`text-2xl font-bold ${stats.errorRate > 5 ? "text-red-600" : "text-gray-900"}`}>
                {stats.errorRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-gray-600">Fehlerrate</p>
            <p className="text-xs text-gray-500 mt-1">{stats.errorCount} Fehler</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Messages Over Time */}
          {messagesOverTime.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Nachrichten über Zeit</span>
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={messagesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="userMessages" stroke="#3b82f6" name="User" strokeWidth={2} />
                  <Line type="monotone" dataKey="botMessages" stroke="#10b981" name="Bot" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Response Times */}
          {responseTimes.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Response-Zeiten (ms)</span>
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={responseTimes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avgResponseTime" stroke="#8b5cf6" name="⌀" strokeWidth={2} />
                  <Line type="monotone" dataKey="minResponseTime" stroke="#10b981" name="Min" strokeWidth={1} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="maxResponseTime" stroke="#ef4444" name="Max" strokeWidth={1} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Popular Questions */}
        {popularQuestions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Häufigste Fragen</h2>
            <div className="space-y-2">
              {popularQuestions.slice(0, 10).map((q, index) => (
                <div key={index} className="flex items-start justify-between pb-2 border-b border-gray-100 last:border-0">
                  <p className="text-sm text-gray-700 flex-1 line-clamp-2">{q.question}</p>
                  <span className="ml-4 text-xs font-semibold text-blue-600 flex-shrink-0 bg-blue-50 px-2 py-1 rounded">
                    {q.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Alle Sessions ({sessions.length})
          </h2>
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <ChatSessionDetails key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">
              Noch keine Sessions für diesen Chat
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
