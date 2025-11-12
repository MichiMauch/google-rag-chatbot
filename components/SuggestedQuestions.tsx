"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface SuggestedQuestionsProps {
  fileUris: Array<{ name: string; mimeType: string; uri: string }>;
  onQuestionClick: (question: string) => void;
  onDismiss: () => void;
}

export default function SuggestedQuestions({
  fileUris,
  onQuestionClick,
  onDismiss,
}: SuggestedQuestionsProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create cache key from file URIs
  const getCacheKey = () => {
    const uris = fileUris.map((f) => f.uri).sort().join(",");
    return `suggested-questions-${uris}`;
  };

  // Check if cache is still valid (5 minutes)
  const isCacheValid = (timestamp: number) => {
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - timestamp < fiveMinutes;
  };

  useEffect(() => {
    // Cancel any ongoing request when fileUris change
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (fileUris.length > 0) {
      // Try to load from cache first
      const cacheKey = getCacheKey();
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const { questions: cachedQuestions, timestamp } = JSON.parse(cached);
          if (isCacheValid(timestamp)) {
            console.log("Using cached suggested questions");
            setQuestions(cachedQuestions);
            return; // Don't make API request
          }
        } catch (error) {
          console.error("Failed to parse cached questions:", error);
        }
      }

      // Cache miss or expired - generate new questions
      const controller = new AbortController();
      abortControllerRef.current = controller;
      generateQuestions(0, controller.signal);
    } else {
      // Clear questions when no files
      setQuestions([]);
    }

    // Cleanup function - abort request if component unmounts or fileUris change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fileUris.length]);

  async function generateQuestions(retryCount = 0, signal?: AbortSignal) {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      console.log("Generating questions for files:", fileUris);

      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUris }),
        signal, // Pass abort signal to fetch
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Invalid response content type:", contentType);
        throw new Error("Server hat keine JSON-Antwort zurückgegeben. Möglicherweise ein Server-Fehler.");
      }

      const data = await response.json();
      console.log("Generate questions response:", data);

      // Log debug text if available
      if (data.debugText) {
        console.log("Generated text from Gemini:", data.debugText);
      }

      // Handle 202 - file still processing, retry after delay
      if (response.status === 202 && retryCount < 3) {
        console.log(`File still processing (${data.fileState}), retrying in 3 seconds... (attempt ${retryCount + 1}/3)`);
        setLoading(false);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return generateQuestions(retryCount + 1, signal);
      }

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Generieren");
      }

      if (!data.questions || data.questions.length === 0) {
        console.warn("No questions generated");
        console.warn("Debug info:", { data, response: response.status });
        setError("Keine Fragen generiert. Bitte versuchen Sie es erneut.");
        return;
      }

      // Save to cache
      const cacheKey = getCacheKey();
      const cacheData = {
        questions: data.questions,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log("Questions cached for 5 minutes");

      setQuestions(data.questions);
      console.log("Questions set successfully:", data.questions);
    } catch (err: any) {
      // Ignore abort errors (expected when component unmounts)
      if (err.name === 'AbortError') {
        console.log("Request was aborted");
        return;
      }

      console.error("Generate questions error:", err);
      setError(err.message || "Fehler beim Generieren der Fragen");
    } finally {
      setLoading(false);
    }
  }

  if (fileUris.length === 0) return null;
  if (error) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h3 className="font-medium text-gray-900">Vorgeschlagene Fragen</h3>
        </div>
        {!loading && questions.length > 0 && (
          <button
            onClick={onDismiss}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Ausblenden
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-gray-600">
            Generiere Fragen...
          </span>
        </div>
      ) : questions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {questions.map((question, index) => (
            <button
              key={index}
              onClick={() => {
                onQuestionClick(question);
                onDismiss();
              }}
              className="text-left p-3 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg text-sm text-gray-700 hover:text-blue-700 transition-colors"
            >
              <span className="text-blue-500 font-medium mr-2">{index + 1}.</span>
              {question}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Keine Fragen verfügbar
        </p>
      )}
    </div>
  );
}
