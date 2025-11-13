"use client";

import { Loader2 } from "lucide-react";

interface StreamingLogModalProps {
  isOpen: boolean;
  title: string;
  logs: string[];
  progress: {
    current: number;
    total: number;
  };
  isComplete: boolean;
  onClose: () => void;
}

export default function StreamingLogModal({
  isOpen,
  title,
  logs,
  progress,
  isComplete,
  onClose,
}: StreamingLogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

          {/* Progress Bar */}
          {progress.total > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Fortschritt</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Log Display */}
        <div className="streaming-log-container flex-1 overflow-y-auto bg-gray-50 rounded-lg p-4 font-mono text-sm mb-4">
          {logs.map((log, index) => (
            <div key={index} className="mb-1 whitespace-pre-wrap">
              {log}
            </div>
          ))}
          {!isComplete && logs.length > 0 && (
            <div className="flex items-center space-x-2 text-blue-500 mt-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verarbeitung läuft...</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          {isComplete ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Schließen
            </button>
          ) : (
            <button
              disabled
              className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
            >
              Bitte warten...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
