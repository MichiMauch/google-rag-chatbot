import { BarChart3, Clock, TrendingUp, Settings } from "lucide-react";
import { TabType } from "../types/dashboard.types";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  aiAnalysisEnabled: boolean;
}

export default function TabNavigation({
  activeTab,
  onTabChange,
  aiAnalysisEnabled,
}: TabNavigationProps) {
  return (
    <div className="mb-6 border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange("analytics")}
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
          onClick={() => onTabChange("temporal")}
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
          onClick={() => aiAnalysisEnabled && onTabChange("ai-insights")}
          disabled={!aiAnalysisEnabled}
          title={
            !aiAnalysisEnabled
              ? "AI-Analyse ist deaktiviert. Aktivieren Sie es in den Einstellungen."
              : ""
          }
          className={`${
            activeTab === "ai-insights"
              ? "border-blue-500 text-blue-600"
              : !aiAnalysisEnabled
              ? "border-transparent text-gray-400 cursor-not-allowed opacity-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>AI-Analyse</span>
        </button>

        <button
          onClick={() => onTabChange("settings")}
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
  );
}
