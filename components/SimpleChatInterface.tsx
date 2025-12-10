"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, AlertCircle, FileText, ChevronRight, Menu, X, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { useTypewriter } from "@/hooks/useTypewriter";
import { Source } from "@/hooks/useChatHistory";
import SuggestedQuestions from "./SuggestedQuestions";
import { ColorTheme } from "@/lib/themes";
import { useRouter } from "next/navigation";
import FeedbackButtons from "./FeedbackButtons";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import VoiceSettingsModal from "./VoiceSettingsModal";
import TypingIndicator from "./TypingIndicator";
import CodeBlock from "./CodeBlock";
import MessageWithCitations from "./MessageWithCitations";
import DocumentPreviewModal from "./DocumentPreviewModal";

interface Citation {
  startIndex: number;
  endIndex: number;
  text: string;
  sourceIndices: number[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  citations?: Citation[];
  messageId?: string;
  feedback?: 1 | -1 | null;
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
    localPath?: string; // Local file path for preview
  }>;
  createdAt: number;
  systemInstruction?: string;
  allowedDomains?: string[];
  defaultQuestions?: string[];
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
  onClose,
  onDocumentClick,
}: {
  sources: Source[];
  isOpen: boolean;
  onClose: () => void;
  onDocumentClick?: (source: Source) => void;
}) {
  const [sourceImages, setSourceImages] = useState<Record<string, string | null>>({});
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  // Fetch OG images on-demand for sources with URLs
  useEffect(() => {
    sources.forEach(async (source) => {
      const sourceUrl = source.url;
      if (sourceUrl && !sourceImages.hasOwnProperty(sourceUrl) && !loadingImages.has(sourceUrl)) {
        setLoadingImages(prev => new Set(prev).add(sourceUrl));

        try {
          const response = await fetch(`/api/fetch-og-image?url=${encodeURIComponent(sourceUrl)}`);
          const data = await response.json();

          setSourceImages(prev => ({
            ...prev,
            [sourceUrl]: data.imageUrl || null
          }));
        } catch (error) {
          console.error('Error fetching OG image:', error);
          setSourceImages(prev => ({
            ...prev,
            [sourceUrl]: null
          }));
        } finally {
          setLoadingImages(prev => {
            const next = new Set(prev);
            next.delete(sourceUrl);
            return next;
          });
        }
      }
    });
  }, [sources]);

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
            {sources.map((source, index) => {
              const sourceUrl = source.url;
              return (
              <div
                key={index}
                className="group"
              >
                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden transition-all hover:shadow-md"
                    style={{
                      backgroundColor: "var(--color-background)",
                    }}
                  >
                    {/* Show loading skeleton while fetching image */}
                    {loadingImages.has(sourceUrl) && (
                      <div className="relative w-full h-32 bg-gray-200 animate-pulse">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                        </div>
                      </div>
                    )}
                    {/* Show fetched OG image */}
                    {!loadingImages.has(sourceUrl) && sourceImages[sourceUrl] && (
                      <div className="relative w-full h-32 bg-gray-100">
                        <img
                          src={sourceImages[sourceUrl]!}
                          alt={source.displayName}
                          className="w-full h-full object-cover transition-opacity duration-300 opacity-100"
                          loading="lazy"
                          onError={(e) => {
                            // Hide image on error
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-start space-x-2">
                        {!loadingImages.has(sourceUrl) && !sourceImages[sourceUrl] && (
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
                ) : source.localPath && onDocumentClick ? (
                  <button
                    onClick={() => onDocumentClick(source)}
                    className="block w-full text-left rounded-lg overflow-hidden transition-all hover:shadow-md"
                    style={{
                      backgroundColor: "var(--color-background)",
                    }}
                  >
                    {/* For document sources, show clickable card */}
                    <div className="p-3">
                      <div className="flex items-start space-x-2">
                        <FileText
                          className="w-4 h-4 flex-shrink-0 mt-0.5"
                          style={{ color: "var(--color-primary)" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium break-words line-clamp-2" style={{ color: "var(--color-text)" }}>
                            {source.displayName}
                          </p>
                          <div className="flex items-center mt-1">
                            <span className="text-xs" style={{ color: "var(--color-text-light)" }}>
                              Dokument öffnen
                            </span>
                            <ChevronRight className="w-3 h-3 ml-1" style={{ color: "var(--color-text-light)" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div
                    className="block rounded-lg overflow-hidden"
                    style={{
                      backgroundColor: "var(--color-background)",
                    }}
                  >
                    {/* For sources without URLs and without fileName, just show icon */}
                    <div className="p-3">
                      <div className="flex items-start space-x-2">
                        <FileText
                          className="w-4 h-4 flex-shrink-0 mt-0.5"
                          style={{ color: "var(--color-primary)" }}
                        />
                        <p className="text-sm font-medium break-words flex-1 line-clamp-2" style={{ color: "var(--color-text)" }}>
                          {source.displayName}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
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
  citations,
  onComplete,
  onDocumentClick,
}: {
  content: string;
  sources?: Source[];
  citations?: Citation[];
  onComplete?: () => void;
  onDocumentClick?: (source: Source) => void;
}) {
  const { displayedText, isComplete, skip } = useTypewriter({
    text: content,
    speed: 50,
    onComplete,
  });

  // Only show citations when typewriter is complete
  const displayCitations = isComplete ? citations : undefined;

  return (
    <div>
      <div
        className="prose prose-sm sm:prose-base max-w-none cursor-pointer"
        onClick={skip}
        title={isComplete ? "" : "Klicken um vollständigen Text anzuzeigen"}
      >
        <MessageWithCitations
          content={displayedText}
          citations={displayCitations}
          sources={sources}
          onDocumentClick={onDocumentClick}
        />
        {!isComplete && (
          <span className="inline-block w-1 h-4 ml-1 animate-pulse" style={{ backgroundColor: "var(--color-text-light)" }} />
        )}
      </div>
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
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState<Source | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const router = useRouter();

  // Text-to-Speech
  const tts = useTextToSpeech();

  // Speech-to-Text with auto-send functionality
  const stt = useSpeechToText({
    autoSend: true,
    onFinalResult: (transcript) => {
      // Set the input value to the transcript
      setInput(transcript);
      // Auto-send the message
      setTimeout(() => {
        handleSend(transcript);
      }, 100);
    },
  });

  const fileUris = chatConfig.files;

  // Handler for opening document preview modal
  const handleDocumentClick = (source: Source) => {
    setPreviewSource(source);
    setIsPreviewOpen(true);
  };

  const scrollToLastUserMessage = () => {
    // Wait for DOM to fully render before scrolling
    requestAnimationFrame(() => {
      if (lastUserMessageRef.current && messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        const element = lastUserMessageRef.current;

        // Get positions using getBoundingClientRect for accurate positioning
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Calculate the distance from container top to element top
        const relativeTop = elementRect.top - containerRect.top;

        // Add current scroll position to get absolute scroll position
        const targetScrollTop = container.scrollTop + relativeTop;

        // Get container's padding-top to position exactly at top
        const computedStyle = window.getComputedStyle(container);
        const paddingTop = parseInt(computedStyle.paddingTop, 10);

        // Scroll to position - accounting for padding positions message at viewport top
        container.scrollTop = targetScrollTop - paddingTop;
      }
    });
  };

  useEffect(() => {
    // Only scroll when a new user message is added
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      scrollToLastUserMessage();
    }
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

  // Auto-play TTS for new assistant messages
  useEffect(() => {
    if (!latestAssistantId || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant" || !lastMessage.content) return;

    // Only speak if we haven't spoken this message yet
    const messageId = lastMessage.messageId || latestAssistantId;
    if (lastSpokenMessageIdRef.current === messageId) return;

    // Mark as spoken
    lastSpokenMessageIdRef.current = messageId;

    // Wait for typewriter to finish
    const timer = setTimeout(() => {
      if (tts.isEnabled && tts.autoPlay) {
        tts.speak(lastMessage.content, messageId);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [latestAssistantId]); // Only trigger on new assistant messages

  async function handleSend(messageText?: string) {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setUsedSources([]); // Clear sources for new question - reset sidebar
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
      let citations: Citation[] | undefined;

      // Extract citations first (needed for sidebar filtering)
      if (data.citations && Array.isArray(data.citations) && data.citations.length > 0) {
        citations = data.citations;
      }

      if (data.usedFileUris && data.usedFileUris.length > 0) {
        // IMPORTANT: Preserve the order of usedFileUris for correct citation indices
        // The usedFileUris from API are in format "{storeName}/files/{filename}"
        // We need to match by the filename (last part after "/files/")
        sources = data.usedFileUris.map((uri: string) => {
          // Extract the filename from the URI (after "/files/")
          const uriFilename = uri.includes("/files/")
            ? uri.split("/files/").pop()
            : uri.split("/").pop();

          // Match by displayName or the extracted filename
          const file = fileUris.find((f) => {
            const fileDisplayName = f.displayName || f.name.split("/").pop() || f.name;
            return fileDisplayName === uriFilename || f.uri === uri;
          });

          if (!file) return null;

          const displayName = file.displayName || file.name.split("/").pop() || file.name;

          // For document uploads (without URL), include localPath and mimeType for preview
          if (!file.url && file.name) {
            return {
              displayName,
              fileName: file.name, // Google Gemini file name (e.g., "files/abc123")
              mimeType: file.mimeType,
              localPath: file.localPath, // Local file path for preview
            };
          }

          // For website sources, include URL
          return {
            displayName,
            url: file.url,
          };
        }).filter((s: Source | null): s is Source => s !== null);

        // Update sidebar sources - only show cited sources, not all used files
        if (citations && citations.length > 0 && sources && sources.length > 0) {
          // Extract unique source indices from citations
          const citedSourceIndices = new Set<number>();
          citations.forEach(citation => {
            citation.sourceIndices.forEach(idx => citedSourceIndices.add(idx));
          });

          // Get only the sources that were actually cited
          const sourcesArray = sources; // TypeScript type guard
          const citedSources = Array.from(citedSourceIndices)
            .map(idx => sourcesArray[idx])
            .filter((s): s is Source => s !== undefined);

          // Replace sidebar sources with only the cited sources (don't accumulate)
          setUsedSources(citedSources);
        } else if (sources && sources.length > 0) {
          // Fallback: If no citations, show all sources
          setUsedSources(sources);
        }
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        messageId: data.messageId || undefined,
        feedback: null,
        sources: sources,
        citations: citations,
      };

      setLatestAssistantId(Date.now().toString());
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
        onDocumentClick={handleDocumentClick}
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

            {/* Voice Button */}
            {tts.isSupported && (
              <button
                onClick={() => setVoiceSettingsOpen(true)}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                title={tts.isEnabled ? "Sprachausgabe aktiv" : "Sprachausgabe aktivieren"}
              >
                {tts.isEnabled ? (
                  <Volume2 className={`w-5 h-5 ${tts.isSpeaking ? 'animate-pulse' : ''}`} />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6"
          style={{ scrollBehavior: 'smooth' }}
        >
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
                    customQuestions={chatConfig.defaultQuestions}
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

              const isLastUserMessage =
                message.role === "user" &&
                index === messages.length - 1;

              return (
                <motion.div
                  key={index}
                  ref={isLastUserMessage ? lastUserMessageRef : null}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex space-x-2 sm:space-x-3 max-w-[90%] sm:max-w-[85%] lg:max-w-[80%] ${
                      message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                    }`}
                  >
                    {/* Avatar */}
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
                        border: message.role === "assistant" ? "2px solid var(--color-text-light)" : "none",
                      }}
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.01, y: -2 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 py-3 sm:px-5 sm:py-3 rounded-2xl shadow-lg backdrop-blur-sm"
                      style={{
                        backgroundColor:
                          message.role === "user"
                            ? "var(--color-primary)"
                            : "rgba(255, 255, 255, 0.9)",
                        color:
                          message.role === "user"
                            ? "var(--color-surface)"
                            : "var(--color-text)",
                        border: message.role === "assistant" ? "1px solid rgba(0, 0, 0, 0.08)" : "none",
                      }}
                    >
                  {message.role === "assistant" ? (
                    isLatestAssistant ? (
                      <TypedMessage
                        content={message.content}
                        sources={message.sources}
                        citations={message.citations}
                        onComplete={() => setLatestAssistantId(null)}
                        onDocumentClick={handleDocumentClick}
                      />
                    ) : (
                      <div>
                        <MessageWithCitations
                          content={message.content}
                          citations={message.citations}
                          sources={message.sources}
                          onDocumentClick={handleDocumentClick}
                        />
                        <FeedbackButtons
                          messageId={message.messageId}
                          initialFeedback={message.feedback}
                          onFeedbackGiven={(feedback) => {
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.messageId === message.messageId ? { ...m, feedback } : m
                              )
                            );
                          }}
                        />
                      </div>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
                  )}
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}

            {loading && <TypingIndicator />}
          </div>
        </div>

        {/* Input */}
        <div className="border-t p-4 sm:p-6" style={{ borderColor: "var(--color-text-light)", backgroundColor: "var(--color-surface)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="flex space-x-2 sm:space-x-3">
              <textarea
                value={stt.isListening ? (stt.interimTranscript || input) : input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={stt.isListening ? "Sprechen Sie jetzt..." : "Stelle eine Frage zu deinen Dokumenten..."}
                className="flex-1 border rounded-xl px-4 py-3 sm:px-5 sm:py-3 focus:outline-none focus:ring-2 resize-none shadow-sm transition-shadow focus:shadow-md"
                style={{
                  borderColor: stt.isListening ? "var(--color-primary)" : "var(--color-text-light)",
                  backgroundColor: "var(--color-background)",
                  color: "var(--color-text)",
                }}
                rows={3}
                disabled={loading || stt.isListening}
              />

              {/* Microphone Button */}
              {stt.isSupported && (
                <button
                  onClick={() => {
                    if (stt.isListening) {
                      stt.stopListening();
                    } else {
                      stt.startListening();
                    }
                  }}
                  disabled={loading}
                  className="text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: stt.isListening ? "#ef4444" : "var(--color-primary)",
                  }}
                  title={stt.isListening ? "Aufnahme stoppen" : "Spracherkennung starten"}
                >
                  {stt.isListening ? (
                    <Mic className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                  ) : (
                    <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </button>
              )}

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading || stt.isListening}
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

            {/* Error message */}
            {stt.error && (
              <p className="text-xs mt-2 px-1 text-red-500">
                ⚠️ {stt.error}
              </p>
            )}

            <p className="text-xs mt-2 sm:mt-3 px-1" style={{ color: "var(--color-text-light)" }}>
              {stt.isSupported
                ? "Drücke Enter zum Senden, Shift+Enter für neue Zeile, oder nutze das Mikrofon"
                : "Drücke Enter zum Senden, Shift+Enter für neue Zeile"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={voiceSettingsOpen}
        onClose={() => setVoiceSettingsOpen(false)}
        isEnabled={tts.isEnabled}
        autoPlay={tts.autoPlay}
        rate={tts.rate}
        pitch={tts.pitch}
        selectedVoice={tts.selectedVoice}
        availableVoices={tts.availableVoices}
        usePremiumTTS={tts.usePremiumTTS}
        premiumVoices={tts.premiumVoices}
        premiumVoiceId={tts.premiumVoiceId}
        onToggleEnabled={tts.toggleEnabled}
        onToggleAutoPlay={tts.toggleAutoPlay}
        onTogglePremiumTTS={tts.togglePremiumTTS}
        onRateChange={tts.setRate}
        onPitchChange={tts.setPitch}
        onVoiceChange={tts.setVoice}
        onPremiumVoiceChange={tts.setPremiumVoice}
        onTest={(text) => tts.speak(text)}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        source={previewSource}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewSource(null);
        }}
      />
    </div>
  );
}
