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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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

interface TemporalData {
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

interface AIInsights {
  sentimentData: { sentiment: string; count: number; percentage: number }[];
  categoryData: { category: string; count: number }[];
  urgencyData: { urgency: string; count: number }[];
  timelineData: { date: string; positive: number; neutral: number; negative: number }[];
  totalAnalyzed: number;
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
  aiAnalysisEnabled?: boolean;
  createdAt: number;
}

type TabType = "analytics" | "temporal" | "ai-insights" | "settings";

export default function ChatDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatName = params.chatName as string;

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabType>(
    (tabParam === "settings" ? "settings" : tabParam === "temporal" ? "temporal" : tabParam === "ai-insights" ? "ai-insights" : "analytics") as TabType
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
  const [temporalData, setTemporalData] = useState<TemporalData | null>(null);
  const [aiInsights, setAIInsights] = useState<AIInsights | null>(null);

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
        const [statsRes, feedbackRes, sessionsRes, chartDataRes, configRes, temporalRes, aiInsightsRes] = await Promise.all([
          fetch(`/api/analytics/chat/${chatName}/stats`),
          fetch(`/api/analytics/chat/${chatName}/feedback`),
          fetch(`/api/analytics/chat/${chatName}/sessions?limit=50`),
          fetch(`/api/analytics/chat/${chatName}/chart-data?days=30`),
          fetch(`/api/chat-config/${chatName}`),
          fetch(`/api/analytics/chat/${chatName}/temporal?days=30`),
          fetch(`/api/analytics/chat/${chatName}/ai-insights?days=30`),
        ]);

        if (!statsRes.ok || !feedbackRes.ok || !sessionsRes.ok || !chartDataRes.ok || !configRes.ok || !temporalRes.ok || !aiInsightsRes.ok) {
          throw new Error("Fehler beim Laden der Chat-Daten");
        }

        const [statsData, feedbackData, sessionsData, chartData, configData, temporalDataResult, aiInsightsData] = await Promise.all([
          statsRes.json(),
          feedbackRes.json(),
          sessionsRes.json(),
          chartDataRes.json(),
          configRes.json(),
          temporalRes.json(),
          aiInsightsRes.json(),
        ]);

        setStats(statsData);
        setFeedbackStats(feedbackData);
        setSessions(sessionsData);
        setMessagesOverTime(chartData.messagesOverTime);
        setResponseTimes(chartData.responseTimes);
        setPopularQuestions(chartData.popularQuestions);
        setChatConfig(configData.config);
        setTemporalData(temporalDataResult);
        setAIInsights(aiInsightsData);
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
              onClick={() => handleTabChange("temporal")}
              className={`${
                activeTab === "temporal"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Clock className="w-4 h-4" />
              <span>Zeitliche Muster</span>
            </button>
            <button
              onClick={() => chatConfig?.aiAnalysisEnabled && handleTabChange("ai-insights")}
              disabled={!chatConfig?.aiAnalysisEnabled}
              title={!chatConfig?.aiAnalysisEnabled ? "AI-Analyse ist deaktiviert. Aktivieren Sie es in den Einstellungen." : ""}
              className={`${
                activeTab === "ai-insights"
                  ? "border-blue-500 text-blue-600"
                  : !chatConfig?.aiAnalysisEnabled
                  ? "border-transparent text-gray-400 cursor-not-allowed opacity-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>AI-Analyse</span>
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
        ) : activeTab === "temporal" ? (
          <>
            {temporalData && temporalData.totalMessages > 0 ? (
              <>
                {/* Temporal Analytics Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Weekday Chart */}
                  {temporalData.weekdayData && temporalData.weekdayData.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span>Aktivität nach Wochentag</span>
                      </h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={temporalData.weekdayData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="weekday" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Time of Day Pie Chart */}
                  {temporalData.timeOfDayData && temporalData.timeOfDayData.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <Clock className="w-5 h-5" />
                        <span>Aktivität nach Tageszeit</span>
                      </h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={temporalData.timeOfDayData}
                            dataKey="count"
                            nameKey="period"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {temporalData.timeOfDayData.map((entry, index) => {
                              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Hour Chart - Full Width */}
                {temporalData.hourData && temporalData.hourData.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Activity className="w-5 h-5" />
                      <span>Aktivität nach Stunde</span>
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={temporalData.hourData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" label={{ value: 'Stunde', position: 'insideBottom', offset: -5 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Heatmap: Weekday x Hour */}
                {temporalData.heatmapData && temporalData.heatmapData.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5" />
                      <span>Heatmap: Wochentag × Stunde</span>
                    </h2>
                    <div className="overflow-x-auto">
                      <div className="min-w-max">
                        {/* Hour labels */}
                        <div className="flex mb-1">
                          <div className="w-16"></div>
                          {Array.from({ length: 24 }, (_, i) => (
                            <div key={i} className="w-8 text-center text-xs text-gray-600">
                              {i}
                            </div>
                          ))}
                        </div>
                        {/* Heatmap rows */}
                        {temporalData.heatmapData.map((dayData) => {
                          const maxCount = Math.max(...dayData.hours.map(h => h.count), 1);
                          return (
                            <div key={dayData.weekday} className="flex mb-1">
                              <div className="w-16 text-sm text-gray-700 font-medium flex items-center">
                                {dayData.weekdayLabel}
                              </div>
                              {dayData.hours.map((hourData) => {
                                const intensity = hourData.count / maxCount;
                                const bgColor = hourData.count === 0
                                  ? 'bg-gray-100'
                                  : `bg-blue-${Math.ceil(intensity * 5) * 100}`;
                                return (
                                  <div
                                    key={hourData.hour}
                                    className={`w-8 h-8 m-0.5 rounded ${bgColor} flex items-center justify-center text-xs font-semibold`}
                                    style={{
                                      backgroundColor: hourData.count === 0
                                        ? '#f3f4f6'
                                        : `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`
                                    }}
                                    title={`${dayData.weekdayLabel} ${hourData.hour}:00 - ${hourData.count} Fragen`}
                                  >
                                    {hourData.count > 0 && (
                                      <span className="text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                        {hourData.count}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-sm text-center py-8">
                  Keine Daten für zeitliche Muster verfügbar (letzte 30 Tage)
                </p>
              </div>
            )}
          </>
        ) : activeTab === "ai-insights" ? (
          <>
            {aiInsights && aiInsights.totalAnalyzed > 0 ? (
              <>
                {/* Sentiment Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {aiInsights.sentimentData.map((item, index) => {
                    const colors = {
                      Positiv: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
                      Neutral: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
                      Negativ: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
                    };
                    const color = colors[item.sentiment as keyof typeof colors];
                    return (
                      <div key={index} className={`${color.bg} border ${color.border} rounded-lg shadow p-6`}>
                        <h3 className={`text-sm font-medium ${color.text} mb-2`}>{item.sentiment}</h3>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-3xl font-bold ${color.text}`}>{item.count}</span>
                          <span className={`text-lg ${color.text}`}>({item.percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Sentiment Pie Chart */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Smile className="w-5 h-5" />
                      <span>Sentiment-Verteilung</span>
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={aiInsights.sentimentData} dataKey="count" nameKey="sentiment" cx="50%" cy="50%" outerRadius={100} label>
                          {aiInsights.sentimentData.map((entry, index) => {
                            const colors = { Positiv: "#10b981", Neutral: "#3b82f6", Negativ: "#ef4444" };
                            return <Cell key={`cell-${index}`} fill={colors[entry.sentiment as keyof typeof colors]} />;
                          })}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Bar Chart */}
                  {aiInsights.categoryData.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span>Top Kategorien</span>
                      </h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={aiInsights.categoryData.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8b5cf6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Timeline Chart */}
                {aiInsights.timelineData.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5" />
                      <span>Sentiment über Zeit</span>
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={aiInsights.timelineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="positive" stroke="#10b981" name="Positiv" strokeWidth={2} />
                        <Line type="monotone" dataKey="neutral" stroke="#3b82f6" name="Neutral" strokeWidth={2} />
                        <Line type="monotone" dataKey="negative" stroke="#ef4444" name="Negativ" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Urgency Bar Chart */}
                {aiInsights.urgencyData.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>Dringlichkeit</span>
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={aiInsights.urgencyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="urgency" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-sm text-center py-8">
                  Keine AI-Analysedaten verfügbar. Stellen Sie Fragen im Chat, um Sentiment-Analysen zu generieren.
                </p>
              </div>
            )}
          </>
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
                <p className="text-sm text-gray-600">Fragen</p>
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
