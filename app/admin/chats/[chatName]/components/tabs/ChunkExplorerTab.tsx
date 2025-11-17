"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  Save,
  X
} from "lucide-react";

interface Document {
  name: string;
  displayName: string;
  createTime: string;
  customMetadata: Record<string, any>;
  state: string;
}

interface Chunk {
  index: number;
  name: string;
  text: string;
  customMetadata: Record<string, any>;
  createTime: string | null;
  relevanceScore: number | null;
}

interface ChunkExplorerTabProps {
  chatName: string;
  fileSearchStoreName?: string;
}

export default function ChunkExplorerTab({
  chatName,
  fileSearchStoreName,
}: ChunkExplorerTabProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>("");
  const [query, setQuery] = useState<string>("content");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [editingChunk, setEditingChunk] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [deletingChunk, setDeletingChunk] = useState<number | null>(null);

  // Auto-load documents on mount
  useEffect(() => {
    if (fileSearchStoreName) {
      loadDocuments(1);
    }
  }, [fileSearchStoreName]);

  async function loadDocuments(pageNum: number) {
    if (!fileSearchStoreName) {
      setError("Kein File Search Store konfiguriert für diesen Chat");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/chunks/list-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: fileSearchStoreName,
          page: pageNum,
          pageSize: 20,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Laden der Dokumente");
      }

      setDocuments(data.documents || []);
      setPage(pageNum);
      setHasMore(data.hasMore || false);
    } catch (err: any) {
      setError(err.message);
      console.error("Error loading documents:", err);
    } finally {
      setLoading(false);
    }
  }

  async function queryChunks(documentName: string) {
    if (!fileSearchStoreName || !documentName || !query) {
      setError("Bitte Dokument und Query auswählen");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setChunks([]);

      const response = await fetch("/api/admin/chunks/query-chunks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: fileSearchStoreName,
          documentName,
          query,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Abrufen der Chunks");
      }

      setChunks(data.chunks || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Error querying chunks:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteChunk(chunkIndex: number) {
    const chunk = chunks[chunkIndex];
    if (!chunk) return;

    if (!confirm(`Chunk #${chunk.index} wirklich löschen?`)) {
      return;
    }

    try {
      setDeletingChunk(chunkIndex);
      setError(null);

      const response = await fetch("/api/admin/chunks/delete-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunkName: chunk.name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Löschen des Chunks");
      }

      setChunks(chunks.filter((_, i) => i !== chunkIndex));
    } catch (err: any) {
      setError(err.message);
      console.error("Error deleting chunk:", err);
    } finally {
      setDeletingChunk(null);
    }
  }

  function startEditing(chunkIndex: number) {
    const chunk = chunks[chunkIndex];
    if (!chunk) return;

    setEditingChunk(chunkIndex);
    setEditText(chunk.text);
  }

  function cancelEditing() {
    setEditingChunk(null);
    setEditText("");
  }

  async function saveChunk(chunkIndex: number) {
    const chunk = chunks[chunkIndex];
    if (!chunk) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/chunks/update-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chunkName: chunk.name,
          text: editText,
          customMetadata: chunk.customMetadata,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Speichern des Chunks");
      }

      const updatedChunks = [...chunks];
      updatedChunks[chunkIndex] = {
        ...updatedChunks[chunkIndex],
        text: editText,
      };
      setChunks(updatedChunks);

      setEditingChunk(null);
      setEditText("");
    } catch (err: any) {
      setError(err.message);
      console.error("Error updating chunk:", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleDocument(docName: string) {
    if (selectedDocument === docName) {
      // Close accordion
      setSelectedDocument("");
      setChunks([]);
    } else {
      // Open new accordion
      setSelectedDocument(docName);
      setChunks([]);
    }
  }

  if (!fileSearchStoreName) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        Dieser Chat hat keinen File Search Store konfiguriert. Bitte konfiguriere einen Store in den Chat-Einstellungen.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Documents Section with Accordion */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Dokumente
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadDocuments(page - 1)}
              disabled={loading || page === 1}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Vorherige Seite"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">
              Seite {page}
            </span>
            <button
              onClick={() => loadDocuments(page + 1)}
              disabled={loading || !hasMore}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Nächste Seite"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading && documents.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-600 mt-2">Lade Dokumente...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Keine Dokumente gefunden
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.name}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Document Header */}
                <button
                  onClick={() => toggleDocument(doc.name)}
                  className={`w-full text-left p-4 transition-colors flex items-center justify-between ${
                    selectedDocument === doc.name
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{doc.displayName}</div>
                    <div className="text-xs text-gray-500 mt-1">{doc.state}</div>
                  </div>
                  {selectedDocument === doc.name ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>

                {/* Accordion Content */}
                {selectedDocument === doc.name && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                    {/* Query Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Query eingeben:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder='z.B. "content", "information", "data"...'
                          className="flex-1 border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={loading}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              queryChunks(doc.name);
                            }
                          }}
                        />
                        <button
                          onClick={() => queryChunks(doc.name)}
                          disabled={loading || !query}
                          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Lädt...
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4" />
                              Suchen
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Hinweis: Es werden max. 100 Chunks zurückgegeben
                      </p>
                    </div>

                    {/* Chunks Results */}
                    {chunks.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Ergebnisse ({chunks.length} Chunks)
                        </h4>
                        {chunks.map((chunk, index) => (
                          <div
                            key={chunk.index}
                            className="bg-white border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-semibold text-gray-900">
                                Chunk #{chunk.index}
                              </h5>
                              <div className="flex items-center gap-2">
                                {chunk.relevanceScore !== null && (
                                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                    Score: {chunk.relevanceScore.toFixed(4)}
                                  </span>
                                )}
                                {editingChunk !== index && (
                                  <>
                                    <button
                                      onClick={() => startEditing(index)}
                                      className="text-blue-500 hover:text-blue-700 p-1"
                                      title="Bearbeiten"
                                      disabled={deletingChunk === index}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteChunk(index)}
                                      className="text-red-500 hover:text-red-700 p-1"
                                      title="Löschen"
                                      disabled={deletingChunk === index}
                                    >
                                      {deletingChunk === index ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {editingChunk === index ? (
                              <div className="space-y-3">
                                <textarea
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="w-full border border-gray-300 rounded p-3 text-sm min-h-[200px] font-mono"
                                  placeholder="Chunk-Text bearbeiten..."
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveChunk(index)}
                                    disabled={loading}
                                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {loading ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Speichert...
                                      </>
                                    ) : (
                                      <>
                                        <Save className="w-4 h-4" />
                                        Speichern
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    disabled={loading}
                                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    <X className="w-4 h-4" />
                                    Abbrechen
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-3 rounded mb-3">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {chunk.text.length > 500
                                    ? chunk.text.substring(0, 500) + "..."
                                    : chunk.text}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                              <div>
                                <span className="font-medium">Name:</span>
                                <br />
                                <span className="break-all">{chunk.name}</span>
                              </div>
                              {chunk.createTime && (
                                <div>
                                  <span className="font-medium">Erstellt:</span>
                                  <br />
                                  {new Date(chunk.createTime).toLocaleString("de-DE")}
                                </div>
                              )}
                            </div>

                            {Object.keys(chunk.customMetadata).length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <span className="text-xs font-medium text-gray-700">
                                  Custom Metadata:
                                </span>
                                <div className="mt-1 space-y-1">
                                  {Object.entries(chunk.customMetadata).map(
                                    ([key, value]) => (
                                      <div key={key} className="text-xs text-gray-600">
                                        <span className="font-medium">{key}:</span>{" "}
                                        {String(value)}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
