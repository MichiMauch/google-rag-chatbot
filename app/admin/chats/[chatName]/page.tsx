"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import ChatProfileSettings from "@/components/ChatProfileSettings";
import AnalyticsTab from "./components/tabs/AnalyticsTab";
import TemporalTab from "./components/tabs/TemporalTab";
import AIInsightsTab from "./components/tabs/AIInsightsTab";
import ContentTab from "./components/tabs/ContentTab";

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
import TabNavigation from "./components/shared/TabNavigation";

export default function ChatDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatName = params.chatName as string;

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabType>(
    (tabParam === "settings" ? "settings" :
     tabParam === "temporal" ? "temporal" :
     tabParam === "ai-insights" ? "ai-insights" :
     tabParam === "content" ? "content" :
     "analytics") as TabType
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
          <TemporalTab temporalData={temporalData} />
        ) : activeTab === "ai-insights" ? (
          <AIInsightsTab aiInsights={aiInsights} />
        ) : activeTab === "content" ? (
          <ContentTab
            chatName={chatName}
            chatConfig={{
              uploadType: chatConfig.uploadType,
              sitemapUrls: chatConfig.sitemapUrls,
            }}
          />
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
