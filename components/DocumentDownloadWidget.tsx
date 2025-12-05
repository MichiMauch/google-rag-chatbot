"use client";

import dynamic from "next/dynamic";
import { FileText, File, Download } from "lucide-react";
import { Source } from "@/hooks/useChatHistory";

// Dynamic import with ssr: false since pdfjs needs browser APIs
const PdfThumbnail = dynamic(() => import("./PdfThumbnail"), {
  ssr: false,
  loading: () => (
    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
      <FileText className="w-5 h-5 text-blue-600 animate-pulse" />
    </div>
  ),
});

interface DocumentDownloadWidgetProps {
  sources: Source[];
  onDocumentClick: (source: Source) => void;
}

function isPdf(mimeType?: string, displayName?: string): boolean {
  return mimeType?.includes("pdf") || displayName?.toLowerCase().endsWith(".pdf") || false;
}

function getFileIcon(mimeType?: string) {
  if (mimeType?.includes("pdf")) {
    return FileText;
  }
  return File;
}

function getFileType(displayName?: string, mimeType?: string): string {
  if (!displayName) return "Dokument";

  const ext = displayName.split(".").pop()?.toUpperCase();
  if (ext) {
    return ext;
  }

  if (mimeType?.includes("pdf")) return "PDF";
  if (mimeType?.includes("word") || mimeType?.includes("document")) return "DOCX";
  if (mimeType?.includes("text")) return "TXT";

  return "Dokument";
}

export default function DocumentDownloadWidget({
  sources,
  onDocumentClick,
}: DocumentDownloadWidgetProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {sources.map((source, index) => {
        const Icon = getFileIcon(source.mimeType);
        const fileType = getFileType(source.displayName, source.mimeType);

        const showPdfThumbnail = isPdf(source.mimeType, source.displayName) && source.localPath;

        return (
          <button
            key={index}
            onClick={() => onDocumentClick(source)}
            className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              {showPdfThumbnail ? (
                <PdfThumbnail
                  src={source.localPath!}
                  className="w-10 h-10 flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
              )}
              <div className="text-left">
                <div className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {source.displayName || "Dokument"}
                </div>
                <div className="text-xs text-gray-500">
                  {fileType}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
              <span>Öffnen</span>
              <Download className="w-4 h-4" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
