"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Code, X } from "lucide-react";

interface EmbedCodeModalProps {
  chatName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function EmbedCodeModal({ chatName, isOpen, onClose }: EmbedCodeModalProps) {
  const [mode, setMode] = useState<"popup" | "inline">("popup");
  const [position, setPosition] = useState("bottom-right");
  const [theme, setTheme] = useState("blue");
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [framework, setFramework] = useState<"html" | "nextjs">("html");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
      setIsClient(true);
    }
  }, []);

  if (!isOpen || !isClient) return null;

  const inlineCodeHTML = `<!-- Google RAG Chatbot - Inline Mode -->
<div id="chat-container" style="width: 100%; height: 600px;"></div>
<script src="${baseUrl}/widget.js"
        data-chat-name="${chatName}"
        data-mode="inline"
        data-container="chat-container"
        data-theme="${theme}"
        defer></script>`;

  const popupCodeHTML = `<!-- Google RAG Chatbot - Popup Mode -->
<script src="${baseUrl}/widget.js"
        data-chat-name="${chatName}"
        data-mode="popup"
        data-position="${position}"
        data-theme="${theme}"
        defer></script>`;

  const inlineCodeNextJS = `{/* Google RAG Chatbot - Inline Mode */}
<div id="chat-container" style={{ width: '100%', height: '600px' }}></div>
<div
  dangerouslySetInnerHTML={{
    __html: \`<script src="${baseUrl}/widget.js" data-chat-name="${chatName}" data-mode="inline" data-container="chat-container" data-theme="${theme}" defer></script>\`,
  }}
/>`;

  const popupCodeNextJS = `{/* Google RAG Chatbot - Popup Mode */}
<div
  dangerouslySetInnerHTML={{
    __html: \`<script src="${baseUrl}/widget.js" data-chat-name="${chatName}" data-mode="popup" data-position="${position}" data-theme="${theme}" defer></script>\`,
  }}
/>`;

  const embedCode = framework === "nextjs"
    ? (mode === "inline" ? inlineCodeNextJS : popupCodeNextJS)
    : (mode === "inline" ? inlineCodeHTML : popupCodeHTML);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Embed Code Generator</h2>
              <p className="text-sm text-gray-500">Chat in deine Website einbinden</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Framework Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Framework
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFramework("html")}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  framework === "html"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">Standard HTML</div>
                <div className="text-xs text-gray-500 mt-1">
                  Für normale Websites
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFramework("nextjs")}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  framework === "nextjs"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">Next.js / React</div>
                <div className="text-xs text-gray-500 mt-1">
                  Mit dangerouslySetInnerHTML
                </div>
              </button>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Einbindungs-Modus
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMode("popup")}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  mode === "popup"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">Popup Widget</div>
                <div className="text-xs text-gray-500 mt-1">
                  Toggle-Button mit minimierba rem Chat
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("inline")}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  mode === "inline"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">Inline Embed</div>
                <div className="text-xs text-gray-500 mt-1">
                  Fester iframe in Container
                </div>
              </button>
            </div>
          </div>

          {/* Position (nur für Popup) */}
          {mode === "popup" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Position
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bottom-right">Unten Rechts</option>
                <option value="bottom-left">Unten Links</option>
                <option value="top-right">Oben Rechts</option>
                <option value="top-left">Oben Links</option>
              </select>
            </div>
          )}

          {/* Theme Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Farbschema
            </label>
            <div className="grid grid-cols-5 gap-3">
              {[
                { id: "blue", color: "#3b82f6", name: "Blau" },
                { id: "green", color: "#10b981", name: "Grün" },
                { id: "purple", color: "#8b5cf6", name: "Lila" },
                { id: "orange", color: "#f59e0b", name: "Orange" },
                { id: "pink", color: "#ec4899", name: "Pink" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`p-3 border-2 rounded-lg text-center transition-all ${
                    theme === t.id
                      ? "border-gray-900 shadow-md"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className="w-full h-8 rounded mb-2"
                    style={{ backgroundColor: t.color }}
                  />
                  <div className="text-xs font-medium text-gray-900">{t.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Code Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Embed Code
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Kopiert!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Kopieren</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm font-mono">
                <code>{embedCode}</code>
              </pre>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📌 Anleitung</h3>
            {framework === "html" ? (
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Kopiere den Code oben</li>
                <li>Füge ihn vor dem schließenden <code className="bg-blue-100 px-1 rounded">&lt;/body&gt;</code> Tag ein</li>
                <li>Ersetze ggf. die Domain in der URL mit deiner Production-Domain</li>
                <li>Fertig! 🎉</li>
              </ol>
            ) : (
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Kopiere den Code oben</li>
                <li>Füge ihn in deine <code className="bg-blue-100 px-1 rounded">layout.tsx</code> oder Component ein (vor <code className="bg-blue-100 px-1 rounded">&lt;/body&gt;</code>)</li>
                <li>Stelle sicher, dass die CSP (Content Security Policy) die Widget-Domain erlaubt</li>
                <li>Ersetze ggf. die Domain mit deiner Production-Domain</li>
                <li>Fertig! 🎉</li>
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
