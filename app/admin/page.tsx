"use client";

import { useEffect, useState } from "react";
import { Loader2, HardDrive, Database, Trash2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

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

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingStore, setDeletingStore] = useState<string | null>(null);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/stores");
      if (!response.ok) {
        throw new Error("Fehler beim Laden der Stores");
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error("Error loading stats:", err);
      setError(err.message || "Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  }

  async function deleteStore(storeName: string, displayName: string) {
    if (!confirm(`Möchtest du "${displayName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    setDeletingStore(storeName);
    const loadingToast = toast.loading(`Lösche "${displayName}"...`);

    try {
      const response = await fetch("/api/admin/stores", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storeName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Löschen");
      }

      toast.success(`"${displayName}" wurde erfolgreich gelöscht`, {
        id: loadingToast,
      });

      // Reload stats after successful deletion
      await loadStats();
    } catch (err: any) {
      console.error("Error deleting store:", err);
      toast.error(err.message || "Fehler beim Löschen des Stores", {
        id: loadingToast,
        duration: 6000,
      });
    } finally {
      setDeletingStore(null);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

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
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Verwaltung der File Search Stores</p>
        </div>

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
                        <button
                          onClick={() => deleteStore(store.name, store.displayName)}
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
      </div>
    </div>
  );
}
