"use client";

import { BookOpen, Database, Zap, Settings, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";

export default function StoreInfoTab() {
  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Google Gemini File Search Store
          </h2>
        </div>
        <p className="text-gray-700 leading-relaxed">
          Der Gemini File Search Store ist ein vollständig verwalteter Service von Google AI,
          der es ermöglicht, Dokumente hochzuladen und semantisch durchsuchbar zu machen -
          ohne dass Sie eine eigene Vektordatenbank einrichten müssen.
        </p>
      </div>

      {/* How it Works */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-6 h-6 text-yellow-600" />
          <h3 className="text-xl font-bold text-gray-900">
            Wie funktioniert es?
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                1
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Dokumente hochladen</h4>
              <p className="text-gray-700">
                Sie laden Ihre Dokumente (PDFs, TXT, etc.) über die Google File API hoch.
                Diese werden automatisch in einem File Search Store gespeichert.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                2
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Automatisches Chunking</h4>
              <p className="text-gray-700">
                Google teilt Ihre Dokumente automatisch in kleinere Textabschnitte (Chunks) auf.
                Diese Chunks sind optimal für die semantische Suche dimensioniert.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                3
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Vektorisierung & Indexierung</h4>
              <p className="text-gray-700">
                Jeder Chunk wird automatisch in Vektoren umgewandelt und indexiert.
                Dies geschieht vollständig im Hintergrund - Sie müssen keine Vektordatenbank
                wie Pinecone, Weaviate oder ChromaDB selbst betreiben.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                4
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Semantische Suche</h4>
              <p className="text-gray-700">
                Wenn Sie eine Query stellen, durchsucht Google die Chunks semantisch
                (nach Bedeutung, nicht nur nach Keywords) und gibt die relevantesten
                Ergebnisse mit Relevanz-Scores zurück.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-bold text-gray-900">
            Hauptmerkmale
          </h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900">Managed Service</h4>
              <p className="text-sm text-gray-700">
                Keine Infrastruktur-Verwaltung nötig
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900">Automatisches Chunking</h4>
              <p className="text-sm text-gray-700">
                Intelligente Aufteilung in optimale Textabschnitte
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900">Vektorisierung inklusive</h4>
              <p className="text-sm text-gray-700">
                Keine eigene Vektordatenbank erforderlich
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900">Semantic Search</h4>
              <p className="text-sm text-gray-700">
                Suche nach Bedeutung, nicht nur Keywords
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900">Relevanz-Scores</h4>
              <p className="text-sm text-gray-700">
                Jedes Ergebnis erhält einen Relevanz-Score
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900">CRUD-Operationen</h4>
              <p className="text-sm text-gray-700">
                Chunks können bearbeitet und gelöscht werden
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Limitations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-orange-600" />
          <h3 className="text-xl font-bold text-gray-900">
            Limitierungen
          </h3>
        </div>
        <ul className="space-y-2 text-gray-700">
          <li className="flex gap-2">
            <span className="text-orange-600">•</span>
            <span>Max. 20 Dokumente pro API-Call beim Listing</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange-600">•</span>
            <span>Max. 100 Chunks pro Query-Ergebnis</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange-600">•</span>
            <span>Chunking-Größe wird von Google bestimmt (nicht konfigurierbar)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange-600">•</span>
            <span>Nur über REST API verfügbar (nicht über alle SDKs)</span>
          </li>
        </ul>
      </div>

      {/* Important Links */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold text-gray-900">
            Wichtige Links
          </h3>
        </div>
        <div className="space-y-3">
          <a
            href="https://ai.google.dev/gemini-api/docs/file-api"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Gemini File API - Offizielle Dokumentation</span>
          </a>

          <a
            href="https://ai.google.dev/gemini-api/docs/document-processing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Document Processing Guide</span>
          </a>

          <a
            href="https://ai.google.dev/gemini-api/docs/semantic-retrieval"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Semantic Retrieval & Search</span>
          </a>

          <a
            href="https://ai.google.dev/api/files"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            <span>File API Reference</span>
          </a>

          <a
            href="https://ai.google.dev/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Pricing Information</span>
          </a>

          <a
            href="https://ai.google.dev/gemini-api/docs/thinking"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Best Practices für RAG mit Gemini</span>
          </a>
        </div>
      </div>

      {/* Use Cases */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          Typische Anwendungsfälle
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Dokumenten-Q&A</h4>
            <p className="text-sm text-gray-700">
              Chatbot, der Fragen zu hochgeladenen Dokumenten beantwortet
            </p>
          </div>

          <div className="bg-white rounded p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Knowledge Base</h4>
            <p className="text-sm text-gray-700">
              Durchsuchbare Wissensdatenbank für Unternehmensdokumente
            </p>
          </div>

          <div className="bg-white rounded p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Content Discovery</h4>
            <p className="text-sm text-gray-700">
              Semantische Suche durch große Dokumentensammlungen
            </p>
          </div>

          <div className="bg-white rounded p-4">
            <h4 className="font-semibold text-gray-900 mb-2">RAG-Systeme</h4>
            <p className="text-sm text-gray-700">
              Retrieval Augmented Generation für präzisere AI-Antworten
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
