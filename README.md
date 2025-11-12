# Google RAG Chatbot

Ein RAG (Retrieval Augmented Generation) Chatbot-Prototyp mit der **Google Gemini File Search API**.

## Features

- ✅ **Google Gemini File Search API** - Automatisches Chunking, Embedding und semantische Suche
- ✅ **Multi-Format Support** - PDFs, Word, Text, JSON, XML, CSV und 100+ weitere Formate
- ✅ **File Management** - Hochladen, Anzeigen und Löschen von Dokumenten
- ✅ **Intelligenter Chat** - Fragen zu hochgeladenen Dokumenten stellen
- ✅ **Markdown Rendering** - Formatierte Antworten im Chat
- ✅ **Moderne UI** - Responsive Design mit Tailwind CSS

## Voraussetzungen

- Node.js 18+ installiert
- Google AI API Key (siehe Setup)

## Setup

### 1. Google AI API Key erhalten

1. Gehe zu [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Erstelle einen neuen API Key
3. Kopiere den Key

### 2. Installation

```bash
# Ins Projektverzeichnis wechseln
cd google-rag-chatbot

# Dependencies installieren (bereits erledigt)
# npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env.local
```

### 3. API Key konfigurieren

Öffne `.env.local` und füge deinen API Key ein:

```bash
GOOGLE_AI_API_KEY=dein_api_key_hier
```

### 4. Development Server starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

## Verwendung

### 1. Dokumente hochladen

- Klicke auf "Datei hochladen" im linken Bereich
- Wähle ein Dokument aus (PDF, Word, Text, etc.)
- Das Dokument wird automatisch zu Google hochgeladen und verarbeitet
- Unterstützte Formate: PDF, DOC, DOCX, TXT, JSON, XML, CSV, und viele mehr

### 2. Mit dem Chatbot interagieren

- Stelle Fragen zu deinen hochgeladenen Dokumenten im Chat-Bereich
- Der Chatbot nutzt die Google File Search API für semantische Suche
- Antworten werden basierend auf dem Inhalt deiner Dokumente generiert

### 3. Dokumente verwalten

- Alle hochgeladenen Dokumente werden im linken Bereich angezeigt
- Klicke auf das X-Symbol, um ein Dokument zu löschen
- Die Anzahl der geladenen Dokumente wird im Chat-Header angezeigt

## Architektur

### Tech Stack

- **Next.js 15** - React Framework mit App Router
- **TypeScript** - Type Safety
- **Tailwind CSS** - Styling
- **Google Generative AI SDK** - Google Gemini API Integration
- **Lucide React** - Icons
- **React Markdown** - Markdown Rendering im Chat

### File Structure

```
google-rag-chatbot/
├── app/
│   ├── api/
│   │   ├── upload/route.ts       # File Upload API
│   │   ├── stores/route.ts       # File Management API (List, Delete)
│   │   └── chat/route.ts         # Chat API mit RAG
│   ├── page.tsx                  # Hauptseite
│   ├── layout.tsx                # Root Layout
│   └── globals.css               # Global Styles
├── components/
│   ├── FileUpload.tsx            # File Upload Component
│   └── ChatInterface.tsx         # Chat Component
├── lib/
│   └── gemini.ts                 # Google Gemini API Utilities
├── .env.local                    # Environment Variables (nicht im Repo)
├── .env.example                  # Environment Variables Template
└── README.md                     # Diese Datei
```

## API Endpoints

### POST /api/upload

Lädt eine Datei zur Google File Search API hoch.

**Request:**
- `FormData` mit `file` Field

**Response:**
```json
{
  "success": true,
  "file": {
    "name": "files/xyz",
    "displayName": "document.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": "1234567",
    "uri": "https://generativelanguage.googleapis.com/..."
  }
}
```

### GET /api/stores

Listet alle hochgeladenen Dateien auf.

**Response:**
```json
{
  "success": true,
  "files": [...]
}
```

### DELETE /api/stores

Löscht eine Datei.

**Request:**
```json
{
  "fileName": "files/xyz"
}
```

### POST /api/chat

Sendet eine Chat-Anfrage mit optionalen File URIs für RAG.

**Request:**
```json
{
  "message": "Was ist der Hauptinhalt des Dokuments?",
  "fileUris": ["https://generativelanguage.googleapis.com/..."]
}
```

**Response:**
```json
{
  "success": true,
  "response": "Der Hauptinhalt des Dokuments ist..."
}
```

## Google Gemini File Search API

Die App nutzt die **Google Gemini File Search API**, die folgende Features bietet:

### Automatisches Processing

- **Chunking** - Dokumente werden automatisch in sinnvolle Abschnitte unterteilt
- **Embedding** - Chunks werden in semantische Vektoren umgewandelt
- **Indexierung** - Vektoren werden für schnelle Suche indexiert

### Unterstützte Modelle

- `gemini-2.0-flash-exp` (verwendet in dieser App)
- `gemini-2.5-pro`
- `gemini-2.5-flash`

### Rate Limits

- **Maximale Dateigröße:** 100 MB pro Dokument
- **Storage Limits:**
  - Free Tier: 1 GB
  - Tier 1: 10 GB
  - Tier 2: 100 GB
  - Tier 3: 1 TB

### Pricing

- **Embedding-Kosten:** $0.15 pro Million Tokens beim Indexing
- **Storage:** Kostenlos
- **Query Embeddings:** Kostenlos
- **Retrieved Tokens:** Als normale Context Tokens abgerechnet

## Troubleshooting

### "GOOGLE_AI_API_KEY is not configured"

- Stelle sicher, dass `.env.local` existiert und den API Key enthält
- Starte den Development Server neu nach Änderungen an `.env.local`
- Überprüfe, dass der API Key gültig ist

### File Upload schlägt fehl

- Überprüfe die Dateigröße (max. 100 MB)
- Stelle sicher, dass das Dateiformat unterstützt wird
- Überprüfe die Browser-Konsole für detaillierte Fehlermeldungen

### Chat antwortet nicht korrekt

- Stelle sicher, dass mindestens ein Dokument hochgeladen wurde
- Warte, bis das Dokument vollständig verarbeitet wurde (kann einige Sekunden dauern)
- Die Antworten basieren nur auf dem Inhalt der hochgeladenen Dokumente

## Nächste Schritte

Mögliche Erweiterungen:

1. **Batch Upload** - Mehrere Dateien gleichzeitig hochladen
2. **Chat History** - Gespräche speichern und fortsetzen
3. **Export Funktionen** - Antworten als PDF/Markdown exportieren
4. **Erweiterte Suche** - Filter und erweiterte Suchoptionen
5. **Multi-User Support** - Mehrere Benutzer mit eigenen Dokumenten
6. **Analytics** - Tracking von Fragen und Nutzung

## Deployment

### Vercel (Empfohlen)

1. Pushe dein Projekt zu GitHub
2. Importiere das Projekt in [Vercel](https://vercel.com)
3. Füge die Environment Variable hinzu: `GOOGLE_AI_API_KEY`
4. Deploy!

**Wichtig:** Stelle sicher, dass die API Route für File Upload mit temporären Dateien funktioniert. Auf Serverless-Plattformen wie Vercel musst du eventuell `/tmp` Directory verwenden.

## Lizenz

MIT

---

**Erstellt mit ❤️ für schnelles Prototyping mit Google Gemini**
