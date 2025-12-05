import { useState, useEffect, useCallback } from "react";

export interface Source {
  displayName: string;
  url?: string; // Only present for scraped websites
  image?: string; // Teaser image URL
  fileName?: string; // Google Gemini file name (e.g., "files/abc123") for uploaded documents
  mimeType?: string; // MIME type for determining preview type
  localPath?: string; // Local file path for document preview
  isFormular?: boolean; // True for downloadable forms (marked in DB)
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
  }>;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "chat-history";
const MAX_SESSIONS = 10;

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSessions(parsed);

        // Set current session to the most recent one if exists
        if (parsed.length > 0 && !currentSessionId) {
          setCurrentSessionId(parsed[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      } catch (error) {
        console.error("Failed to save chat history:", error);
      }
    }
  }, [sessions]);

  // Get current session
  const getCurrentSession = useCallback(() => {
    if (!currentSessionId) return null;
    return sessions.find((s) => s.id === currentSessionId) || null;
  }, [sessions, currentSessionId]);

  // Create new session
  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "Neuer Chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev].slice(0, MAX_SESSIONS);
      return updated;
    });
    setCurrentSessionId(newSession.id);

    return newSession.id;
  }, []);

  // Update session messages
  const updateSession = useCallback((sessionId: string, messages: ChatSession["messages"]) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          // Generate title from first user message if title is still default
          const title =
            s.title === "Neuer Chat" && messages.length > 0
              ? messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? "..." : "")
              : s.title;

          return {
            ...s,
            messages,
            title,
            updatedAt: Date.now(),
          };
        }
        return s;
      })
    );
  }, []);

  // Delete session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);

      // If we deleted the current session, switch to another
      if (sessionId === currentSessionId) {
        setCurrentSessionId(updated.length > 0 ? updated[0].id : null);
      }

      return updated;
    });
  }, [currentSessionId]);

  // Load specific session
  const loadSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  // Clear all history
  const clearAllHistory = useCallback(() => {
    setSessions([]);
    setCurrentSessionId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    sessions,
    currentSessionId,
    currentSession: getCurrentSession(),
    createNewSession,
    updateSession,
    deleteSession,
    loadSession,
    clearAllHistory,
  };
}
