# Development Guide - Google RAG Chatbot

Comprehensive developer documentation for the Google RAG Chatbot project.

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Architecture Overview](#2-architecture-overview)
3. [Frontend Development](#3-frontend-development)
4. [Backend Development](#4-backend-development)
5. [Database Management](#5-database-management)
6. [Deployment](#6-deployment)
7. [Refactoring Best Practices](#7-refactoring-best-practices)

---

## 1. Getting Started

### Prerequisites

- **Node.js** 18+ (recommend 20+)
- **npm** or **pnpm**
- **Turso CLI** (for database management)
- **Google AI API Key** (Gemini 2.5 Flash)

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-repo/google-rag-chatbot.git
cd google-rag-chatbot

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local  # If example exists, otherwise create .env.local

# Add to .env.local:
GOOGLE_AI_API_KEY=your_gemini_api_key
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token

# 4. Set up Turso database
turso db create google-rag-chatbot
turso db show google-rag-chatbot  # Get connection details
turso db tokens create google-rag-chatbot  # Get auth token

# 5. Run database migrations
npx drizzle-kit push

# 6. Start development server
npm run dev
```

### Development Commands

```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check

# Database commands
npx drizzle-kit studio    # Visual database explorer (http://localhost:4983)
npx drizzle-kit generate  # Generate migration from schema changes
npx drizzle-kit push      # Apply schema changes to database

# Utility scripts
npx tsx scripts/delete-all-files.ts           # Clean up Gemini file storage
npx tsx scripts/migrate-configs-to-db.ts      # Migrate configs to database
```

---

## 2. Architecture Overview

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 15 (App Router) | Server-side rendering, routing, API routes |
| **Language** | TypeScript 5 | Type safety, better DX |
| **Database** | Turso (libSQL/SQLite) | Serverless SQLite database |
| **ORM** | Drizzle ORM v0.44 | Type-safe database queries |
| **AI Provider** | Google Gemini 2.5 Flash | Chat completion, RAG (File Search) |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS framework |
| **UI Components** | Lucide React | Icon library |
| **Charts** | Recharts 3.4 | Data visualization |
| **Notifications** | React Hot Toast | Toast notifications |

### Project Structure

```
google-rag-chatbot/
├── app/                          # Next.js 15 App Router
│   ├── api/                      # API Route Handlers
│   │   ├── chat/route.ts        # Main chat endpoint
│   │   ├── analytics/           # Analytics endpoints (8 routes)
│   │   ├── upload/route.ts      # File upload
│   │   ├── stores/route.ts      # File management
│   │   └── [other routes]/
│   ├── chats/[chatname]/        # Dynamic chat pages
│   ├── embed/[chatname]/        # Embeddable chat widget
│   ├── admin/                   # Analytics dashboard
│   │   ├── page.tsx            # Global analytics
│   │   └── chats/[chatName]/   # Per-chat analytics
│   ├── layout.tsx               # Root layout (metadata, fonts)
│   ├── page.tsx                 # Homepage (wizard form)
│   └── globals.css              # Tailwind imports
│
├── components/                   # Reusable React components (18 files)
│   ├── ChatInterface.tsx        # Main chat UI
│   ├── SimpleChatInterface.tsx  # Simplified chat (no file upload)
│   ├── WizardForm.tsx           # Multi-step chat creation
│   ├── FileUpload.tsx           # Drag & drop file upload
│   ├── ThemePreview.tsx         # Theme customization preview
│   ├── ChatProfileSettings.tsx  # Chat configuration UI
│   └── [other components]/
│
├── lib/                         # Utility libraries & server-side code
│   ├── gemini.ts               # Google AI SDK wrapper
│   ├── analytics.ts            # Analytics functions (914 lines)
│   ├── schema.ts               # Drizzle database schema
│   ├── db.ts                   # Database connection
│   ├── themes.ts               # Theme definitions
│   ├── fileHandler.ts          # File upload utilities
│   └── sitemap.ts              # Sitemap scraping
│
├── hooks/                       # Custom React hooks
│   ├── useTypewriter.ts        # Typewriter animation effect
│   └── useChatHistory.ts       # Chat session persistence
│
├── scripts/                     # Maintenance & utility scripts
│   ├── delete-all-files.ts     # Clean Gemini file storage
│   ├── migrate-configs-to-db.ts # Migrate old JSON configs
│   └── [other scripts]/
│
├── drizzle/                     # Database migrations (auto-generated)
├── public/                      # Static assets
├── .claude/commands/            # Claude Code custom commands
├── docs/                        # Documentation (you are here!)
│
├── .cursorrules                 # AI assistant development rules
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── drizzle.config.ts
└── README.md
```

### System Architecture Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         Next.js 15 App Router           │
│  ┌─────────────┐    ┌────────────────┐ │
│  │  Pages      │    │  API Routes    │ │
│  │ /chats/[id] │───▶│ /api/chat      │ │
│  │ /admin      │    │ /api/analytics │ │
│  └─────────────┘    └────────┬───────┘ │
└─────────────────────────────┼──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
      ┌──────────────┐ ┌───────────┐ ┌──────────────┐
      │ Google       │ │  Turso    │ │ Gemini File  │
      │ Gemini API   │ │  Database │ │ Search Store │
      │ (2.5 Flash)  │ │ (libSQL)  │ │    (RAG)     │
      └──────────────┘ └───────────┘ └──────────────┘
```

### Multi-Tenant Architecture

Each chat instance is fully isolated:

```
/chats/support-bot          /chats/sales-assistant
       │                            │
       ├─ Own File Search Store     ├─ Own File Search Store
       ├─ Own Theme (blue/purple)   ├─ Own Theme (green/modern)
       ├─ Own System Instructions   ├─ Own System Instructions
       ├─ Own Analytics Data        ├─ Own Analytics Data
       └─ Optional Embedding        └─ Optional Embedding
```

---

## 3. Frontend Development

### Component Patterns

#### 3.1 Client vs Server Components

**Server Components** (default in Next.js 15):
```typescript
// app/layout.tsx - No "use client" directive
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Google RAG Chatbot",
  description: "AI-powered chatbot with RAG capabilities",
};

export default function RootLayout({ children }: { children: React.Node }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
```

**Client Components** (interactive UI):
```typescript
// components/ChatInterface.tsx
"use client";  // ← Required for useState, useEffect, event handlers

import { useState, useEffect } from "react";

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // ... component logic
}
```

**Rule of Thumb:**
- Use Server Components for static content, layouts, data fetching
- Use Client Components for interactivity (forms, buttons, modals, animations)

#### 3.2 Co-located Component Pattern

**Example from our successful dashboard refactoring:**

```
app/admin/chats/[chatName]/
├── page.tsx (215 lines - down from 770!)
└── components/
    ├── shared/               # Reusable within this feature
    │   ├── StatsCard.tsx     # Generic stat card
    │   ├── ChartContainer.tsx # Chart wrapper
    │   ├── EmptyState.tsx    # Empty state message
    │   └── TabNavigation.tsx # Tab switcher
    ├── stats/                # Feature-specific grids
    │   ├── ChatStatsGrid.tsx     # 4 main stats
    │   ├── FeedbackStatsGrid.tsx # 3 feedback stats
    │   └── SentimentStatsGrid.tsx # 3 sentiment cards
    ├── tabs/                 # Full tab components
    │   ├── AnalyticsTab.tsx
    │   ├── TemporalTab.tsx
    │   └── AIInsightsTab.tsx
    └── types/                # Type definitions
        └── dashboard.types.ts
```

**Benefits:**
- **Locality:** Related code is physically close
- **Discoverability:** Easy to find where features are implemented
- **Reusability:** Shared components can still be extracted to global `/components/`
- **Refactoring:** Easy to move components up/down the hierarchy as needed

#### 3.3 TypeScript Typing Patterns

**Inline Interfaces (for simple components):**
```typescript
// components/FileUpload.tsx
interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
}

export default function FileUpload({ onFilesSelected, maxFiles = 5 }: FileUploadProps) {
  // ...
}
```

**Separate Type Files (for complex features):**
```typescript
// app/admin/chats/[chatName]/components/types/dashboard.types.ts
export interface ChatStats {
  totalSessions: number;
  totalMessages: number;
  activeSessions: number;
  avgResponseTime: number;
  errorCount: number;
  errorRate: number;
}

export interface FeedbackStats {
  thumbsUp: number;
  thumbsDown: number;
  totalFeedback: number;
  satisfactionScore: number;
}

export type TabType = "analytics" | "temporal" | "ai-insights" | "settings";
```

**Database Types (from Drizzle ORM):**
```typescript
// lib/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  chatName: text("chat_name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Infer types from schema
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
```

#### 3.4 State Management

**Local State (primary pattern):**
```typescript
// No global state management - keep it simple!
function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State updates through callbacks
  const handleSendMessage = async (message: string) => {
    setLoading(true);
    setError(null);

    try {
      // ... API call
      setMessages(prev => [...prev, { role: "user", content: message }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <MessageList messages={messages} />
      <InputField onSend={handleSendMessage} disabled={loading} />
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
```

**Custom Hooks (for reusable logic):**
```typescript
// hooks/useChatHistory.ts
export function useChatHistory(chatName: string) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(`chat-history-${chatName}`);
    if (stored) {
      setSessions(JSON.parse(stored));
    }
  }, [chatName]);

  const addSession = (session: ChatSession) => {
    setSessions(prev => {
      const updated = [...prev, session];
      localStorage.setItem(`chat-history-${chatName}`, JSON.stringify(updated));
      return updated;
    });
  };

  return { sessions, addSession };
}
```

#### 3.5 Styling with Tailwind CSS

**Mobile-First Responsive Design:**
```typescript
<div className="
  w-full              // Mobile: full width
  md:w-1/2            // Tablet: half width
  lg:w-1/3            // Desktop: third width
  xl:w-1/4            // Large desktop: quarter width
">
  <div className="
    text-sm           // Mobile: small text
    sm:text-base      // Small screens: base size
    md:text-lg        // Medium: large
    lg:text-xl        // Large: extra large
  ">
    Content
  </div>
</div>
```

**Dynamic Theming with CSS Variables:**
```typescript
// lib/themes.ts
export const themes = {
  default: {
    name: "Standard",
    colors: {
      primary: "#3b82f6",      // Blue
      secondary: "#8b5cf6",    // Purple
      surface: "#ffffff",
      text: "#1f2937",
    },
  },
  modern: {
    name: "Modern",
    colors: {
      primary: "#10b981",      // Green
      secondary: "#14b8a6",    // Teal
      surface: "#f9fafb",
      text: "#111827",
    },
  },
};

// Apply theme dynamically
function applyTheme(themeId: string) {
  const theme = themes[themeId] || themes.default;
  const root = document.documentElement;

  root.style.setProperty("--color-primary", theme.colors.primary);
  root.style.setProperty("--color-secondary", theme.colors.secondary);
  // ...
}

// Use in components
<div style={{
  backgroundColor: "var(--color-primary)",
  color: "var(--color-surface)"
}}>
  Themed Content
</div>
```

**Conditional Classes:**
```typescript
// ✅ Good: Template literals
<div className={`
  px-4 py-3 rounded-2xl
  ${message.role === "user"
    ? "bg-blue-500 text-white ml-auto"
    : "bg-gray-100 text-gray-900"}
  ${loading ? "opacity-50 pointer-events-none" : ""}
`}>
  {message.content}
</div>

// ✅ Also good: Separate variables for complex logic
const messageClasses = [
  "px-4 py-3 rounded-2xl",
  message.role === "user" ? "bg-blue-500 text-white ml-auto" : "bg-gray-100",
  loading && "opacity-50",
  error && "border-2 border-red-500",
].filter(Boolean).join(" ");

<div className={messageClasses}>
  {message.content}
</div>
```

---

## 4. Backend Development

### 4.1 API Route Structure

**Next.js Route Handlers (App Router):**
```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request
    const { message, chatName, sessionId } = await request.json();

    // 2. Validate input
    if (!message || !chatName) {
      return NextResponse.json(
        { error: "Nachricht und Chat-Name sind erforderlich" },
        { status: 400 }
      );
    }

    // 3. Get or create session (analytics)
    const session = await getOrCreateSession({
      chatName,
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    // 4. Load chat configuration
    const config = await db.query.chatConfigs.findFirst({
      where: eq(chatConfigs.chatName, chatName),
    });

    // 5. Generate AI response with retry logic
    const response = await retryWithBackoff(
      () => generateWithGemini({
        message,
        fileSearchStoreName: config.fileSearchStoreName,
        systemInstruction: config.systemInstruction,
      }),
      maxRetries: 4
    );

    // 6. Log analytics (non-blocking)
    try {
      await logChatMessage({
        sessionId: session.id,
        role: "assistant",
        content: response.text,
        responseTime: Date.now() - startTime,
      });
    } catch (analyticsError) {
      console.error("Analytics error (non-blocking):", analyticsError);
    }

    // 7. Return response
    return NextResponse.json({
      success: true,
      response: response.text,
      sources: response.sources,
    });

  } catch (error: any) {
    console.error("Chat error:", error);

    // User-friendly German error messages
    let errorMessage = "Ein Fehler ist aufgetreten";

    if (error.message?.includes("overloaded")) {
      errorMessage = "⏳ Der Server ist überlastet. Bitte versuche es in wenigen Sekunden erneut.";
    } else if (error.message?.includes("quota")) {
      errorMessage = "❌ API-Limit erreicht. Bitte später erneut versuchen.";
    }

    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: error.status || 500 }
    );
  }
}
```

### 4.2 Error Handling Patterns

**Retry with Exponential Backoff:**
```typescript
// app/api/chat/route.ts (lines 14-58)
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 4,
  baseDelay: number = 2000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      // Retry on 503 (overloaded), fail fast on 429 (quota)
      if (error.status === 503 && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);  // 2s, 4s, 8s, 16s
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For other errors or max retries, throw immediately
      throw error;
    }
  }

  throw new Error("Max retries exceeded");
}
```

**Non-Blocking Analytics:**
```typescript
// Analytics must NEVER break the main user flow
async function processMessage(message: string) {
  const startTime = Date.now();

  // Main logic - MUST succeed
  const response = await generateAIResponse(message);

  // Analytics - failures are logged but don't throw
  try {
    await logChatMessage({
      content: message,
      responseTime: Date.now() - startTime,
    });

    // AI analysis only if enabled
    if (config.aiAnalysisEnabled) {
      await analyzeWithAI(message, response);
    }
  } catch (analyticsError) {
    console.error("Analytics error (non-blocking):", analyticsError);
    // Don't throw - user gets response regardless
  }

  return response;
}
```

### 4.3 Google Gemini Integration

**Basic Usage:**
```typescript
// lib/gemini.ts
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

export const ai = new GoogleGenAI({ apiKey });

// Generate with File Search (RAG)
export async function generateWithFileSearch({
  message,
  fileSearchStoreName,
  systemInstruction,
}: {
  message: string;
  fileSearchStoreName: string;
  systemInstruction?: string;
}) {
  const response = await ai.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: message }] }],
    systemInstruction: systemInstruction || undefined,
    config: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      tools: [{
        fileSearch: {
          fileSearchStoreNames: [fileSearchStoreName],
        },
      }],
    },
  });

  return {
    text: response.text(),
    sources: extractSources(response),
  };
}
```

**File Upload to Gemini:**
```typescript
// lib/fileHandler.ts
export async function uploadFileToGemini(
  file: File,
  displayName: string
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadedFile = await ai.uploadFile({
    file: {
      data: buffer,
      mimeType: file.type,
    },
    displayName,
  });

  return uploadedFile.uri;  // Returns gs:// URI for File Search
}
```

---

## 5. Database Management

### 5.1 Drizzle ORM Basics

**Schema Definition:**
```typescript
// lib/schema.ts
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export const chatSessions = sqliteTable(
  "chat_sessions",
  {
    id: text("id").primaryKey(),
    chatName: text("chat_name").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    lastActivity: integer("last_activity", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    // Indexes for frequently queried columns
    chatNameIdx: index("idx_sessions_chat_name").on(table.chatName),
    lastActivityIdx: index("idx_sessions_last_activity").on(table.lastActivity),
  })
);

export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id").notNull(),
    chatName: text("chat_name").notNull(),
    role: text("role").notNull(),  // "user" | "assistant"
    content: text("content").notNull(),
    sentiment: text("sentiment"),  // "Positiv" | "Neutral" | "Negativ"
    responseTime: integer("response_time"),  // milliseconds
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    sessionIdx: index("idx_messages_session").on(table.sessionId),
    chatNameIdx: index("idx_messages_chat_name").on(table.chatName),
  })
);
```

**Querying:**
```typescript
// lib/analytics.ts
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { chatSessions, chatMessages } from "./schema";

// Simple select
export async function getRecentSessions(chatName: string, limit: number = 50) {
  return await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.chatName, chatName))
    .orderBy(desc(chatSessions.lastActivity))
    .limit(limit);
}

// Aggregations
export async function getChatStats(chatName: string) {
  const [stats] = await db
    .select({
      totalSessions: sql<number>`count(distinct ${chatSessions.id})`,
      totalMessages: sql<number>`count(${chatMessages.id})`,
      avgResponseTime: sql<number>`avg(${chatMessages.responseTime})`,
    })
    .from(chatSessions)
    .leftJoin(chatMessages, eq(chatMessages.sessionId, chatSessions.id))
    .where(eq(chatSessions.chatName, chatName));

  return stats;
}

// Complex joins
export async function getMessagesWithSession(sessionId: string) {
  return await db
    .select({
      message: chatMessages,
      session: chatSessions,
    })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);
}
```

### 5.2 Migrations

**Workflow:**
```bash
# 1. Edit schema in lib/schema.ts
# Example: Add new column
export const chatMessages = sqliteTable("chat_messages", {
  // ... existing columns
  category: text("category"),  // ← New column
});

# 2. Generate migration
npx drizzle-kit generate
# Creates: drizzle/0001_add_category_column.sql

# 3. Review migration file
cat drizzle/0001_add_category_column.sql

# 4. Apply to database
npx drizzle-kit push

# 5. Verify in Drizzle Studio
npx drizzle-kit studio  # Opens http://localhost:4983
```

**Important:**
- Always review generated migrations before applying
- Test on development database first
- Backup production database before migration
- Index new columns if they'll be queried frequently

---

## 6. Deployment

### 6.1 Production Build

```bash
# 1. Ensure environment variables are set
export GOOGLE_AI_API_KEY=your_key
export TURSO_DATABASE_URL=your_url
export TURSO_AUTH_TOKEN=your_token

# 2. Run production build
npm run build

# Output should show:
#  ✓ Compiled successfully in X.Xs
#  ✓ Linting and checking validity of types
#  ✓ Generating static pages (X/X)

# 3. Test production build locally
npm run start
```

### 6.2 Turso Database Setup (Production)

```bash
# Create production database
turso db create google-rag-prod

# Get connection details
turso db show google-rag-prod

# Create authentication token
turso db tokens create google-rag-prod

# Apply schema (from your local drizzle/ folder)
TURSO_DATABASE_URL=libsql://google-rag-prod.turso.io \
TURSO_AUTH_TOKEN=your_token \
npx drizzle-kit push
```

### 6.3 Vercel Deployment (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Set environment variables in Vercel dashboard:
# - GOOGLE_AI_API_KEY
# - TURSO_DATABASE_URL
# - TURSO_AUTH_TOKEN

# 4. Deploy to production
vercel --prod
```

---

## 7. Refactoring Best Practices

### 7.1 Case Study: Dashboard Refactoring

**Context:** Our admin dashboard (`app/admin/chats/[chatName]/page.tsx`) was 770 lines of monolithic code with duplicated patterns.

**Goal:** Improve maintainability, reduce duplication, enable easier testing.

**Approach:** Phase-by-phase refactoring over 6 phases.

#### Phase 1: Foundation (Shared Components)

**Created:**
- `StatsCard.tsx` - Reusable stat card component
- `ChartContainer.tsx` - Standard chart wrapper
- `EmptyState.tsx` - Empty state message component
- `TabNavigation.tsx` - Tab switcher component
- `dashboard.types.ts` - Centralized type definitions

**Code Example:**
```typescript
// Before: Inline stat card (repeated 10+ times)
<div className="bg-white rounded-lg shadow p-6">
  <div className="flex items-center justify-between mb-2">
    <Users className="w-5 h-5 text-blue-500" />
    <span className="text-2xl font-bold">{stats.totalSessions}</span>
  </div>
  <p className="text-sm text-gray-600">Sessions</p>
  <p className="text-xs text-gray-500">{stats.activeSessions} aktiv (24h)</p>
</div>

// After: Reusable component
<StatsCard
  icon={Users}
  iconColor="text-blue-500"
  value={stats.totalSessions}
  label="Sessions"
  subtitle={`${stats.activeSessions} aktiv (24h)`}
/>
```

**Results:**
- Removed 100+ lines of duplicate code
- Created 5 reusable components
- Centralized 15 type definitions
- Build successful ✓

#### Phase 2: Stats Grids

**Created:**
- `ChatStatsGrid.tsx` - Groups 4 main stats
- `FeedbackStatsGrid.tsx` - Groups 3 feedback stats
- `SentimentStatsGrid.tsx` - Groups 3 sentiment cards

**Code Example:**
```typescript
// Before: 7 inline StatsCard components
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <StatsCard icon={Users} value={stats.totalSessions} label="Sessions" />
  <StatsCard icon={MessageSquare} value={stats.totalMessages} label="Fragen" />
  <StatsCard icon={Clock} value={`${avgTime}s`} label="⌀ Antwortzeit" />
  <StatsCard icon={AlertCircle} value={`${errorRate}%`} label="Fehlerrate" />
</div>

// After: Single grid component
<ChatStatsGrid stats={stats} />
```

**Results:**
- Removed 77 lines from page.tsx
- Grouped related stats logically
- Build successful ✓

#### Phase 3: Analytics Tab

**Created:**
- `AnalyticsTab.tsx` - Complete Analytics tab content

**Code Example:**
```typescript
// Before: 83 lines of inline tab content in page.tsx
) : (
  <>
    <ChatStatsGrid stats={stats} />
    {feedbackStats && <FeedbackStatsGrid feedbackStats={feedbackStats} />}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 50+ lines of chart definitions */}
    </div>
    <div className="bg-white rounded-lg shadow p-6">
      {/* 20+ lines of popular questions */}
    </div>
    <div className="bg-white rounded-lg shadow p-6">
      {/* 30+ lines of sessions list */}
    </div>
  </>
)}

// After: Single component
) : (
  <AnalyticsTab
    stats={stats}
    feedbackStats={feedbackStats}
    messagesOverTime={messagesOverTime}
    responseTimes={responseTimes}
    popularQuestions={popularQuestions}
    sessions={sessions}
  />
)}
```

**Results:**
- Removed 83 lines from page.tsx
- Isolated Analytics logic
- Build successful ✓

#### Phases 4-6: Temporal & AI Insights Tabs + Final Cleanup

**Created:**
- `TemporalTab.tsx` - Temporal patterns tab
- `AIInsightsTab.tsx` - AI analysis tab

**Final Results:**
- **Original:** 770 lines in page.tsx
- **Final:** 215 lines in page.tsx
- **Reduction:** 555 lines (72% smaller!)
- **Components Created:** 10 total
- **All builds:** ✓ Successful
- **Functionality:** 100% preserved

### 7.2 Key Lessons Learned

#### ✅ Do:

1. **Refactor in phases** - Don't try to refactor everything at once
2. **Test after each phase** - Run `npm run build` after every commit
3. **Commit frequently** - One commit per phase
4. **Extract shared components first** - Build the foundation before features
5. **Group related UI elements** - Stats grids, tab content, etc.
6. **Use co-located components** - Keep feature components close to where they're used
7. **Centralize types** - Create types/ directories for complex features
8. **Measure progress** - Track lines of code reduction (aim for 50-70%)

#### ❌ Don't:

1. **Don't refactor without tests** - Always build after changes
2. **Don't optimize prematurely** - Focus on readability first
3. **Don't extract too early** - Wait until you see duplication (Rule of Three)
4. **Don't break functionality** - Preserve exact behavior
5. **Don't mix refactoring with features** - Keep commits separate
6. **Don't skip type safety** - Add interfaces for all extracted components
7. **Don't forget documentation** - Update docs when structure changes significantly

### 7.3 Refactoring Checklist

Before refactoring:
- [ ] Identify code duplication (3+ instances = extract)
- [ ] Plan phases (foundation → features → integration)
- [ ] Create feature branch

During each phase:
- [ ] Extract component/types
- [ ] Replace old code with new component
- [ ] Run `npm run build` (must succeed)
- [ ] Test in browser (visual check)
- [ ] Commit with descriptive message

After all phases:
- [ ] Measure improvement (lines of code, readability)
- [ ] Update documentation if structure changed
- [ ] Create PR with before/after comparison
- [ ] Deploy to staging first

---

## 8. Additional Resources

### Documentation
- **Next.js 15 Docs:** https://nextjs.org/docs
- **Drizzle ORM:** https://orm.drizzle.team/docs/overview
- **Turso Docs:** https://docs.turso.tech/
- **Google AI SDK:** https://ai.google.dev/gemini-api/docs
- **Tailwind CSS:** https://tailwindcss.com/docs

### Project-Specific
- **Main README:** `/README.md` (Setup, deployment, architecture)
- **AI Rules:** `/.cursorrules` (Development conventions for AI assistants)
- **Drizzle Schema:** `/lib/schema.ts` (Database schema reference)
- **Analytics Functions:** `/lib/analytics.ts` (914 lines of analytics utilities)

### Getting Help
- Check existing code for patterns (search codebase)
- Refer to `.cursorrules` for conventions
- Read this guide for architecture/workflows
- Ask in team chat/PRs for clarification

---

**Last Updated:** 2025-01-31

**Contributors:** Claude Code (AI Assistant), Development Team
