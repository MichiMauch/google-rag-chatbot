"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

interface PageUpdateLog {
  id: string;
  url: string;
  pageTitle?: string;
  action: "created" | "updated" | "unchanged" | "error";
  oldLastMod?: number;
  newLastMod?: number;
  errorMessage?: string;
  createdAt: number;
}

interface UpdateRecord {
  id: string;
  chatName: string;
  triggeredBy: string;
  status: "pending" | "running" | "completed" | "failed";
  totalPages?: number;
  checkedPages?: number;
  updatedPages?: number;
  unchangedPages?: number;
  errorPages?: number;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  error?: string;
  createdAt: number;
  logs: PageUpdateLog[];
}

interface UpdateHistoryTableProps {
  chatName: string;
  limit?: number;
}

export default function UpdateHistoryTable({ chatName, limit = 20 }: UpdateHistoryTableProps) {
  const [updates, setUpdates] = useState<UpdateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
    // Set up auto-refresh every 10 seconds
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, [chatName]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(
        `/api/admin/update-history?chatName=${encodeURIComponent(chatName)}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch update history");
      }

      const data = await response.json();
      setUpdates(data.updates || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "running":
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case "pending":
        return <Clock className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case "completed":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "failed":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "running":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "pending":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return baseClasses;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "created":
        return "bg-blue-100 text-blue-800";
      case "updated":
        return "bg-green-100 text-green-800";
      case "unchanged":
        return "bg-gray-100 text-gray-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-gray-500">Lade Update-Historie...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start">
          <XCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Fehler beim Laden</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-gray-500 text-center">Noch keine Updates durchgeführt</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Update Historie</h3>
      </div>

      <div className="divide-y divide-gray-200">
        {updates.map((update) => (
          <div key={update.id} className="hover:bg-gray-50">
            {/* Update Header */}
            <button
              onClick={() => setExpandedId(expandedId === update.id ? null : update.id)}
              className="w-full px-4 py-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-4 flex-1">
                {getStatusIcon(update.status)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={getStatusBadge(update.status)}>{update.status}</span>
                    <span className="text-xs text-gray-500 font-mono">{update.id}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Gestartet:</span>{" "}
                      <span className="text-gray-900">{formatDate(update.startedAt)}</span>
                    </div>
                    {update.completedAt && (
                      <div>
                        <span className="text-gray-500">Dauer:</span>{" "}
                        <span className="text-gray-900">{formatDuration(update.durationMs)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Aktualisiert:</span>{" "}
                      <span className="text-green-600 font-medium">
                        {update.updatedPages || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Fehler:</span>{" "}
                      <span className={update.errorPages ? "text-red-600 font-medium" : "text-gray-900"}>
                        {update.errorPages || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  {expandedId === update.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </button>

            {/* Expanded Details */}
            {expandedId === update.id && (
              <div className="px-4 pb-4 bg-gray-50">
                {/* Error Message */}
                {update.error && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start">
                      <AlertTriangle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Fehler</p>
                        <p className="text-sm text-red-700 mt-1">{update.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Page Logs */}
                {update.logs && update.logs.length > 0 && (
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="bg-white max-h-64 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Seite
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Aktion
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Zeit
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {update.logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {log.pageTitle || "Unbekannt"}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">{log.url}</p>
                                  {log.errorMessage && (
                                    <p className="text-xs text-red-600 mt-1">{log.errorMessage}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded ${getActionBadge(
                                    log.action
                                  )}`}
                                >
                                  {log.action}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500">
                                {formatDate(log.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(!update.logs || update.logs.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-3">Keine Detail-Logs vorhanden</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
