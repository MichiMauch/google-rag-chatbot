"use client";

import { useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Globe, Palette } from "lucide-react";
import { themes } from "@/lib/themes";

type UploadType = "documents" | "website";

export default function WizardForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<UploadType>("documents");
  const [chatName, setChatName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(themes[0].id);
  const [files, setFiles] = useState<File[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const maxFiles = uploadType === "documents" ? 5 : 50;

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
    // Reset file input when switching types
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFiles([]);
    setWebsiteUrl("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setUploadProgress("");

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

    if (uploadType === "website" && !websiteUrl.trim()) {
      setError("Bitte gib eine Website-URL ein");
      setLoading(false);
      return;
    }

    try {
      // Create URL-friendly slug from chat name
      const chatSlug = chatName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (uploadType === "documents") {
        // Upload files first
        setUploadProgress("Dateien werden hochgeladen...");
        const uploadedFiles = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadProgress(`Datei ${i + 1}/${files.length} wird hochgeladen: ${file.name}`);

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
        }

        // Create chat with uploaded files
        setUploadProgress("Chat wird erstellt...");
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
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Fehler beim Erstellen des Chats");
        }

        const data = await response.json();

        // Save chat config to localStorage
        localStorage.setItem(`chat-config-${chatSlug}`, JSON.stringify(data.chatConfig));

        // Redirect to chat
        router.push(`/chats/${chatSlug}`);
      } else {
        // Scrape website
        setUploadProgress("Website wird gescraped...");
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
            websiteUrl,
            maxPages: 50,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Fehler beim Scrapen der Website");
        }

        const data = await response.json();

        // Save chat config to localStorage
        localStorage.setItem(`chat-config-${chatSlug}`, JSON.stringify(data.chatConfig));

        // Redirect to chat
        router.push(`/chats/${chatSlug}`);
      }
    } catch (err: any) {
      console.error("Fehler beim Erstellen des Chats:", err);
      setError(err.message || "Ein Fehler ist aufgetreten");
      setLoading(false);
    }
  }

  return (
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
        <div className="space-y-2" key="website-upload">
          <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
            Website-URL
          </label>
          <input
            id="websiteUrl"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            required
          />
          <p className="text-xs text-gray-500">
            Es werden bis zu 50 Seiten der Website automatisch gescraped
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Progress Message */}
      {uploadProgress && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          {uploadProgress}
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
  );
}
