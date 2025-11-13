"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, AlertCircle, Trash2, Code, Shield } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTypewriter } from "@/hooks/useTypewriter";
import { Source } from "@/hooks/useChatHistory";
import SuggestedQuestions from "./SuggestedQuestions";
import ImageGallery from "./ImageGallery";
import { ColorTheme } from "@/lib/themes";
import { useRouter } from "next/navigation";
import EmbedCodeModal from "./EmbedCodeModal";
import AllowedDomainsModal from "./AllowedDomainsModal";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  images?: string[];
}

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
  allowedDomains?: string[];
}

interface SimpleChatInterfaceProps {
  chatName: string;
  chatConfig: ChatConfig;
  theme: ColorTheme;
}

// Component for displaying sources
function SourcesDisplay({ sources }: { sources?: Source[] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--color-text-light)" }}>
      <div className="flex items-start space-x-2 text-xs" style={{ color: "var(--color-text-light)" }}>
        <span className="font-medium">📄 Quellen:</span>
        <div className="flex flex-wrap gap-1">
          {sources.map((source, index) =>
            source.url ? (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 rounded underline transition-colors"
                style={{
                  backgroundColor: "var(--color-primary-light)",
                  color: "var(--color-surface)",
                }}
              >
                {source.displayName}
              </a>
            ) : (
              <span
                key={index}
                className="px-2 py-0.5 rounded"
                style={{
                  backgroundColor: "var(--color-background)",
                  color: "var(--color-text)",
                }}
              >
                {source.displayName}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Component for typewriter effect on assistant messages
function TypedMessage({
  content,
  sources,
  images,
  onComplete,
}: {
  content: string;
  sources?: Source[];
  images?: string[];
  onComplete?: () => void;
}) {
  const { displayedText, isComplete, skip } = useTypewriter({
    text: content,
    speed: 50,
    onComplete,
  });

  return (
    <div>
      <div
        className="prose prose-sm max-w-none cursor-pointer"
        onClick={skip}
        title={isComplete ? "" : "Klicken um vollständigen Text anzuzeigen"}
      >
        <ReactMarkdown>{displayedText}</ReactMarkdown>
        {!isComplete && (
          <span className="inline-block w-1 h-4 ml-1 animate-pulse" style={{ backgroundColor: "var(--color-text-light)" }} />
        )}
      </div>
      {isComplete && (
        <>
          <SourcesDisplay sources={sources} />
          {images && images.length > 0 && <ImageGallery images={images} maxDisplay={4} />}
        </>
      )}
    </div>
  );
}

export default function SimpleChatInterface({
  chatName,
  chatConfig: initialChatConfig,
  theme,
}: SimpleChatInterfaceProps) {
  const [chatConfig, setChatConfig] = useState<ChatConfig>(initialChatConfig);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [latestAssistantId, setLatestAssistantId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showDomainsModal, setShowDomainsModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fileUris = chatConfig.files;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages from localStorage on mount
  useEffect(() => {
    const storageKey = `chat-messages-${chatName}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsedMessages = JSON.parse(stored);
        setMessages(parsedMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    }
  }, [chatName]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      const storageKey = `chat-messages-${chatName}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, chatName]);

  async function handleSend(messageText?: string) {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          fileSearchStoreName: chatConfig.fileSearchStoreName,
          files: fileUris,
          systemInstruction: chatConfig.systemInstruction,
          chatName: chatConfig.chatName,
          displayName: chatConfig.displayName,
          uploadType: chatConfig.uploadType,
          themeId: chatConfig.themeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler bei der Anfrage");
      }

      let sources: Source[] | undefined;
      let images: string[] | undefined;

      if (data.usedFileUris && data.usedFileUris.length > 0) {
        const usedFiles = fileUris.filter((f) => data.usedFileUris.includes(f.uri));

        // Extract sources
        sources = usedFiles.map((f) => ({
          displayName: f.displayName || f.name.split("/").pop() || f.name,
          url: f.url,
        }));

        // Extract images from used files (intelligent selection)
        const collectedImages: string[] = [];
        for (const file of usedFiles) {
          if (file.images && file.images.length > 0) {
            collectedImages.push(...file.images);
          }
        }

        // Limit to 3-4 images and remove duplicates
        if (collectedImages.length > 0) {
          const uniqueImages = collectedImages.filter((img, index, arr) => arr.indexOf(img) === index);
          images = uniqueImages.slice(0, 4);
        }
      }

      const messageId = Date.now().toString();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        sources: sources,
        images: images,
      };

      setLatestAssistantId(messageId);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `⚠️ **Fehler:** ${error.message}\n\nBitte versuche es erneut. Falls das Problem weiterhin besteht, versuche es in ein paar Minuten nochmal.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSaveAllowedDomains(domains: string[]) {
    const updatedConfig = {
      ...chatConfig,
      allowedDomains: domains,
    };

    // Update state
    setChatConfig(updatedConfig);

    // Save to localStorage
    localStorage.setItem(`chat-config-${chatConfig.chatName}`, JSON.stringify(updatedConfig));
  }

  async function handleDelete() {
    if (!chatConfig.fileSearchStoreName) {
      console.error("No File Search Store to delete");
      return;
    }

    const confirmed = window.confirm(
      `Möchtest du den Chat "${chatConfig.displayName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const response = await fetch("/api/delete-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatName: chatConfig.chatName,
          fileSearchStoreName: chatConfig.fileSearchStoreName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Löschen");
      }

      // Delete from localStorage
      localStorage.removeItem(`chat-config-${chatConfig.chatName}`);
      localStorage.removeItem(`chat-messages-${chatConfig.chatName}`);

      // Redirect to home
      router.push("/");
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(`Fehler beim Löschen: ${error.message}`);
      setDeleting(false);
    }
  }

  return (
    <>
      <EmbedCodeModal
        chatName={chatConfig.chatName}
        isOpen={showEmbedModal}
        onClose={() => setShowEmbedModal(false)}
      />

      <AllowedDomainsModal
        chatName={chatConfig.chatName}
        currentDomains={chatConfig.allowedDomains}
        isOpen={showDomainsModal}
        onClose={() => setShowDomainsModal(false)}
        onSave={handleSaveAllowedDomains}
      />

      <div className="flex flex-col h-screen" style={{ backgroundColor: "var(--color-background)" }}>
        {/* Header */}
        <div
        className="text-white p-4 flex-shrink-0"
        style={{
          background: `linear-gradient(to right, var(--color-primary), var(--color-primary-dark))`,
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{chatName}</h2>
            <p className="text-sm opacity-90">
              {fileUris.length > 0
                ? `${fileUris.length} Dokument(e) geladen`
                : "Keine Dokumente geladen"}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDomainsModal(true)}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              title="Erlaubte Domains verwalten"
            >
              <Shield className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowEmbedModal(true)}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              title="Embed Code generieren"
            >
              <Code className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Chat löschen"
            >
              {deleting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center mt-8" style={{ color: "var(--color-text-light)" }}>
              <Bot className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--color-text-light)" }} />
              <p className="text-lg font-medium" style={{ color: "var(--color-text)" }}>
                Willkommen!
              </p>
              <p className="text-sm mt-2">
                {fileUris.length > 0
                  ? "Stelle Fragen zu deinen hochgeladenen Dokumenten."
                  : "Lade zuerst Dokumente hoch, um mit dem RAG-System zu chatten."}
              </p>
            </div>

            {/* Suggested Questions */}
            {showSuggestions && fileUris.length > 0 && (
              <SuggestedQuestions
                fileUris={fileUris}
                onQuestionClick={(question) => {
                  setShowSuggestions(false);
                  handleSend(question);
                }}
                onDismiss={() => setShowSuggestions(false)}
              />
            )}
          </div>
        ) : null}

        {messages.map((message, index) => {
          const isLatestAssistant =
            message.role === "assistant" &&
            index === messages.length - 1 &&
            latestAssistantId !== null &&
            !loading;

          return (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex space-x-2 max-w-[80%] ${
                  message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                }`}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor:
                      message.role === "user"
                        ? "var(--color-primary)"
                        : "var(--color-surface)",
                    color:
                      message.role === "user"
                        ? "var(--color-surface)"
                        : "var(--color-text)",
                    border: message.role === "assistant" ? "1px solid var(--color-text-light)" : "none",
                  }}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className="px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor:
                      message.role === "user"
                        ? "var(--color-primary)"
                        : "var(--color-surface)",
                    color:
                      message.role === "user"
                        ? "var(--color-surface)"
                        : "var(--color-text)",
                    border: message.role === "assistant" ? "1px solid var(--color-text-light)" : "none",
                  }}
                >
                  {message.role === "assistant" ? (
                    isLatestAssistant ? (
                      <TypedMessage
                        content={message.content}
                        sources={message.sources}
                        images={message.images}
                        onComplete={() => setLatestAssistantId(null)}
                      />
                    ) : (
                      <div>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        <SourcesDisplay sources={message.sources} />
                        {message.images && message.images.length > 0 && (
                          <ImageGallery images={message.images} maxDisplay={4} />
                        )}
                      </div>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="flex space-x-2 max-w-[80%]">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-text-light)",
                }}
              >
                <Bot className="w-4 h-4" />
              </div>
              <div
                className="px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-text-light)",
                }}
              >
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--color-text)" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4" style={{ borderColor: "var(--color-text-light)", backgroundColor: "var(--color-surface)" }}>
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stelle eine Frage zu deinen Dokumenten..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 resize-none"
            style={{
              borderColor: "var(--color-text-light)",
              backgroundColor: "var(--color-background)",
              color: "var(--color-text)",
            }}
            rows={2}
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            style={{
              backgroundColor: "var(--color-primary)",
            }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--color-text-light)" }}>
          Drücke Enter zum Senden, Shift+Enter für neue Zeile
        </p>
      </div>
      </div>
    </>
  );
}
