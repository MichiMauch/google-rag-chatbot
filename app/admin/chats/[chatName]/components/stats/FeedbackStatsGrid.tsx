import { ThumbsUp, ThumbsDown, Smile } from "lucide-react";
import StatsCard from "../shared/StatsCard";
import type { FeedbackStats } from "../types/dashboard.types";

interface FeedbackStatsGridProps {
  feedbackStats: FeedbackStats;
}

export default function FeedbackStatsGrid({ feedbackStats }: FeedbackStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <StatsCard
        icon={ThumbsUp}
        iconColor="text-green-500"
        value={feedbackStats.thumbsUp}
        valueColor="text-green-600"
        label="Thumbs Up"
      />

      <StatsCard
        icon={ThumbsDown}
        iconColor="text-red-500"
        value={feedbackStats.thumbsDown}
        valueColor="text-red-600"
        label="Thumbs Down"
      />

      <StatsCard
        icon={Smile}
        iconColor="text-blue-500"
        value={`${feedbackStats.satisfactionScore}%`}
        valueColor="text-blue-600"
        label="Zufriedenheit"
        subtitle={`${feedbackStats.totalFeedback} Bewertungen`}
      />
    </div>
  );
}
