import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  message: string;
  icon?: LucideIcon;
}

export default function EmptyState({ message, icon: Icon }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col items-center justify-center py-8">
        {Icon && <Icon className="w-12 h-12 text-gray-400 mb-3" />}
        <p className="text-gray-500 text-sm text-center">{message}</p>
      </div>
    </div>
  );
}
