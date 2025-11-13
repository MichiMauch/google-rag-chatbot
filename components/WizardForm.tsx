"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Globe, Palette, Search } from "lucide-react";
import { themes } from "@/lib/themes";
import StreamingLogModal from "./StreamingLogModal";

type UploadType = "documents" | "website";

interface SitemapInfo {
  url: string;
  type: "index" | "urlset";
  urlCount?: number;
  description: string;
}

export default function WizardForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<UploadType>("documents");
  const [chatName, setChatName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(themes[0].id);
  const [files, setFiles] = useState<File[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discoveringSitemaps, setDiscoveringSitemaps] = useState(false);
  const [discoveredSitemaps, setDiscoveredSitemaps] = useState<SitemapInfo[]>([]);
  const [selectedSitemaps, setSelectedSitemaps] = useState<string[]>([]);

  // Streaming log state
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isComplete, setIsComplete] = useState(false);

  const maxFiles = uploadType === "documents" ? 5 : 50;

  // Auto-scroll log container
  useEffect(() => {
    if (showLog && logs.length > 0) {
      const container = document.querySelector(".streaming-log-container");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [logs, showLog]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > maxFiles) {
      setError(`Maximal ${maxFiles} Dateien erlaubt`);
      return;
    }
    setFiles(selectedFiles);
    setError(null);
  }

  function handleUploadTypeChange(type: UploadType) {
    setUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFiles([]);
    setWebsiteUrl("");
    setSitemapUrl("");
    setDiscoveredSitemaps([]);
    setSelectedSitemaps([]);
    setError(null);
  }

  async function handleDiscoverSitemaps() {
    if (!websiteUrl.trim()) {
      setError("Bitte gib eine Website-URL ein");
      return;
    }

    setError(null);
    setDiscoveringSitemaps(true);
    setDiscoveredSitemaps([]);
    setSelectedSitemaps([]);

    try {
      const response = await fetch("/api/discover-sitemaps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ websiteUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Suchen der Sitemaps");
      }

      const data = await response.json();
      setDiscoveredSitemaps(data.sitemaps);

      if (data.sitemaps.length === 1) {
        setSelectedSitemaps([data.sitemaps[0].url]);
      }
    } catch (err: any) {
      console.error("Error discovering sitemaps:", err);
      setError(err.message || "Fehler beim Suchen der Sitemaps");
    } finally {
      setDiscoveringSitemaps(false);
    }
  }

  function handleToggleSitemap(url: string) {
    setSelectedSitemaps((prev) =>
      prev.includes(url)
        ? prev.filter((u) => u !== url)
        : [...prev, url]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (!chatName.trim()) {
      setError("Bitte gib einen Chat-Namen ein");
      setLoading(false);
      return;
    }

    if (uploadType === "documents" && files.length === 0) {
      setError("Bitte wähle mindestens eine Datei aus");
      setLoading(false);
      return;
    }

    if (uploadType === "website" && selectedSitemaps.length === 0) {
      setError("Bitte wähle mindestens eine Sitemap aus");
      setLoading(false);
      return;
    }

    try {
      // Create URL-friendly slug from chat name
      const chatSlug = chatName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Reset streaming state
      setLogs([]);
      setProgress({ current: 0, total: 0 });
      setIsComplete(false);
      setShowLog(true);

      if (uploadType === "documents") {
        // Upload files first
        setLogs(["📤 Dateien werden hochgeladen..."]);
        const uploadedFiles = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setLogs(prev => [...prev, `📎 Datei ${i + 1}/${files.length}: ${file.name}`]);

          const formData = new FormData();
          formData.append("file", file);

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || `Fehler beim Hochladen von ${file.name}`);
          }

          const uploadData = await uploadResponse.json();
          uploadedFiles.push(uploadData.file);
          setLogs(prev => [...prev, `   ✓ ${file.name} hochgeladen`]);
        }

        setLogs(prev => [...prev, `✅ Alle Dateien hochgeladen, erstelle Chat...`]);

        // Parse allowed domains
        const allowedDomainsArray = allowedDomains
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d.length > 0);

        // Create chat with SSE streaming
        const response = await fetch("/api/create-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chatName: chatSlug,
            displayName: chatName,
            uploadType,
            themeId: selectedTheme,
            files: uploadedFiles,
            allowedDomains: allowedDomainsArray.length > 0 ? allowedDomainsArray : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Fehler beim Erstellen des Chats");
        }

        // Read SSE stream
        await processSSEStream(response, chatSlug);

      } else {
        const allowedDomainsArray = allowedDomains
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d.length > 0);

        const response = await fetch("/api/create-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chatName: chatSlug,
            displayName: chatName,
            uploadType,
            themeId: selectedTheme,
            sitemapUrls: selectedSitemaps,
            maxPages: 50,
            allowedDomains: allowedDomainsArray.length > 0 ? allowedDomainsArray : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Fehler beim Starten des Scraping");
        }

        // Read SSE stream
        await processSSEStream(response, chatSlug);
      }

    } catch (err: any) {
      console.error("Fehler beim Erstellen des Chats:", err);
      setError(err.message || "Ein Fehler ist aufgetreten");
      setLogs(prev => [...prev, `❌ Fehler: ${err.message}`]);
      setIsComplete(true);
      setLoading(false);
    }
  }

  async function processSSEStream(response: Response, chatSlug: string) {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("Kein Stream-Reader verfügbar");
    }

    try {
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("Stream ended");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              handleStreamEvent(event, chatSlug);
            } catch (e) {
              console.error("Error parsing SSE event:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream reading error:", error);
      throw error;
    }
  }

  function handleStreamEvent(event: any, chatSlug: string) {
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

      case "batch_start":
        if (event.message) {
          setLogs(prev => [...prev, `\n${event.message}`]);
        }
        break;

      case "batch_complete":
        if (event.message) {
          setLogs(prev => [...prev, event.message]);
        }
        break;

      case "complete":
        if (event.message) {
          setLogs(prev => [...prev, `\n${event.message}`]);
        }
        setIsComplete(true);
        setLoading(false);

        // Save chat config to localStorage (if provided)
        if (event.chatConfig) {
          localStorage.setItem(`chat-config-${chatSlug}`, JSON.stringify(event.chatConfig));
        }

        // Wait a bit for user to see the completion message, then redirect
        setTimeout(() => {
          router.push(`/chats/${chatSlug}`);
        }, 2000);
        break;

      case "error":
        if (event.message) {
          setLogs(prev => [...prev, event.message]);
        }
        setIsComplete(true);
        setLoading(false);
        break;
    }
  }

  function handleCloseLog() {
    if (isComplete) {
      setShowLog(false);
      setLogs([]);
      setProgress({ current: 0, total: 0 });
      setIsComplete(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        {/* Upload Type Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Was möchtest du hochladen?
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleUploadTypeChange("documents")}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                uploadType === "documents"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <FileText className={`w-6 h-6 mb-2 ${uploadType === "documents" ? "text-blue-500" : "text-gray-400"}`} />
              <div className="font-medium text-gray-900">5 Dokumente</div>
              <div className="text-xs text-gray-500 mt-1">PDF, TXT, DOCX, etc.</div>
            </button>

            <button
              type="button"
              onClick={() => handleUploadTypeChange("website")}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                uploadType === "website"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Globe className={`w-6 h-6 mb-2 ${uploadType === "website" ? "text-blue-500" : "text-gray-400"}`} />
              <div className="font-medium text-gray-900">50 Webseiten</div>
              <div className="text-xs text-gray-500 mt-1">Automatisches Scraping</div>
            </button>
          </div>
        </div>

        {/* Chat Name */}
        <div className="space-y-2">
          <label htmlFor="chatName" className="block text-sm font-medium text-gray-700">
            Chat-Name
          </label>
          <input
            id="chatName"
            type="text"
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            placeholder="z.B. Mein Projektchat"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            required
          />
          <p className="text-xs text-gray-500">
            Dieser Name wird als URL-Pfad verwendet: /chats/{chatName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "chat-name"}
          </p>
        </div>

        {/* Color Theme Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            <Palette className="inline w-4 h-4 mr-1" />
            Farbschema
          </label>
          <div className="grid grid-cols-5 gap-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedTheme(theme.id)}
                className={`p-3 border-2 rounded-lg text-center transition-all ${
                  selectedTheme === theme.id
                    ? "border-gray-900 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className="w-full h-8 rounded mb-2"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div className="text-xs font-medium text-gray-900">{theme.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Conditional: File Upload or Website URL */}
        {uploadType === "documents" ? (
          <div className="space-y-2" key="documents-upload">
            <label htmlFor="files" className="block text-sm font-medium text-gray-700">
              Dateien auswählen (max. 5)
            </label>
            <input
              ref={fileInputRef}
              id="files"
              type="file"
              multiple
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              accept=".pdf,.txt,.doc,.docx,.csv,.json,.md"
            />
            {files.length > 0 && (
              <div className="text-sm text-gray-600 mt-2">
                {files.length} Datei(en) ausgewählt
                <ul className="list-disc list-inside mt-1 text-xs">
                  {files.map((file, i) => (
                    <li key={i}>{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4" key="website-upload">
            <div className="space-y-2">
              <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
                Website-URL
              </label>
              <div className="flex space-x-2">
                <input
                  id="websiteUrl"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || discoveringSitemaps}
                />
                <button
                  type="button"
                  onClick={handleDiscoverSitemaps}
                  disabled={loading || discoveringSitemaps || !websiteUrl.trim()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {discoveringSitemaps ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Suche...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Sitemaps suchen</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Gib die Haupt-URL deiner Website ein, um Sitemaps automatisch zu finden
              </p>
            </div>

            {discoveredSitemaps.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Gefundene Sitemaps ({discoveredSitemaps.length})
                </label>
                <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                  {discoveredSitemaps.map((sitemap, index) => (
                    <label
                      key={index}
                      className="flex items-start space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSitemaps.includes(sitemap.url)}
                        onChange={() => handleToggleSitemap(sitemap.url)}
                        className="mt-1"
                        disabled={loading}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {sitemap.url.split("/").pop()}
                        </div>
                        <div className="text-xs text-gray-500">{sitemap.description}</div>
                        <div className="text-xs text-gray-400 truncate mt-1">
                          {sitemap.url}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          sitemap.type === "index"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {sitemap.type === "index" ? "Index" : "Urlset"}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {selectedSitemaps.length} Sitemap(s) ausgewählt · Die 50 neuesten Artikel werden gescraped
                </p>
              </div>
            )}
          </div>
        )}

        {/* Allowed Domains for Embedding */}
        <div className="space-y-2">
          <label htmlFor="allowedDomains" className="block text-sm font-medium text-gray-700">
            Erlaubte Domains für Embedding (optional)
          </label>
          <input
            id="allowedDomains"
            type="text"
            value={allowedDomains}
            onChange={(e) => setAllowedDomains(e.target.value)}
            placeholder="example.com, subdomain.example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-gray-500">
            Komma-getrennte Liste von Domains, die diesen Chat einbetten dürfen. Leer lassen für keine Einschränkung. Wildcard-Support: *.example.com
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Wird erstellt...
            </>
          ) : (
            "Chat erstellen"
          )}
        </button>
      </form>

      {/* Streaming Log Modal */}
      <StreamingLogModal
        isOpen={showLog}
        title="Chat wird erstellt..."
        logs={logs}
        progress={progress}
        isComplete={isComplete}
        onClose={handleCloseLog}
      />
    </>
  );
}
