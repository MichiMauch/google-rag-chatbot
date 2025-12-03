"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, FileText, Loader2 } from "lucide-react";
import { Source } from "@/hooks/useChatHistory";

interface DocumentPreviewModalProps {
  source: Source | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentPreviewModal({
  source,
  isOpen,
  onClose,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use localPath for preview if available, otherwise show unavailable message
  const fileUrl = source?.localPath
    ? `/api/uploads/${encodeURIComponent(source.localPath)}`
    : null;

  const isPdf = source?.mimeType === "application/pdf";
  const isText =
    source?.mimeType?.startsWith("text/") ||
    source?.mimeType === "application/json" ||
    source?.mimeType === "application/xml";

  // Fetch text content for text-based files
  useEffect(() => {
    if (!isOpen || !fileUrl || !isText) {
      setTextContent(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load file");
        return res.text();
      })
      .then((text) => {
        setTextContent(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading text content:", err);
        setError("Fehler beim Laden der Datei");
        setLoading(false);
      });
  }, [isOpen, fileUrl, isText]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!source || !fileUrl) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-4xl h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <h2 className="font-medium text-gray-900 truncate">
                  {source.displayName}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={fileUrl}
                  download={source.displayName}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5 text-gray-600" />
                </a>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Schließen"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {isPdf ? (
                // PDF Preview with iframe
                <iframe
                  src={fileUrl}
                  className="w-full h-full border-0"
                  title={source.displayName}
                  onLoad={() => setLoading(false)}
                />
              ) : isText ? (
                // Text Preview
                <div className="h-full overflow-auto p-4 bg-gray-50">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-full text-red-500">
                      {error}
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                      {textContent}
                    </pre>
                  )}
                </div>
              ) : (
                // Fallback for unsupported formats
                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                  <FileText className="w-16 h-16" />
                  <p>Vorschau für diesen Dateityp nicht verfügbar</p>
                  <a
                    href={fileUrl}
                    download={source.displayName}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Datei herunterladen
                  </a>
                </div>
              )}

              {/* Loading overlay for PDF */}
              {isPdf && loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
