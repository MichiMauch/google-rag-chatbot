"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, ExternalLink, Mic, Building2, Globe, FileText, Map } from "lucide-react";
import { motion } from "framer-motion";
import { useTypewriter } from "@/hooks/useTypewriter";
import { Source } from "@/hooks/useChatHistory";
import SuggestedQuestions from "./SuggestedQuestions";
import FeedbackButtons from "./FeedbackButtons";
// TTS deaktiviert
// import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import TypingIndicator from "./TypingIndicator";
import MessageWithCitations from "./MessageWithCitations";
import DocumentPreviewModal from "./DocumentPreviewModal";

// ============================================
// HARDCODED CONFIG - Später aus DB/Admin laden
// ============================================
const LOGO_URL = "/muhen.png";

const SIDEBAR_LINKS = [
  { label: "Bau und Planung", href: "https://www.muhen.ch/politik-verwaltung/verwaltung/abteilungen/bau-und-planung.html/245", icon: Building2 },
  { label: "Online-Schalter", href: "https://www.muhen.ch/politik-verwaltung/verwaltung/online-schalter.html/188", icon: Globe },
  { label: "Kt. Aargau Bauverordnung", href: "https://www.ag.ch/de/themen/planen-bauen/baurecht/bauverordnung-(bauv)", icon: FileText },
  { label: "AGIS Geoportal Aargau", href: "https://www.muhen.ch/politik-verwaltung/verwaltung/dienstleistungen.html/149-153-175-267/egov_service/479", icon: Map },
];
// ============================================

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
    localPath?: string;
    isFormular?: boolean;
  }>;
  createdAt: number;
  systemInstruction?: string;
  allowedDomains?: string[];
}

interface GemeindeChatInterfaceProps {
  chatName: string;
  chatConfig: ChatConfig;
}

