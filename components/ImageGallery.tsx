"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  maxDisplay?: number; // Maximum number of images to display (default: 6)
}

export default function ImageGallery({ images, maxDisplay = 6 }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!images || images.length === 0) return null;

  const displayImages = images.slice(0, maxDisplay);

  return (
    <>
      <div className="mt-4 mb-4">
        <p className="text-xs mb-2" style={{ color: "var(--color-text-light)" }}>
          Bilder aus den Quellen:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {displayImages.map((imageUrl, index) => (
            <div
              key={index}
              className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group border"
              style={{ borderColor: "var(--color-text-light)" }}
              onClick={() => setSelectedImage(imageUrl)}
            >
              <img
                src={imageUrl}
                alt={`Bild ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  // Hide broken images
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
            </div>
          ))}
        </div>
        {images.length > maxDisplay && (
          <p className="text-xs mt-2" style={{ color: "var(--color-text-light)" }}>
            +{images.length - maxDisplay} weitere Bilder in den Quellen
          </p>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedImage}
            alt="Vollbild"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
