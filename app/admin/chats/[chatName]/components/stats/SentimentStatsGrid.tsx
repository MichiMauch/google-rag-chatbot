import type { AIInsights } from "../types/dashboard.types";

interface SentimentStatsGridProps {
  sentimentData: AIInsights["sentimentData"];
}

export default function SentimentStatsGrid({ sentimentData }: SentimentStatsGridProps) {
  const colors = {
    Positiv: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    Neutral: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    Negativ: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {sentimentData.map((item, index) => {
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
  );
}
