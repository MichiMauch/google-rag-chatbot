"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, HardDrive, Database, Trash2, BarChart3, BarChart, RefreshCw, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import StreamingLogModal from "@/components/StreamingLogModal";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import ContentUpdateManager from "@/components/ContentUpdateManager";
import UpdateHistoryTable from "@/components/UpdateHistoryTable";

interface FileSearchStore {
  name: string;
  displayName: string;
  createTime: string;
  updateTime: string;
  activeDocumentsCount: string;
  sizeBytes: string;
}

interface StoreStats {
  stores: FileSearchStore[];
  totalStores: number;
  totalFiles: number;
  totalSizeMB: number;
  availableMB: number;
  usagePercent: number;
}

// Log event types (matching backend)
type LogEvent =
  | { type: "info"; message: string }
  | { type: "batch_start"; batch: number }
  | { type: "progress"; current: number; total: number; message: string }
  | { type: "batch_complete"; batch: number; deleted: number; total: number }
  | { type: "error"; message: string }
  | { type: "complete"; deletedCount: number; errorCount: number }
  | { type: "store_deleted"; message: string };

type TabType = "stores" | "analytics" | "updates";

interface ChatConfig {
  chatName: string;
  displayName: string;
  uploadType: string;
  sitemapUrls?: string[];
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>("stores");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [chatConfigs, setChatConfigs] = useState<ChatConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingStore, setDeletingStore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ name: string; displayName: string; fileCount: number } | null>(null);

  // Live deletion log state
  const [showDeletionLog, setShowDeletionLog] = useState(false);
  const [deletionLogs, setDeletionLogs] = useState<string[]>([]);
  const [deletionProgress, setDeletionProgress] = useState({ current: 0, total: 0 });
  const [deletionComplete, setDeletionComplete] = useState(false);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);

      // Load both stores and chat configs in parallel
      const [storesResponse, configsResponse] = await Promise.all([
        fetch("/api/admin/stores"),
        fetch("/api/chat-configs"),
      ]);

      if (!storesResponse.ok) {
        throw new Error("Fehler beim Laden der Stores");
      }

      const storesData = await storesResponse.json();
      setStats(storesData);

      if (configsResponse.ok) {
        const configsData = await configsResponse.json();
        setChatConfigs(configsData);
      }
    } catch (err: any) {
      console.error("Error loading stats:", err);
      setError(err.message || "Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick(storeName: string, displayName: string, fileCount: number) {
    setConfirmDelete({ name: storeName, displayName, fileCount });
  }

  async function confirmDeleteStore() {
    if (!confirmDelete) return;

    const { name: storeName, displayName } = confirmDelete;
    const chatName = getChatNameFromStore(displayName);

    setConfirmDelete(null);
    setDeletingStore(storeName);

    // Reset and show live log modal
    setDeletionLogs([]);
    setDeletionProgress({ current: 0, total: 0 });
    setDeletionComplete(false);
    setShowDeletionLog(true);

    try {
      setDeletionLogs((prev) => [...prev, `🗑️ Lösche Chat "${chatName}"...`]);

      const response = await fetch("/api/delete-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatName,
          fileSearchStoreName: storeName
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Löschen");
      }

      const data = await response.json();

      // Add log messages for each step
      setDeletionLogs((prev) => [...prev, `✅ File Search Store gelöscht`]);
      setDeletionLogs((prev) => [...prev, `✅ Datenbank-Konfiguration gelöscht`]);
      setDeletionLogs((prev) => [...prev, `\n🎉 ${data.message}`]);
      setDeletionComplete(true);

      // Reload stats after successful deletion
      await loadStats();
      toast.success(`"${displayName}" wurde erfolgreich gelöscht`);
    } catch (err: any) {
      console.error("Error deleting store:", err);
      setDeletionLogs((prev) => [...prev, `\n❌ Fehler: ${err.message}`]);
      toast.error(err.message || "Fehler beim Löschen des Stores", {
        duration: 6000,
      });
    } finally {
      setDeletingStore(null);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  // Helper function to get chat name from store display name
  // Store displayName format is: "chatName - displayName"
  // We need to extract just the chatName part
  function getChatNameFromStore(storeDisplayName: string): string {
    // Extract the store name from the full name (format: fileSearchStores/chatName-displayName-xxxx)
    // But we can also parse it from the displayName which has format: "chatName - displayName"
    const parts = storeDisplayName.split(' - ');
    return parts[0]; // Return just the chatName part
  }

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (showDeletionLog && deletionLogs.length > 0) {
      const logContainer = document.querySelector('.streaming-log-container');
      if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
  }, [deletionLogs, showDeletionLog]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Lade Storage-Daten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Fehler</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadStats}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Verwaltung und Analyse</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("stores")}
              className={`${
                activeTab === "stores"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Database className="w-4 h-4" />
              <span>File Search Stores</span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`${
                activeTab === "analytics"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Chat Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab("updates")}
              className={`${
                activeTab === "updates"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Content Updates</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "analytics" ? (
          <AnalyticsDashboard />
        ) : activeTab === "updates" ? (
          <>
            {/* Content Updates Tab */}
            <div className="space-y-8">
              {chatConfigs.filter(config => config.sitemapUrls && config.sitemapUrls.length > 0).length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <p className="text-yellow-800">
                    Keine Chats mit konfigurierten Sitemap URLs gefunden.
                  </p>
                  <p className="text-sm text-yellow-600 mt-2">
                    Nur Website-basierte Chats können automatisch aktualisiert werden.
                  </p>
                </div>
              ) : (
                chatConfigs
                  .filter(config => config.sitemapUrls && config.sitemapUrls.length > 0)
                  .map((config) => (
                    <div key={config.chatName} className="space-y-6">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {config.displayName}
                      </h2>
                      {config.sitemapUrls!.map((sitemapUrl, index) => (
                        <ContentUpdateManager
                          key={`${config.chatName}-${index}`}
                          chatName={config.chatName}
                          sitemapUrl={sitemapUrl}
                        />
                      ))}
                      <UpdateHistoryTable chatName={config.chatName} limit={10} />
                      <hr className="border-gray-200" />
                    </div>
                  ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* Stores Tab Content */}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold text-gray-900">{stats.totalStores}</span>
            </div>
            <p className="text-sm text-gray-600">Stores</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <HardDrive className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold text-gray-900">{stats.totalFiles}</span>
            </div>
            <p className="text-sm text-gray-600">Dateien</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <HardDrive className="w-5 h-5 text-purple-500" />
              <span className="text-2xl font-bold text-gray-900">{stats.totalSizeMB.toFixed(2)} MB</span>
            </div>
            <p className="text-sm text-gray-600">Belegt</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <HardDrive className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-bold text-gray-900">{stats.usagePercent.toFixed(2)}%</span>
            </div>
            <p className="text-sm text-gray-600">Auslastung</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Storage Usage</h2>
            <span className="text-sm text-gray-600">
              {stats.totalSizeMB.toFixed(2)} MB / 1024 MB
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full transition-all ${
                stats.usagePercent > 80
                  ? "bg-red-500"
                  : stats.usagePercent > 50
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${Math.min(stats.usagePercent, 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {stats.availableMB.toFixed(2)} MB verfügbar (Free Tier: 1 GB)
          </p>
        </div>

        {/* Stores Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">File Search Stores</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Erstellt
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dateien
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Größe
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.stores.map((store) => {
                  const fileCount = parseInt(store.activeDocumentsCount || "0");
                  const sizeBytes = parseInt(store.sizeBytes || "0");
                  const sizeMB = sizeBytes / (1024 * 1024);

                  return (
                    <tr key={store.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {store.displayName}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {store.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(store.createTime).toLocaleString("de-DE")}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {fileCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {sizeBytes > 0 ? (
                          <>
                            {sizeMB.toFixed(2)} MB
                            <div className="text-xs text-gray-500">
                              {sizeBytes.toLocaleString("de-DE")} Bytes
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <Link
                            href={`/admin/chats/${encodeURIComponent(getChatNameFromStore(store.displayName))}`}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center space-x-1"
                            title="Analytics anzeigen"
                          >
                            <BarChart className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/chats/${encodeURIComponent(getChatNameFromStore(store.displayName))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-900 inline-flex items-center space-x-1"
                            title="Chat öffnen"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(store.name, store.displayName, fileCount)}
                            disabled={deletingStore === store.name}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-1"
                            title="Store löschen"
                          >
                            {deletingStore === store.name ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={loadStats}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Aktualisieren
          </button>
        </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Store löschen?
            </h3>
            <p className="text-gray-600 mb-6">
              Möchtest du <span className="font-semibold">"{confirmDelete.displayName}"</span> wirklich löschen?
              {confirmDelete.fileCount > 0 && (
                <span className="block mt-2 text-orange-600 font-medium">
                  Achtung: Dieser Store enthält {confirmDelete.fileCount} Datei(en), die ebenfalls gelöscht werden.
                </span>
              )}
              <span className="block mt-2 text-sm">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </span>
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmDeleteStore}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Deletion Log Modal */}
      <StreamingLogModal
        isOpen={showDeletionLog}
        title="Store wird gelöscht..."
        logs={deletionLogs}
        progress={deletionProgress}
        isComplete={deletionComplete}
        onClose={() => setShowDeletionLog(false)}
      />
    </div>
  );
}
