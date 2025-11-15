import { Users, MessageSquare, Clock, AlertCircle } from "lucide-react";
import StatsCard from "../shared/StatsCard";
import type { ChatStats } from "../types/dashboard.types";

interface ChatStatsGridProps {
  stats: ChatStats;
}

export default function ChatStatsGrid({ stats }: ChatStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatsCard
        icon={Users}
        iconColor="text-blue-500"
        value={stats.totalSessions}
        label="Sessions"
        subtitle={`${stats.activeSessions} aktiv (24h)`}
      />

      <StatsCard
        icon={MessageSquare}
        iconColor="text-green-500"
        value={stats.totalMessages}
        label="Fragen"
      />

      <StatsCard
        icon={Clock}
        iconColor="text-purple-500"
        value={stats.avgResponseTime ? `${(stats.avgResponseTime / 1000).toFixed(2)}s` : "-"}
        label="⌀ Antwortzeit"
      />

      <StatsCard
        icon={AlertCircle}
        iconColor={stats.errorRate > 5 ? "text-red-500" : "text-orange-500"}
        value={`${stats.errorRate.toFixed(1)}%`}
        valueColor={stats.errorRate > 5 ? "text-red-600" : "text-gray-900"}
        label="Fehlerrate"
        subtitle={`${stats.errorCount} Fehler`}
      />
    </div>
  );
}
