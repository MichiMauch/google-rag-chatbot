"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, AlertCircle, FileText, ChevronRight, Menu, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTypewriter } from "@/hooks/useTypewriter";
import { Source } from "@/hooks/useChatHistory";
import SuggestedQuestions from "./SuggestedQuestions";
import ImageGallery from "./ImageGallery";
import { ColorTheme } from "@/lib/themes";
import { useRouter } from "next/navigation";

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

// Component for sources sidebar
function SourcesSidebar({
  sources,
  isOpen,
  onClose
}: {
  sources: Source[];
  isOpen: boolean;
  onClose: () => void;
}) {
  if (sources.length === 0) {
    return (
      <div className="hidden lg:block lg:w-64 xl:w-72 2xl:w-80 border-r flex-shrink-0" style={{ borderColor: "var(--color-text-light)", backgroundColor: "var(--color-surface)" }}>
        <div className="p-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>
            Quellen
          </h3>
          <p className="text-xs" style={{ color: "var(--color-text-light)" }}>
            Stelle eine Frage, um Quellen anzuzeigen
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-80 lg:w-64 xl:w-72 2xl:w-80
          border-r flex-shrink-0
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          borderColor: "var(--color-text-light)",
          backgroundColor: "var(--color-surface)"
        }}
      >
        <div className="h-full overflow-y-auto">
          <div className="p-4 sm:p-6 border-b" style={{ borderColor: "var(--color-text-light)" }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                Berücksichtigte Inhalte
              </h3>
              <button
                onClick={onClose}
                className="lg:hidden p-1 rounded hover:bg-black/5"
              >
                <X className="w-4 h-4" style={{ color: "var(--color-text)" }} />
              </button>
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-light)" }}>
              {sources.length} {sources.length === 1 ? 'Quelle' : 'Quellen'}
            </p>
          </div>

          <div className="p-4 sm:p-6 space-y-3">
            {sources.map((source, index) => (
              <div
                key={index}
                className="group"
              >
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden transition-all hover:shadow-md"
                    style={{
                      backgroundColor: "var(--color-background)",
                    }}
                  >
                    {source.image && (
                      <div className="relative w-full h-32 bg-gray-100">
                        <img
                          src={source.image}
                          alt={source.displayName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-start space-x-2">
                        {!source.image && (
                          <FileText
                            className="w-4 h-4 flex-shrink-0 mt-0.5"
                            style={{ color: "var(--color-primary)" }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium break-words line-clamp-2" style={{ color: "var(--color-text)" }}>
                            {source.displayName}
                          </p>
                          <div className="flex items-center mt-1">
                            <span className="text-xs" style={{ color: "var(--color-text-light)" }}>
                              Link öffnen
                            </span>
                            <ChevronRight className="w-3 h-3 ml-1" style={{ color: "var(--color-text-light)" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </a>
                ) : (
                  <div
                    className="block rounded-lg overflow-hidden"
                    style={{
                      backgroundColor: "var(--color-background)",
                    }}
                  >
                    {source.image && (
                      <div className="relative w-full h-32 bg-gray-100">
                        <img
                          src={source.image}
                          alt={source.displayName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-start space-x-2">
                        {!source.image && (
                          <FileText
                            className="w-4 h-4 flex-shrink-0 mt-0.5"
                            style={{ color: "var(--color-primary)" }}
                          />
                        )}
                        <p className="text-sm font-medium break-words flex-1 line-clamp-2" style={{ color: "var(--color-text)" }}>
                          {source.displayName}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
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
        className="prose prose-sm sm:prose-base max-w-none cursor-pointer"
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [usedSources, setUsedSources] = useState<Source[]>([]);
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

        // Extract sources with teaser images
        sources = usedFiles.map((f) => ({
          displayName: f.displayName || f.name.split("/").pop() || f.name,
          url: f.url,
          image: f.images && f.images.length > 0 ? f.images[0] : undefined,
        }));

        // Update sidebar sources (add unique sources only)
        setUsedSources(prev => {
          const newSources = [...prev];
          sources?.forEach(source => {
            if (!newSources.find(s => s.displayName === source.displayName)) {
              newSources.push(source);
            }
          });
          return newSources;
        });

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

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Sources Sidebar */}
      <SourcesSidebar
        sources={usedSources}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div
          className="text-white p-4 sm:p-6 flex-shrink-0"
          style={{
            background: `linear-gradient(to right, var(--color-primary), var(--color-primary-dark))`,
          }}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/20 transition-colors"
                title="Quellen anzeigen"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-semibold">{chatConfig.displayName}</h2>
                <p className="text-sm opacity-90">
                  {fileUris.length > 0
                    ? `${fileUris.length} Dokument(e) geladen`
                    : "Keine Dokumente geladen"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
            {messages.length === 0 ? (
              <div className="space-y-6">
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
                    className={`flex space-x-2 sm:space-x-3 max-w-[90%] sm:max-w-[85%] lg:max-w-[80%] ${
                      message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                    }`}
                  >
                    <div
                      className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-sm"
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
                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </div>
                    <div
                      className="px-4 py-3 sm:px-5 sm:py-3 rounded-2xl shadow-sm"
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
                        <div className="prose prose-sm sm:prose-base max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        <SourcesDisplay sources={message.sources} />
                        {message.images && message.images.length > 0 && (
                          <ImageGallery images={message.images} maxDisplay={4} />
                        )}
                      </div>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
                  )}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="flex space-x-2 sm:space-x-3 max-w-[90%] sm:max-w-[85%] lg:max-w-[80%]">
                  <div
                    className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      color: "var(--color-text)",
                      border: "1px solid var(--color-text-light)",
                    }}
                  >
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div
                    className="px-4 py-3 sm:px-5 sm:py-3 rounded-2xl shadow-sm"
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
        </div>

        {/* Input */}
        <div className="border-t p-4 sm:p-6" style={{ borderColor: "var(--color-text-light)", backgroundColor: "var(--color-surface)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="flex space-x-2 sm:space-x-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Stelle eine Frage zu deinen Dokumenten..."
                className="flex-1 border rounded-xl px-4 py-3 sm:px-5 sm:py-3 focus:outline-none focus:ring-2 resize-none shadow-sm transition-shadow focus:shadow-md"
                style={{
                  borderColor: "var(--color-text-light)",
                  backgroundColor: "var(--color-background)",
                  color: "var(--color-text)",
                }}
                rows={3}
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: "var(--color-primary)",
                }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>
            </div>
            <p className="text-xs mt-2 sm:mt-3 px-1" style={{ color: "var(--color-text-light)" }}>
              Drücke Enter zum Senden, Shift+Enter für neue Zeile
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
