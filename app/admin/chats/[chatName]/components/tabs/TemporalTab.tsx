import { BarChart3, Clock, Activity, TrendingUp } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { TemporalData } from "../types/dashboard.types";
import ChartContainer from "../shared/ChartContainer";
import EmptyState from "../shared/EmptyState";

interface TemporalTabProps {
  temporalData: TemporalData | null;
}

export default function TemporalTab({ temporalData }: TemporalTabProps) {
  if (!temporalData || temporalData.totalMessages === 0) {
    return <EmptyState message="Keine Daten für zeitliche Muster verfügbar (letzte 30 Tage)" />;
  }

  return (
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
  );
}
