"use client";

import { useState, useEffect } from "react";
import { Upload, X, File as FileIcon, Loader2 } from "lucide-react";

interface UploadedFile {
  name: string;
  displayName: string;
  mimeType: string;
  sizeBytes: string;
  uri: string;
  localPath?: string; // Local file path for preview
}

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
}

export default function FileUpload({ onFilesChange }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadFiles() {
    try {
      setLoading(true);
      const response = await fetch("/api/stores");
      const data = await response.json();

      if (data.success) {
        setUploadedFiles(data.files);
        onFilesChange(data.files);
      }
    } catch (err: any) {
      console.error("Error loading files:", err);
    } finally {
      setLoading(false);
    }
  }

  // Load files on mount
  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload fehlgeschlagen");
      }

      // Add to uploaded files
      const newFiles = [...uploadedFiles, data.file];
      setUploadedFiles(newFiles);
      onFilesChange(newFiles);

      // Reset input
      e.target.value = "";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileName: string) {
    try {
      setError(null);
      console.log("Deleting file:", fileName);

      const response = await fetch("/api/stores", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName }),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Invalid response content type:", contentType);
        throw new Error("Server hat keine JSON-Antwort zurückgegeben. Möglicherweise ein Server-Fehler.");
      }

      const data = await response.json();
      console.log("Delete response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Löschen fehlgeschlagen");
      }

      // Remove from list
      const newFiles = uploadedFiles.filter((f) => f.name !== fileName);
      setUploadedFiles(newFiles);
      onFilesChange(newFiles);

      console.log("File deleted successfully:", fileName);
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "Fehler beim Löschen der Datei");
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
          accept=".pdf,.txt,.doc,.docx,.xlsx,.xls,.csv,.json,.xml,.md,.rtf"
        />
        <label
          htmlFor="file-upload"
          className={`cursor-pointer flex flex-col items-center space-y-2 ${
            uploading ? "opacity-50" : ""
          }`}
        >
          {uploading ? (
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          ) : (
            <Upload className="w-12 h-12 text-gray-400" />
          )}
          <div>
            <span className="text-blue-500 hover:text-blue-600 font-medium">
              Datei hochladen
            </span>
            <p className="text-sm text-gray-500 mt-1">
              PDF, Word, Text, JSON, XML, CSV (max. 100MB)
            </p>
          </div>
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">
            Hochgeladene Dateien ({uploadedFiles.length})
          </h3>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.displayName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(parseInt(file.sizeBytes) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(file.name)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Löschen"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
