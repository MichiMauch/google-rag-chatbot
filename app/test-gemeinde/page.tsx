"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import GemeindeChatInterface from "@/components/GemeindeChatInterface";

// Hardcoded chat name for testing
const TEST_CHAT_NAME = "bauverwaltung-muhen-1";

interface ChatConfig {
  chatName: string;
  displayName: string;
  uploadType: "documents" | "website";
  themeId: string;
  fileSearchStoreName?: string;
  files: Array<{
    name: string;
    mimeType: string;
    uri: string;
    displayName?: string;
    url?: string;
    localPath?: string;
    isFormular?: boolean;
  }>;
  createdAt: number;
  systemInstruction?: string;
  allowedDomains?: string[];
}

export default function TestGemeindePage() {
  const [chatConfig, setChatConfig] = useState<ChatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChatConfig() {
      try {
        const response = await fetch(`/api/chat-config/${TEST_CHAT_NAME}`);
        if (!response.ok) {
          throw new Error("Chat-Konfiguration nicht gefunden");
        }
        const data = await response.json();
        setChatConfig(data.config);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchChatConfig();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Lade Gemeinde-Chat...</p>
        </div>
      </div>
    );
  }

  if (error || !chatConfig) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Fehler</h1>
          <p className="text-gray-600 mb-4">
            {error || "Chat-Konfiguration konnte nicht geladen werden"}
          </p>
          <p className="text-sm text-gray-400">
            Chat: {TEST_CHAT_NAME}
          </p>
        </div>
      </div>
    );
  }

  return (
    <GemeindeChatInterface
      chatName={TEST_CHAT_NAME}
      chatConfig={chatConfig}
    />
  );
}
