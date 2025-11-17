"use client";

import { useState, useRef } from "react";
import ContentUpdateManager from "@/components/ContentUpdateManager";
import UpdateHistoryTable from "@/components/UpdateHistoryTable";
import { Plus, Upload, Globe, FileText, X, Loader2, Database } from "lucide-react";
import toast from "react-hot-toast";

interface ContentTabProps {
  chatName: string;
  chatConfig: {
    uploadType: "documents" | "website";
    sitemapUrls?: string[];
    apiUrls?: string[];
    files?: string;
  };
}

export default function ContentTab({ chatName, chatConfig }: ContentTabProps) {
  const [newSitemapUrl, setNewSitemapUrl] = useState("");
  const [isAddingSitemap, setIsAddingSitemap] = useState(false);
  const [showSitemapInput, setShowSitemapInput] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [newApiUrl, setNewApiUrl] = useState("");
  const [isAddingJsonApi, setIsAddingJsonApi] = useState(false);
  const [showJsonApiInput, setShowJsonApiInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddSitemap = async () => {
    if (!newSitemapUrl.trim()) {
      toast.error("Bitte geben Sie eine Sitemap-URL ein");
      return;
    }

    setIsAddingSitemap(true);
    setProgressLogs([]);
    setShowProgressModal(true);

    try {
      const response = await fetch("/api/admin/add-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatName,
          contentType: "sitemap",
          sitemapUrl: newSitemapUrl,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const event = JSON.parse(line.slice(6));
              if (event.message) {
                setProgressLogs((prev) => [...prev, event.message]);
              }
              if (event.type === "complete") {
                toast.success("Sitemap erfolgreich hinzugefügt!");
                setNewSitemapUrl("");
                setShowSitemapInput(false);
                // Reload page to show new sitemap
                setTimeout(() => window.location.reload(), 1500);
              } else if (event.type === "error") {
                toast.error("Fehler beim Hinzufügen der Sitemap");
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error adding sitemap:", error);
      toast.error("Fehler beim Hinzufügen der Sitemap");
      setProgressLogs((prev) => [...prev, `❌ Fehler: ${error.message}`]);
    } finally {
      setIsAddingSitemap(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadingFile(file);
    setIsUploading(true);
    setProgressLogs([]);
    setShowProgressModal(true);

    try {
      // First upload the file to Google AI
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("File upload failed");
      }

      const uploadData = await uploadResponse.json();

      // Then add it to the chat
      const response = await fetch("/api/admin/add-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatName,
          contentType: "document",
          file: uploadData.file,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const event = JSON.parse(line.slice(6));
              if (event.message) {
                setProgressLogs((prev) => [...prev, event.message]);
              }
              if (event.type === "complete") {
                toast.success("Dokument erfolgreich hinzugefügt!");
                setUploadingFile(null);
                setShowDocumentUpload(false);
                // Reload page to show new document
                setTimeout(() => window.location.reload(), 1500);
              } else if (event.type === "error") {
                toast.error("Fehler beim Hinzufügen des Dokuments");
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error("Fehler beim Hochladen des Dokuments");
      setProgressLogs((prev) => [...prev, `❌ Fehler: ${error.message}`]);
    } finally {
      setIsUploading(false);
      setUploadingFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddJsonApi = async () => {
    if (!newApiUrl.trim()) {
      toast.error("Bitte geben Sie eine API-URL ein");
      return;
    }

    setIsAddingJsonApi(true);
    setProgressLogs([]);
    setShowProgressModal(true);

    try {
      const response = await fetch("/api/admin/add-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatName,
          contentType: "json-api",
          apiUrl: newApiUrl,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const event = JSON.parse(line.slice(6));
              if (event.message) {
                setProgressLogs((prev) => [...prev, event.message]);
              }
              if (event.type === "complete") {
                toast.success("JSON-API erfolgreich importiert!");
                setNewApiUrl("");
                setShowJsonApiInput(false);
                // Reload page to show new content
                setTimeout(() => window.location.reload(), 1500);
              } else if (event.type === "error") {
                toast.error("Fehler beim Importieren der JSON-API");
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error importing JSON API:", error);
      toast.error("Fehler beim Importieren der JSON-API");
      setProgressLogs((prev) => [...prev, `❌ Fehler: ${error.message}`]);
    } finally {
      setIsAddingJsonApi(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Content Updates Section (moved from Settings) */}
      {chatConfig.uploadType === "website" && chatConfig.sitemapUrls && chatConfig.sitemapUrls.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Content Updates
          </h3>

          <div className="space-y-6">
            {chatConfig.sitemapUrls.map((sitemapUrl, index) => (
              <div key={index}>
                <ContentUpdateManager
                  chatName={chatName}
                  sitemapUrl={sitemapUrl}
                />
              </div>
            ))}

            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Update-Historie</h4>
              <UpdateHistoryTable chatName={chatName} limit={5} />
            </div>
          </div>
        </div>
      )}

      {/* JSON-API Sources Section */}
      {chatConfig.apiUrls && chatConfig.apiUrls.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            JSON-API Quellen
          </h3>

          <div className="space-y-4">
            {chatConfig.apiUrls.map((apiUrl, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Database className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-medium text-gray-900 break-all">{apiUrl}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Diese API-Quelle wurde importiert und kann jederzeit aktualisiert werden.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        setProgressLogs([]);
                        setShowProgressModal(true);

                        const response = await fetch("/api/admin/update-content", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            chatName,
                            contentType: "json-api",
                            apiUrl,
                          }),
                        });

                        const reader = response.body?.getReader();
                        const decoder = new TextDecoder();

                        if (reader) {
                          while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            const text = decoder.decode(value);
                            const lines = text.split("\n");

                            for (const line of lines) {
                              if (line.startsWith("data: ")) {
                                const event = JSON.parse(line.slice(6));
                                if (event.message) {
                                  setProgressLogs((prev) => [...prev, event.message]);
                                }
                                if (event.type === "complete") {
                                  toast.success("API erfolgreich aktualisiert!");
                                  setTimeout(() => window.location.reload(), 1500);
                                } else if (event.type === "error") {
                                  toast.error("Fehler beim Aktualisieren");
                                }
                              }
                            }
                          }
                        }
                      } catch (error: any) {
                        console.error("Error updating API:", error);
                        toast.error("Fehler beim Aktualisieren");
                        setProgressLogs((prev) => [...prev, `❌ Fehler: ${error.message}`]);
                      }
                    }}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    Jetzt aktualisieren
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Files Section */}
      {(() => {
        const uploadedFiles = chatConfig.files ? JSON.parse(chatConfig.files) : [];
        return uploadedFiles.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Hochgeladene Dateien ({uploadedFiles.length})
            </h3>

            <div className="space-y-4">
              {uploadedFiles.map((file: any) => (
                <div key={file.name} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.displayName}
                      </p>
                      <p className="text-xs text-gray-500">{file.mimeType}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Add New Content Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Weitere Inhalte hinzufügen
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Add Sitemap Button */}
          <button
            onClick={() => setShowSitemapInput(!showSitemapInput)}
            className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Globe className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Neue Sitemap</span>
            <Plus className="w-4 h-4 text-gray-600" />
          </button>

          {/* Add Document Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Dokument</span>
            <Upload className="w-4 h-4 text-gray-600" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx,.xlsx,.xls,.csv,.json,.xml,.md,.rtf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />

          {/* Add JSON API Button */}
          <button
            onClick={() => setShowJsonApiInput(!showJsonApiInput)}
            className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Database className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">JSON-API</span>
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Sitemap Input Form */}
        {showSitemapInput && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sitemap-URL
                </label>
                <input
                  type="url"
                  value={newSitemapUrl}
                  onChange={(e) => setNewSitemapUrl(e.target.value)}
                  placeholder="https://example.com/sitemap.xml"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAddingSitemap}
                />
              </div>
              <button
                onClick={handleAddSitemap}
                disabled={isAddingSitemap || !newSitemapUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isAddingSitemap ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Wird hinzugefügt...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Hinzufügen</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowSitemapInput(false);
                  setNewSitemapUrl("");
                }}
                className="px-3 py-2 text-gray-600 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* JSON API Input Form */}
        {showJsonApiInput && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  JSON-API URL
                </label>
                <input
                  type="url"
                  value={newApiUrl}
                  onChange={(e) => setNewApiUrl(e.target.value)}
                  placeholder="https://api.example.com/data.json"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAddingJsonApi}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Die API sollte ein JSON-Array zurückgeben mit Feldern wie title, content, url
                </p>
              </div>
              <button
                onClick={handleAddJsonApi}
                disabled={isAddingJsonApi || !newApiUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isAddingJsonApi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Wird importiert...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Importieren</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowJsonApiInput(false);
                  setNewApiUrl("");
                }}
                className="px-3 py-2 text-gray-600 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {isAddingSitemap ? "Sitemap wird hinzugefügt..." :
                 isAddingJsonApi ? "JSON-API wird importiert..." :
                 "Dokument wird hochgeladen..."}
              </h3>
              {!isAddingSitemap && !isUploading && !isAddingJsonApi && (
                <button
                  onClick={() => setShowProgressModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-100 min-h-[300px] max-h-[400px] overflow-y-auto">
                {progressLogs.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                  </div>
                ) : (
                  progressLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
