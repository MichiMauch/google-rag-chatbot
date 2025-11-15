import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface ChartContainerProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  height?: number;
  className?: string;
}

export default function ChartContainer({
  title,
  icon: Icon,
  children,
  height = 300,
  className = "",
}: ChartContainerProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
        <Icon className="w-5 h-5" />
        <span>{title}</span>
      </h2>
      {children}
    </div>
  );
}
