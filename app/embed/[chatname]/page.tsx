"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import SimpleChatInterface from "@/components/SimpleChatInterface";
import { getThemeById, getThemeStyles, ColorTheme } from "@/lib/themes";

interface ChatConfig {
  chatName: string;
  displayName: string;
  uploadType: "documents" | "website";
  themeId: string;
  fileSearchStoreName?: string;
  allowedDomains?: string[];
  files: Array<{
    name: string;
    mimeType: string;
    uri: string;
    displayName?: string;
    url?: string;
    images?: string[];
  }>;
  createdAt: number;
}

export default function EmbedChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const chatName = params.chatname as string;
  const themeParam = searchParams.get("theme");

  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ColorTheme | null>(null);

  useEffect(() => {
    async function loadChatConfig() {
      try {
        // Get the referring domain for validation
        const referrer = document.referrer;
        let referrerDomain = "";

        if (referrer) {
          try {
            const url = new URL(referrer);
            referrerDomain = url.hostname;
          } catch (e) {
            console.warn("Could not parse referrer:", referrer);
          }
        }

        // Fetch chat configuration from API
        const response = await fetch(`/api/chat-config/${chatName}`);

        if (!response.ok) {
          setError(
            "Chat-Konfiguration nicht gefunden. Bitte stelle sicher, dass der Chat existiert."
          );
          setLoading(false);
          return;
        }

        const data = await response.json();
        const parsedConfig: ChatConfig = data.config;

        // Validate domain if allowedDomains are set
        if (parsedConfig.allowedDomains && parsedConfig.allowedDomains.length > 0) {
          const isAllowed = parsedConfig.allowedDomains.some((domain) => {
            // Remove protocol and trailing slash
            const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

            // Check for wildcard
            if (cleanDomain.startsWith("*.")) {
              const baseDomain = cleanDomain.substring(2);
              return referrerDomain.endsWith(baseDomain);
            }

            return referrerDomain === cleanDomain || referrerDomain === "";
          });

          if (!isAllowed && referrerDomain) {
            setError(
              `Dieser Chat darf nicht von der Domain "${referrerDomain}" eingebettet werden. Erlaubte Domains: ${parsedConfig.allowedDomains.join(", ")}`
            );
            setLoading(false);
            return;
          }
        }

        setConfig(parsedConfig);

        // Load theme (use URL parameter if provided, otherwise use config theme)
        const themeId = themeParam || parsedConfig.themeId;
        const loadedTheme = getThemeById(themeId);
        setTheme(loadedTheme);

        setLoading(false);

        // Send ready event to parent window
        if (window.parent !== window) {
          window.parent.postMessage(
            {
              type: "chat:ready",
              chatName: parsedConfig.displayName,
            },
            "*"
          );
        }
      } catch (err) {
        console.error("Error loading chat config:", err);
        setError("Fehler beim Laden der Chat-Konfiguration");
        setLoading(false);
      }
    }

    loadChatConfig();
  }, [chatName, themeParam]);

  // Listen for messages from parent window
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data.type === "chat:setTheme") {
        const newTheme = getThemeById(event.data.themeId);
        setTheme(newTheme);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
      <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Zugriff verweigert
          </h1>
          <p className="text-gray-600 text-sm">
            {error || "Diese Chat-Instanz existiert nicht oder wurde gelöscht."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={getThemeStyles(theme)} className="h-screen">
      <SimpleChatInterface
        chatName={config.displayName}
        chatConfig={config}
        theme={theme}
      />
    </div>
  );
}
