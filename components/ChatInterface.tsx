"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTypewriter } from "@/hooks/useTypewriter";
import { Source } from "@/hooks/useChatHistory";
import SuggestedQuestions from "./SuggestedQuestions";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[]; // Document sources used for this answer
}

interface ChatInterfaceProps {
  fileUris: Array<{
    name: string;
    mimeType: string;
    uri: string;
    displayName?: string;
    url?: string;
  }>;
  messages: Message[];
  onSendMessage: (message: Message) => void;
}

// Component for displaying sources
function SourcesDisplay({ sources }: { sources?: Source[] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-gray-200">
      <div className="flex items-start space-x-2 text-xs text-gray-500">
        <span className="font-medium">📄 Quellen:</span>
        <div className="flex flex-wrap gap-1">
          {sources.map((source, index) => (
            source.url ? (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded text-blue-700 hover:text-blue-900 transition-colors underline"
              >
                {source.displayName}
              </a>
            ) : (
              <span
                key={index}
                className="bg-gray-100 px-2 py-0.5 rounded text-gray-700"
              >
                {source.displayName}
              </span>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

// Component for typewriter effect on assistant messages
function TypedMessage({ content, sources, onComplete }: { content: string; sources?: Source[]; onComplete?: () => void }) {
  const { displayedText, isComplete, skip } = useTypewriter({
    text: content,
    speed: 50,
    onComplete
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
          <span className="inline-block w-1 h-4 bg-gray-400 ml-1 animate-pulse" />
        )}
      </div>
      {isComplete && <SourcesDisplay sources={sources} />}
    </div>
  );
}

export default function ChatInterface({ fileUris, messages, onSendMessage }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [latestAssistantId, setLatestAssistantId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSend(messageText?: string) {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: textToSend,
    };

    // Send user message to parent
    onSendMessage(userMessage);
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
          fileUris: fileUris,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler bei der Anfrage");
      }

      // Only show sources if we have grounding metadata from Gemini
      let sources: Source[] | undefined;

      if (data.usedFileUris && data.usedFileUris.length > 0) {
        // Only show sources that were actually used in the response
        const usedFiles = fileUris.filter(f => data.usedFileUris.includes(f.uri));
        sources = usedFiles.map(f => ({
          displayName: f.displayName || f.name.split('/').pop() || f.name,
          url: f.url,
        }));
      }

      const messageId = Date.now().toString();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        sources: sources,
      };

      // Set this as the latest assistant message to trigger typewriter
      setLatestAssistantId(messageId);

      // Send assistant message to parent
      onSendMessage(assistantMessage);
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Fehler: ${error.message}`,
      };
      onSendMessage(errorMessage);
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
    <div className="flex flex-col h-[600px] border border-gray-200 rounded-lg bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg">
        <h2 className="text-lg font-semibold">RAG Chat mit Google Gemini</h2>
        <p className="text-sm text-blue-100">
          {fileUris.length > 0
            ? `${fileUris.length} Dokument(e) geladen`
            : "Keine Dokumente geladen"}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center text-gray-500 mt-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Willkommen!</p>
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
          // Show typewriter effect for the latest assistant message
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
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`px-4 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {message.role === "assistant" ? (
                    isLatestAssistant ? (
                      <TypedMessage
                        content={message.content}
                        sources={message.sources}
                        onComplete={() => setLatestAssistantId(null)}
                      />
                    ) : (
                      <div>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        <SourcesDisplay sources={message.sources} />
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
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-2 rounded-lg bg-gray-100">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stelle eine Frage zu deinen Dokumenten..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Drücke Enter zum Senden, Shift+Enter für neue Zeile
        </p>
      </div>
    </div>
  );
}
