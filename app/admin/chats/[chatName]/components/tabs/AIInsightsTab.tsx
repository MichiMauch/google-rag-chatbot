import { Smile, BarChart3, TrendingUp, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { AIInsights } from "../types/dashboard.types";
import ChartContainer from "../shared/ChartContainer";
import EmptyState from "../shared/EmptyState";
import SentimentStatsGrid from "../stats/SentimentStatsGrid";

interface AIInsightsTabProps {
  aiInsights: AIInsights | null;
}

export default function AIInsightsTab({ aiInsights }: AIInsightsTabProps) {
  if (!aiInsights || aiInsights.totalAnalyzed === 0) {
    return <EmptyState message="Keine AI-Analysedaten verfügbar. Stellen Sie Fragen im Chat, um Sentiment-Analysen zu generieren." />;
  }

  return (
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
  );
}
