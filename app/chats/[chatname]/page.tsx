"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import SimpleChatInterface from "@/components/SimpleChatInterface";
import { getThemeById, getThemeStyles, ColorTheme } from "@/lib/themes";

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
    images?: string[];
  }>;
  createdAt: number;
  systemInstruction?: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatName = params.chatname as string;

  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ColorTheme | null>(null);

  useEffect(() => {
    // Load chat configuration from API
    async function loadChatConfig() {
      try {
        const response = await fetch(`/api/chat-config/${chatName}`);

        if (!response.ok) {
          setError(
            "Chat-Konfiguration nicht gefunden. Bitte erstelle einen neuen Chat."
          );
          setLoading(false);
          return;
        }

        const data = await response.json();
        const parsedConfig: ChatConfig = data.config;
        setConfig(parsedConfig);

        // Load theme
        const loadedTheme = getThemeById(parsedConfig.themeId);
        setTheme(loadedTheme);

        setLoading(false);
      } catch (err) {
        console.error("Error loading chat config:", err);
        setError("Fehler beim Laden der Chat-Konfiguration");
        setLoading(false);
      }
    }

    loadChatConfig();
  }, [chatName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Chat wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !config || !theme) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Chat nicht gefunden
          </h1>
          <p className="text-gray-600 mb-6">
            {error ||
              "Diese Chat-Instanz existiert nicht oder wurde gelöscht."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Zurück zur Startseite
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={getThemeStyles(theme)}>
      <SimpleChatInterface
        chatName={config.displayName}
        chatConfig={config}
        theme={theme}
      />
    </div>
  );
}