// Gemeinde Sidebar Component
function GemeindeSidebar() {
  return (
    <div className="w-[280px] bg-white flex-shrink-0 flex flex-col">
      {/* Titel + Logo */}
      <div className="p-6 flex flex-col items-center">
        <h1 className="text-lg font-bold text-gray-800 text-center mb-4">
          KI Baugesuchs-Assistent
        </h1>
        <div className="w-full border-t border-gray-200 mb-4" />
        <div className="w-full mb-3">
          <img
            src={LOGO_URL}
            alt="Gemeinde Wappen"
            className="w-full h-auto max-h-24 object-contain"
            onError={(e) => {
              // Fallback wenn Bild nicht geladen werden kann
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement!.innerHTML = `
                <div class="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span class="text-3xl">🏛️</span>
                </div>
              `;
            }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 border-t border-gray-200" />

      {/* Links */}
      <nav className="px-4 py-6 space-y-0.5">
        {SIDEBAR_LINKS.map((link, index) => (
          <a
            key={index}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-2 py-1.5 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <link.icon className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
              <span className="font-medium">{link.label}</span>
            </div>
            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer Links */}
      <div className="px-4 pb-6 flex gap-4 text-xs text-gray-500">
        <a
          href="https://www.muhen.ch/services/impressum.html/163"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-600 hover:underline"
        >
          Impressum
        </a>
        <a
          href="https://www.muhen.ch/services/datenschutz.html/164"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-600 hover:underline"
        >
          Datenschutz
        </a>
      </div>
    </div>
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

  const displayCitations = isComplete ? citations : undefined;

  // Zeige TypingIndicator solange kein Text da ist
  if (!displayedText) {
    return <TypingIndicator />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
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
          <span className="inline-block w-1 h-4 ml-1 bg-gray-400 animate-pulse" />
        )}
      </div>
    </motion.div>
  );
}

export default function GemeindeChatInterface({
  chatName,
  chatConfig: initialChatConfig,
}: GemeindeChatInterfaceProps) {
  const [chatConfig] = useState<ChatConfig>(initialChatConfig);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [latestAssistantId, setLatestAssistantId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [previewSource, setPreviewSource] = useState<Source | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // TTS deaktiviert
  const stt = useSpeechToText({
    autoSend: true,
    onFinalResult: (transcript) => {
      setInput(transcript);
      setTimeout(() => {
        handleSend(transcript);
      }, 100);
    },
  });

  const fileUris = chatConfig.files || [];

  const handleDocumentClick = (source: Source) => {
    setPreviewSource(source);
    setIsPreviewOpen(true);
  };

  const scrollToLastUserMessage = (userMessageIndex: number) => {
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const element = container.querySelector(`[data-message-index="${userMessageIndex}"]`) as HTMLElement;
      if (!element) return;

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollDistance = elementRect.top - containerRect.top + container.scrollTop - 24;

      container.scrollTo({
        top: scrollDistance,
        behavior: "smooth"
      });
    });
  };

  useEffect(() => {
    const lastUserIndex = messages.reduce((lastIdx, msg, idx) => {
      return msg.role === "user" ? idx : lastIdx;
    }, -1);

    const lastMessage = messages[messages.length - 1];

    if (lastMessage?.role === "user" && lastUserIndex >= 0) {
      scrollToLastUserMessage(lastUserIndex);
    }
  }, [messages]);

  // Load messages from localStorage
  useEffect(() => {
    const storageKey = `chat-messages-${chatName}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    }
  }, [chatName]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      const storageKey = `chat-messages-${chatName}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, chatName]);

  // TTS Auto-play deaktiviert

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
        headers: { "Content-Type": "application/json" },
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

      if (data.citations && Array.isArray(data.citations) && data.citations.length > 0) {
        citations = data.citations;
      }

      if (data.usedFileUris && data.usedFileUris.length > 0) {
        sources = data.usedFileUris.map((uri: string) => {
          const uriFilename = uri.includes("/files/")
            ? uri.split("/files/").pop()
            : uri.split("/").pop();

          const file = fileUris.find((f) => {
            const fileDisplayName = f.displayName || f.name.split("/").pop() || f.name;
            return fileDisplayName === uriFilename || f.uri === uri;
          });

          if (!file) return null;

          const displayName = file.displayName || file.name.split("/").pop() || file.name;

          if (!file.url && file.name) {
            return {
              displayName,
              fileName: file.name,
              mimeType: file.mimeType,
              localPath: file.localPath,
              isFormular: file.isFormular,
            };
          }

          return {
            displayName,
            url: file.url,
          };
        }).filter((s: Source | null): s is Source => s !== null);
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
      setLoading(false);
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `⚠️ **Fehler:** ${error.message}\n\nBitte versuche es erneut.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
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
    <>
      <style jsx global>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: "linear-gradient(-45deg, #60a5fa, #3b82f6, #06b6d4, #22d3ee)",
          backgroundSize: "400% 400%",
          animation: "gradient-shift 15s ease infinite"
        }}
      >
      {/* Main Container - 1440px fixed width with rounded corners */}
      <div className="w-[1280px] h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex">
        {/* Left Sidebar - White */}
        <GemeindeSidebar />

        {/* Right Side - Chat Area with Light Blue Background */}
        <div className="flex-1 flex flex-col bg-blue-50">
          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-6 relative"
            style={{ scrollBehavior: "auto" }}
          >
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 ? (
                <div className="space-y-6">
                  <div className="text-center mt-8 text-gray-500">
                    <Bot className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                    <p className="text-lg font-medium text-gray-700">
                      Willkommen!
                    </p>
                    <p className="text-sm mt-2">
                      {fileUris.length > 0
                        ? "Stellen Sie Ihre Fragen zur Bauverwaltung."
                        : "Wie kann ich Ihnen helfen?"}
                    </p>
                  </div>

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
                  <motion.div
                    key={index}
                    data-message-index={index}
                    initial={message.role === "user" ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: message.role === "user" ? 0 : 0.3,
                      delay: (message.role === "user" || isLatestAssistant) ? 0 : index * 0.05
                    }}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex space-x-3 max-w-[85%] ${
                        message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-600 border-2 border-gray-200"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="w-5 h-5" />
                        ) : (
                          <Bot className="w-5 h-5" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`px-5 py-3 rounded-2xl shadow-sm ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-800 border border-gray-100"
                        }`}
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
                                      m.messageId === message.messageId
                                        ? { ...m, feedback }
                                        : m
                                    )
                                  );
                                }}
                              />
                            </div>
                          )
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {loading && <TypingIndicator />}

              {/* Spacer damit die letzte Nachricht nach oben gescrollt werden kann */}
              {messages.length > 0 && (
                <div className="min-h-[60vh]" aria-hidden="true" />
              )}
            </div>
          </div>

          {/* Input-Feld AUSSERHALB des scrollbaren Bereichs */}
          <div className="p-4 bg-blue-50">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-center bg-white rounded-xl">
                <input
                  type="text"
                  value={stt.isListening ? (stt.interimTranscript || input) : input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    stt.isListening
                      ? "Sprechen Sie jetzt..."
                      : "Stellen Sie Ihre Frage..."
                  }
                  className="flex-1 bg-transparent px-4 py-3 focus:outline-none border-none text-gray-800"
                  disabled={loading || stt.isListening}
                />

                {/* Icons inside input */}
                <div className="flex items-center pr-2 space-x-1">
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
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        stt.isListening
                          ? "bg-red-500 text-white"
                          : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                      }`}
                      title={stt.isListening ? "Aufnahme stoppen" : "Spracherkennung"}
                    >
                      <Mic className={`w-5 h-5 ${stt.isListening ? "animate-pulse" : ""}`} />
                    </button>
                  )}

                  {/* Send Button */}
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading || stt.isListening}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {stt.error && (
                <p className="text-xs mt-2 text-red-500">⚠️ {stt.error}</p>
              )}
            </div>
          </div>
        </div>
      </div>

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
    </>
  );
}
