"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  Users,
  Clock,
  AlertCircle,
  TrendingUp,
  Activity,
  Settings,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Smile,
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
import ChatProfileSettings from "@/components/ChatProfileSettings";

interface ChatStats {
  totalSessions: number;
  totalMessages: number;
  activeSessions: number;
  avgResponseTime: number;
  errorCount: number;
  errorRate: number;
}

interface FeedbackStats {
  thumbsUp: number;
  thumbsDown: number;
  totalFeedback: number;
  satisfactionScore: number;
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

interface ChatConfig {
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
  createdAt: number;
}

type TabType = "analytics" | "settings";

export default function ChatDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatName = params.chatName as string;

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabType>(
    (tabParam === "settings" ? "settings" : "analytics") as TabType
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messagesOverTime, setMessagesOverTime] = useState<MessageOverTime[]>([]);
  const [responseTimes, setResponseTimes] = useState<ResponseTime[]>([]);
  const [popularQuestions, setPopularQuestions] = useState<PopularQuestion[]>([]);
  const [chatConfig, setChatConfig] = useState<ChatConfig | null>(null);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url.toString());
  };

  useEffect(() => {
    async function loadChatData() {
      if (!chatName) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [statsRes, feedbackRes, sessionsRes, chartDataRes, configRes] = await Promise.all([
          fetch(`/api/analytics/chat/${chatName}/stats`),
          fetch(`/api/analytics/chat/${chatName}/feedback`),
          fetch(`/api/analytics/chat/${chatName}/sessions?limit=50`),
          fetch(`/api/analytics/chat/${chatName}/chart-data?days=30`),
          fetch(`/api/chat-config/${chatName}`),
        ]);

        if (!statsRes.ok || !feedbackRes.ok || !sessionsRes.ok || !chartDataRes.ok || !configRes.ok) {
          throw new Error("Fehler beim Laden der Chat-Daten");
        }

        const [statsData, feedbackData, sessionsData, chartData, configData] = await Promise.all([
          statsRes.json(),
          feedbackRes.json(),
          sessionsRes.json(),
          chartDataRes.json(),
          configRes.json(),
        ]);

        setStats(statsData);
        setFeedbackStats(feedbackData);
        setSessions(sessionsData);
        setMessagesOverTime(chartData.messagesOverTime);
        setResponseTimes(chartData.responseTimes);
        setPopularQuestions(chartData.popularQuestions);
        setChatConfig(configData.config);
      } catch (err: any) {
        console.error("Error loading chat data:", err);
        setError(err.message || "Ein Fehler ist aufgetreten");
      } finally {
        setLoading(false);
      }
    }

    loadChatData();
  }, [chatName]);

  // Reload config when settings are updated
  const handleConfigUpdate = async () => {
    try {
      const configRes = await fetch(`/api/chat-config/${chatName}`);
      if (configRes.ok) {
        const configData = await configRes.json();
        setChatConfig(configData.config);
      }
    } catch (error) {
      console.error("Error reloading config:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Lade Chat-Daten...</p>
        </div>
      </div>
    );
  }

  if (error || !stats || !chatConfig) {
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
        <div className="mb-6">
          <button
            onClick={() => router.push("/admin")}
            className="mb-4 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zum Admin</span>
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {chatConfig.displayName}
          </h1>
          <p className="text-gray-600">Chat-Name: {decodeURIComponent(chatName)}</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange("analytics")}
              className={`${
                activeTab === "analytics"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => handleTabChange("settings")}
              className={`${
                activeTab === "settings"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Settings className="w-4 h-4" />
              <span>Einstellungen</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "settings" ? (
          <ChatProfileSettings
            chatName={chatName}
            initialConfig={chatConfig}
            onConfigUpdate={handleConfigUpdate}
          />
        ) : (
          <>
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

            {/* Feedback Stats Cards */}
            {feedbackStats && feedbackStats.totalFeedback > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <ThumbsUp className="w-5 h-5 text-green-500" />
                    <span className="text-2xl font-bold text-green-600">{feedbackStats.thumbsUp}</span>
                  </div>
                  <p className="text-sm text-gray-600">Thumbs Up</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <ThumbsDown className="w-5 h-5 text-red-500" />
                    <span className="text-2xl font-bold text-red-600">{feedbackStats.thumbsDown}</span>
                  </div>
                  <p className="text-sm text-gray-600">Thumbs Down</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Smile className="w-5 h-5 text-blue-500" />
                    <span className="text-2xl font-bold text-blue-600">{feedbackStats.satisfactionScore}%</span>
                  </div>
                  <p className="text-sm text-gray-600">Zufriedenheit</p>
                  <p className="text-xs text-gray-500 mt-1">{feedbackStats.totalFeedback} Bewertungen</p>
                </div>
              </div>
            )}

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
          </>
        )}
      </div>
    </div>
  );
}
