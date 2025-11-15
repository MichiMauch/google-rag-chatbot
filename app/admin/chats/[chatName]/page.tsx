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
  ThumbsUp,
  ThumbsDown,
  Smile,
  BarChart3,
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
import ChatProfileSettings from "@/components/ChatProfileSettings";
import AnalyticsTab from "./components/tabs/AnalyticsTab";

// Import types
import type {
  ChatStats,
  FeedbackStats,
  Session,
  MessageOverTime,
  ResponseTime,
  PopularQuestion,
  TemporalData,
  AIInsights,
  ChatConfig,
  TabType,
} from "./components/types/dashboard.types";

// Import shared components
import StatsCard from "./components/shared/StatsCard";
import ChartContainer from "./components/shared/ChartContainer";
import EmptyState from "./components/shared/EmptyState";
import TabNavigation from "./components/shared/TabNavigation";

// Import stats grid components
import ChatStatsGrid from "./components/stats/ChatStatsGrid";
import FeedbackStatsGrid from "./components/stats/FeedbackStatsGrid";
import SentimentStatsGrid from "./components/stats/SentimentStatsGrid";

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
        <TabNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          aiAnalysisEnabled={chatConfig?.aiAnalysisEnabled ?? false}
        />

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
                    <ChartContainer title="Aktivität nach Wochentag" icon={BarChart3}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={temporalData.weekdayData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="weekday" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}

                  {/* Time of Day Pie Chart */}
                  {temporalData.timeOfDayData && temporalData.timeOfDayData.length > 0 && (
                    <ChartContainer title="Aktivität nach Tageszeit" icon={Clock}>
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
                    </ChartContainer>
                  )}
                </div>

                {/* Hour Chart - Full Width */}
                {temporalData.hourData && temporalData.hourData.length > 0 && (
                  <ChartContainer title="Aktivität nach Stunde" icon={Activity} className="mb-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={temporalData.hourData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" label={{ value: 'Stunde', position: 'insideBottom', offset: -5 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}

                {/* Heatmap: Weekday x Hour */}
                {temporalData.heatmapData && temporalData.heatmapData.length > 0 && (
                  <ChartContainer title="Heatmap: Wochentag × Stunde" icon={TrendingUp}>
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
                  </ChartContainer>
                )}
              </>
            ) : (
              <EmptyState message="Keine Daten für zeitliche Muster verfügbar (letzte 30 Tage)" />
            )}
          </>
        ) : activeTab === "ai-insights" ? (
          <>
            {aiInsights && aiInsights.totalAnalyzed > 0 ? (
              <>
                {/* Sentiment Stats Cards */}
                <SentimentStatsGrid sentimentData={aiInsights.sentimentData} />

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Sentiment Pie Chart */}
                  <ChartContainer title="Sentiment-Verteilung" icon={Smile}>
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
                  </ChartContainer>

                  {/* Category Bar Chart */}
                  {aiInsights.categoryData.length > 0 && (
                    <ChartContainer title="Top Kategorien" icon={BarChart3}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={aiInsights.categoryData.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8b5cf6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </div>

                {/* Timeline Chart */}
                {aiInsights.timelineData.length > 0 && (
                  <ChartContainer title="Sentiment über Zeit" icon={TrendingUp} className="mb-6">
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
                  </ChartContainer>
                )}

                {/* Urgency Bar Chart */}
                {aiInsights.urgencyData.length > 0 && (
                  <ChartContainer title="Dringlichkeit" icon={AlertCircle}>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={aiInsights.urgencyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="urgency" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </>
            ) : (
              <EmptyState message="Keine AI-Analysedaten verfügbar. Stellen Sie Fragen im Chat, um Sentiment-Analysen zu generieren." />
            )}
          </>
        ) : (
          <AnalyticsTab
            stats={stats}
            feedbackStats={feedbackStats}
            messagesOverTime={messagesOverTime}
            responseTimes={responseTimes}
            popularQuestions={popularQuestions}
            sessions={sessions}
          />
        )}
      </div>
    </div>
  );
}
