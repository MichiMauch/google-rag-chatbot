"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ExternalLink } from "lucide-react";
import { Source } from "@/hooks/useChatHistory";

interface CitationMarkerProps {
  citationNumber: number;
  source: Source;
  onDocumentClick?: (source: Source) => void; // Callback for document sources without URL
}

// Global cache to prevent duplicate fetches across all citation markers
const imageCache = new Map<string, string | null>();

export default function CitationMarker({ citationNumber, source, onDocumentClick }: CitationMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false); // Prevent duplicate fetches for this instance

  // Fetch OG image on hover
  useEffect(() => {
    if (!isHovered || !source.url || fetchedRef.current) {
      return;
    }

    // Check cache first
    if (imageCache.has(source.url)) {
      const cachedImage = imageCache.get(source.url);
      setOgImage(cachedImage || null);
      fetchedRef.current = true;
      return;
    }

    setLoading(true);
    fetchedRef.current = true;

    fetch(`/api/fetch-og-image?url=${encodeURIComponent(source.url)}`)
      .then((res) => res.json())
      .then((data) => {
        const image = data.ogImage || null;
        setOgImage(image);
        imageCache.set(source.url!, image); // Cache the result
      })
      .catch((error) => {
        console.error("Error fetching OG image:", error);
        imageCache.set(source.url!, null); // Cache failure too
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isHovered, source.url]); // Removed ogImage and loading from dependencies

  return (
    <span
      className="relative inline-block mx-0.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Superscript Citation Number */}
      <sup className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
        [{citationNumber}]
      </sup>

      {/* Hover Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64"
          >
            <div className="bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden">
              {/* OG Image or Placeholder */}
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="relative h-32 bg-gray-100">
                    {ogImage ? (
                      <img
                        src={ogImage}
                        alt={source.displayName}
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {loading ? (
                          <div className="animate-pulse text-gray-400">Laden...</div>
                        ) : (
                          <FileText className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  {/* Source Name */}
                  <div className="p-3 bg-white">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {source.displayName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Zur Quelle
                    </p>
                  </div>
                </a>
              ) : source.localPath && onDocumentClick ? (
                <button
                  onClick={() => onDocumentClick(source)}
                  className="block w-full text-left group"
                >
                  <div className="relative h-32 bg-gray-100 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                  </div>
                  <div className="p-3 bg-white">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {source.displayName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                      Dokument öffnen
                    </p>
                  </div>
                </button>
              ) : (
                <div>
                  <div className="h-32 bg-gray-100 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                      {source.displayName}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-3 h-3 bg-white border-b border-r border-gray-300 rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
