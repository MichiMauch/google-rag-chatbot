"use client";

import { FileText, Bot, Sparkles, Search, Database, Globe } from "lucide-react";
import WizardForm from "@/components/WizardForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <FileText className="w-10 h-10 text-blue-500" />
              <Bot className="w-5 h-5 text-blue-600 absolute -bottom-1 -right-1" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Google RAG Chatbot
            </h1>
          </div>
          <a
            href="/admin"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Admin
          </a>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            Powered by Google Gemini 2.5 Flash
          </div>

          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Erstelle deinen eigenen RAG-Chat
          </h2>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Lade deine Dokumente hoch oder scrappe eine Website, wähle dein
            Farbschema und chatte intelligent mit deinen Daten.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Semantische Suche
            </h3>
            <p className="text-sm text-gray-600">
              Intelligente Suche durch deine Dokumente mit Gemini File Search API
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4">
              <Database className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Automatisches Chunking
            </h3>
            <p className="text-sm text-gray-600">
              Deine Dokumente werden automatisch intelligent aufbereitet und indexiert
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Website-Scraping
            </h3>
            <p className="text-sm text-gray-600">
              Scrappe bis zu 500 URLs einer Website mit automatischer Sitemap-Erkennung
            </p>
          </div>
        </div>

        {/* Setup Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Chat konfigurieren
          </h3>
          <p className="text-gray-600 mb-8 text-center">
            Fülle das Formular aus, um deinen eigenen Chat zu erstellen
          </p>

          <WizardForm />
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-3 text-center">
            Unterstützte Dateiformate
          </h4>
          <p className="text-sm text-blue-800 text-center">
            PDF, TXT, DOC, DOCX, CSV, JSON, Markdown und über 100 weitere Formate
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>
            Jeder Chat bekommt seine eigene URL unter{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">
              /chats/[dein-chat-name]
            </code>
          </p>
        </div>
      </div>
    </main>
  );
}
