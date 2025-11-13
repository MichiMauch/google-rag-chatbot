"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, User, Bot, Clock, FileText } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  responseTimeMs?: number | null;
  sourcesUsed?: string | null;
  hadError?: number | null;
  errorMessage?: string | null;
}

interface Session {
  id: string;
  chatName: string;
  displayName: string;
  createdAt: number;
  lastActivityAt: number;
  totalMessages: number | null;
  totalUserMessages: number | null;
  totalBotMessages: number | null;
  messages: Message[];
}

interface ChatSessionDetailsProps {
  session: Session;
  defaultExpanded?: boolean;
}

export default function ChatSessionDetails({ session, defaultExpanded = false }: ChatSessionDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseSources = (sourcesJson?: string | null): string[] => {
    if (!sourcesJson) return [];
    try {
      return JSON.parse(sourcesJson);
    } catch {
      return [];
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Session Header - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900">
              Session vom {formatDate(session.createdAt)}
            </p>
            <p className="text-sm text-gray-500">
              {session.totalMessages || 0} Nachrichten
              {session.lastActivityAt !== session.createdAt && (
                <span className="ml-2">· Zuletzt: {formatDate(session.lastActivityAt)}</span>
              )}
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-400 font-mono">
          {session.id}
        </div>
      </button>

      {/* Session Messages - Only visible when expanded */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {session.messages.length > 0 ? (
            <div className="p-4 space-y-4">
              {session.messages.map((message) => (
                <div key={message.id} className="flex space-x-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === "user" ? "bg-blue-100" : "bg-green-100"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Bot className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        {message.role === "user" ? "User" : "Assistant"}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(message.createdAt).toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {message.responseTimeMs && (
                          <span className="ml-2 text-purple-600">
                            {(message.responseTimeMs / 1000).toFixed(2)}s
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Message Text */}
                    <div className="text-sm text-gray-700 whitespace-pre-wrap break-words bg-gray-50 rounded-lg p-3">
                      {message.content}
                    </div>

                    {/* Sources */}
                    {message.sourcesUsed && parseSources(message.sourcesUsed).length > 0 && (
                      <div className="mt-2 flex items-start space-x-2 text-xs text-gray-600">
                        <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">Quellen: </span>
                          <span>{parseSources(message.sourcesUsed).join(", ")}</span>
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {message.hadError && (
                      <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
                        <p className="text-xs text-red-800">
                          <span className="font-semibold">Fehler: </span>
                          {message.errorMessage || "Unbekannter Fehler"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              Keine Nachrichten in dieser Session
            </div>
          )}
        </div>
      )}
    </div>
  );
}
