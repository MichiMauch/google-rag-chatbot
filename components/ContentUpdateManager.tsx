"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import StreamingLogModal from "./StreamingLogModal";

interface OutdatedPage {
  url: string;
  title?: string;
  lastScraped: number;
  sitemapLastMod?: number;
}

interface ContentUpdateManagerProps {
  chatName: string;
  sitemapUrl: string;
}

export default function ContentUpdateManager({ chatName, sitemapUrl }: ContentUpdateManagerProps) {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    totalPages: number;
    outdatedCount: number;
    outdatedPages: OutdatedPage[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Streaming log states
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isComplete, setIsComplete] = useState(false);

  // Auto-scroll logs
  useEffect(() => {
    if (showLog && logs.length > 0) {
      const container = document.querySelector(".streaming-log-container");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [logs, showLog]);

  const handleCheckUpdates = async () => {
    setChecking(true);
    setError(null);
    setCheckResult(null);

    try {
      const response = await fetch(
        `/api/admin/check-updates?chatName=${encodeURIComponent(chatName)}&sitemapUrl=${encodeURIComponent(sitemapUrl)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check for updates");
      }

      const data = await response.json();
      setCheckResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setChecking(false);
    }
  };

  const handleRunUpdate = async () => {
    setUpdating(true);
    setError(null);
    setShowLog(true);
    setLogs([]);
    setProgress({ current: 0, total: 0 });
    setIsComplete(false);

    try {
      const response = await fetch("/api/admin/update-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatName,
          sitemapUrl,
          triggeredBy: "admin-ui",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start update");
      }

      await processSSEStream(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsComplete(true);
    } finally {
      setUpdating(false);
    }
  };

  async function processSSEStream(response: Response) {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              handleStreamEvent(event);
            } catch (parseError) {
              console.error("Failed to parse SSE event:", parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  function handleStreamEvent(event: any) {
    switch (event.type) {
      case "info":
        if (event.message) {
          setLogs(prev => [...prev, event.message]);
        }
        break;

      case "progress":
        if (event.current && event.total) {
          setProgress({ current: event.current, total: event.total });
        }
        if (event.message) {
          setLogs(prev => [...prev, event.message]);
        }
        break;

      case "complete":
        if (event.message) {
          setLogs(prev => [...prev, event.message]);
        }
        setIsComplete(true);
        // Clear check result after successful update
        setCheckResult(null);
        break;

      case "error":
        if (event.message) {
          setLogs(prev => [...prev, event.message]);
        }
        setIsComplete(true);
        break;
    }
  }

  const handleCloseLog = () => {
    setShowLog(false);
    setLogs([]);
    setProgress({ current: 0, total: 0 });
    setIsComplete(false);
  };

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return "Nie";
    return new Date(timestamp).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Content Updates</h3>
          <button
            onClick={handleCheckUpdates}
            disabled={checking || updating}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Prüfe..." : "Updates prüfen"}
          </button>
        </div>

        {/* Sitemap URL Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Sitemap:</span>{" "}
            <a
              href={sitemapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {sitemapUrl}
            </a>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <XCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Fehler</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Check Results */}
        {checkResult && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Gesamt Seiten</p>
                <p className="text-2xl font-semibold text-gray-900">{checkResult.totalPages}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Veraltete Seiten</p>
                <p className="text-2xl font-semibold text-orange-600">{checkResult.outdatedCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Aktuell</p>
                <p className="text-2xl font-semibold text-green-600">
                  {checkResult.totalPages - checkResult.outdatedCount}
                </p>
              </div>
            </div>

            {/* Update Button */}
            {checkResult.outdatedCount > 0 && (
              <button
                onClick={handleRunUpdate}
                disabled={updating}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${updating ? "animate-spin" : ""}`} />
                {updating
                  ? "Update läuft..."
                  : `${checkResult.outdatedCount} Seite(n) aktualisieren`}
              </button>
            )}

            {checkResult.outdatedCount === 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <p className="text-sm text-green-800">Alle Seiten sind aktuell!</p>
              </div>
            )}

            {/* Outdated Pages List */}
            {checkResult.outdatedPages.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">Veraltete Seiten</h4>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Seite
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Letzter Scrape
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sitemap Änderung
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {checkResult.outdatedPages.map((page, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <AlertCircle className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {page.title || "Unbekannt"}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{page.url}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(page.lastScraped)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {page.sitemapLastMod ? formatDate(page.sitemapLastMod) : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Streaming Log Modal */}
      <StreamingLogModal
        isOpen={showLog}
        title="Content wird aktualisiert..."
        logs={logs}
        progress={progress}
        isComplete={isComplete}
        onClose={handleCloseLog}
      />
    </>
  );
}
