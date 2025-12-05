"use client";

import { useState, useEffect } from "react";
import { FileText } from "lucide-react";

interface PdfThumbnailProps {
  src: string; // localPath like "doc-123-file.pdf"
  className?: string;
}

// Declare pdfjsLib on window for TypeScript
declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (url: string) => { promise: Promise<PDFDocument> };
    };
  }
}

interface PDFDocument {
  getPage: (num: number) => Promise<PDFPage>;
}

interface PDFPage {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
}

// Global promise to load pdfjs only once
let pdfjsLoadPromise: Promise<void> | null = null;

function loadPdfjsScript(): Promise<void> {
  if (pdfjsLoadPromise) return pdfjsLoadPromise;

  pdfjsLoadPromise = new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.min.mjs";
    script.type = "module";
    script.onload = () => {
      // Wait a bit for the module to be fully initialized
      setTimeout(() => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";
          resolve();
        } else {
          reject(new Error("pdfjsLib not found after script load"));
        }
      }, 100);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return pdfjsLoadPromise;
}

export default function PdfThumbnail({ src, className = "" }: PdfThumbnailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);

  const pdfUrl = `/api/uploads/${src}`;

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        // Load pdfjs from CDN
        await loadPdfjsScript();

        if (!window.pdfjsLib || cancelled) return;

        const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        const page = await pdf.getPage(1);

        if (cancelled) return;

        // Create offscreen canvas
        const scale = 0.3;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext("2d");
        if (!context) {
          setError(true);
          return;
        }

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        if (cancelled) return;

        // Convert to data URL
        const dataUrl = canvas.toDataURL("image/png");
        setImageData(dataUrl);
        setLoading(false);
      } catch (err) {
        console.error("Error rendering PDF thumbnail:", err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // Show fallback icon if error
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-blue-100 rounded-lg ${className}`}>
        <FileText className="w-5 h-5 text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg bg-gray-100 ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-100 z-10">
          <FileText className="w-5 h-5 text-blue-600 animate-pulse" />
        </div>
      )}
      {imageData && (
        <img
          src={imageData}
          alt="PDF preview"
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
