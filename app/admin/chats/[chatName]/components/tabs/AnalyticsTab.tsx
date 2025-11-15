import { Activity, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type {
  ChatStats,
  FeedbackStats,
  MessageOverTime,
  ResponseTime,
  PopularQuestion,
  Session,
} from "../types/dashboard.types";
import ChatStatsGrid from "../stats/ChatStatsGrid";
import FeedbackStatsGrid from "../stats/FeedbackStatsGrid";
import ChartContainer from "../shared/ChartContainer";
import ChatSessionDetails from "@/components/ChatSessionDetails";

interface AnalyticsTabProps {
  stats: ChatStats;
  feedbackStats: FeedbackStats | null;
  messagesOverTime: MessageOverTime[];
  responseTimes: ResponseTime[];
  popularQuestions: PopularQuestion[];
  sessions: Session[];
}

export default function AnalyticsTab({
  stats,
  feedbackStats,
  messagesOverTime,
  responseTimes,
  popularQuestions,
  sessions,
}: AnalyticsTabProps) {
  return (
    <>
      {/* Stats Cards */}
      <ChatStatsGrid stats={stats} />

      {/* Feedback Stats Cards */}
      {feedbackStats && feedbackStats.totalFeedback > 0 && (
        <FeedbackStatsGrid feedbackStats={feedbackStats} />
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Messages Over Time */}
        {messagesOverTime.length > 0 && (
          <ChartContainer title="Nachrichten über Zeit" icon={Activity}>
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
          </ChartContainer>
        )}

        {/* Response Times */}
        {responseTimes.length > 0 && (
          <ChartContainer title="Response-Zeiten (ms)" icon={TrendingUp}>
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
          </ChartContainer>
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
  );
}
