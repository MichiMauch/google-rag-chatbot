"use client";

import { useState } from "react";
import { Globe, Loader2, CheckCircle, XCircle } from "lucide-react";

interface WebsiteImportProps {
  onFilesImported: (files: any[]) => void;
}

export default function WebsiteImport({ onFilesImported }: WebsiteImportProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    filesUploaded: number;
    totalScraped: number;
  } | null>(null);

  async function handleImport() {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/scrape-website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Importieren");
      }

      setSuccess({
        filesUploaded: data.filesUploaded,
        totalScraped: data.totalScraped,
      });

      // Notify parent component
      onFilesImported(data.files);

      // Clear URL on success
      setUrl("");
    } catch (err: any) {
      setError(err.message || "Fehler beim Importieren der Website");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleImport();
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
        <div className="flex items-center space-x-2 mb-3">
          <Globe className="w-5 h-5 text-blue-500" />
          <h3 className="font-medium text-gray-900">Website importieren</h3>
        </div>

        <div className="space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://beispiel.de"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />

          <button
            onClick={handleImport}
            disabled={!url.trim() || loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importiere Website...</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>Website importieren</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500">
            Automatische Erkennung von sitemap.xml. Max. 50 Seiten werden
            importiert.
          </p>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900">
              Website erfolgreich importiert
            </p>
            <p className="text-xs text-green-700 mt-1">
              {success.filesUploaded} von {success.totalScraped} Seiten wurden
              indexiert
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Fehler</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
