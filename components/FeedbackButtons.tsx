"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import toast from "react-hot-toast";

interface FeedbackButtonsProps {
  messageId?: string;
  initialFeedback?: 1 | -1 | null;
  onFeedbackGiven?: (feedback: 1 | -1) => void;
}

export default function FeedbackButtons({
  messageId,
  initialFeedback = null,
  onFeedbackGiven,
}: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<1 | -1 | null>(initialFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (value: 1 | -1) => {
    if (!messageId) {
      toast.error("Nachricht-ID fehlt");
      return;
    }

    if (feedback !== null) {
      // Already submitted feedback
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId,
          feedback: value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Speichern");
      }

      setFeedback(value);

      if (onFeedbackGiven) {
        onFeedbackGiven(value);
      }

      toast.success(value === 1 ? "Danke für dein Feedback! 👍" : "Danke für dein Feedback!");
    } catch (error: any) {
      console.error("Feedback error:", error);
      toast.error(error.message || "Feedback konnte nicht gespeichert werden");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't show buttons if no messageId
  if (!messageId) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        onClick={() => handleFeedback(1)}
        disabled={feedback !== null || isSubmitting}
        className={`p-1.5 rounded-md transition-all ${
          feedback === 1
            ? "bg-green-100 text-green-700"
            : "hover:bg-gray-100 text-gray-500 hover:text-green-600"
        } ${
          feedback !== null ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
        title={feedback === 1 ? "Du hast diese Antwort hilfreich gefunden" : "Hilfreich"}
      >
        <ThumbsUp className={`w-4 h-4 ${feedback === 1 ? "fill-current" : ""}`} />
      </button>

      <button
        onClick={() => handleFeedback(-1)}
        disabled={feedback !== null || isSubmitting}
        className={`p-1.5 rounded-md transition-all ${
          feedback === -1
            ? "bg-red-100 text-red-700"
            : "hover:bg-gray-100 text-gray-500 hover:text-red-600"
        } ${
          feedback !== null ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
        title={feedback === -1 ? "Du hast diese Antwort nicht hilfreich gefunden" : "Nicht hilfreich"}
      >
        <ThumbsDown className={`w-4 h-4 ${feedback === -1 ? "fill-current" : ""}`} />
      </button>

      {feedback !== null && (
        <span className="text-xs text-gray-400 ml-1">
          Feedback gespeichert
        </span>
      )}
    </div>
  );
}
