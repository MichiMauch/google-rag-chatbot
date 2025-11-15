import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  iconColor: string;
  value: string | number;
  label: string;
  subtitle?: string;
  valueColor?: string;
  bgColor?: string;
  borderColor?: string;
}

export default function StatsCard({
  icon: Icon,
  iconColor,
  value,
  label,
  subtitle,
  valueColor = "text-gray-900",
  bgColor = "bg-white",
  borderColor,
}: StatsCardProps) {
  return (
    <div
      className={`${bgColor} rounded-lg shadow p-6 ${borderColor ? `border-2 ${borderColor}` : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <span className={`text-2xl font-bold ${valueColor}`}>{value}</span>
      </div>
      <p className="text-sm text-gray-600">{label}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
