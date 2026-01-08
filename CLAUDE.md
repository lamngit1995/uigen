# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components via chat, and the AI generates them using a virtual file system with real-time rendering in an iframe preview.

**Tech Stack**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma (SQLite), Anthropic Claude AI (Vercel AI SDK), Vitest

## Development Commands

```bash
# Setup (first time)
npm run setup                    # Install deps, generate Prisma client, run migrations

# Development
npm run dev                      # Start dev server with Turbopack on http://localhost:3000
npm run dev:daemon              # Start dev server in background, logs to logs.txt

# Database
npx prisma migrate dev          # Create and apply migrations
npx prisma generate             # Regenerate Prisma client after schema changes
npm run db:reset               # Reset database (WARNING: deletes all data)
npx prisma studio              # Open Prisma Studio database GUI

# Testing
npm test                        # Run Vitest tests
npm test -- --watch            # Run tests in watch mode
npm test -- path/to/test.test.tsx  # Run single test file

# Build & Lint
npm run build                   # Production build
npm run start                   # Start production server
npm run lint                    # Run ESLint
```

## High-Level Architecture

### Virtual File System (VFS)

The core innovation is a **VirtualFileSystem** class (`src/lib/file-system.ts`) that manages an in-memory file tree. Files never touch disk during component generation.

- Files are represented as `FileNode` objects with `type`, `name`, `path`, `content`, and `children`
- The VFS supports create, read, update, delete, rename operations
- Serializes to JSON for storage in the database (Prisma Project model)
- Client-side context (`FileSystemProvider`) mirrors VFS state for UI updates

### AI-Powered Generation Flow

1. **User sends message** → `src/app/api/chat/route.ts` (POST handler)
2. **System prompt** injected from `src/lib/prompts/generation.tsx` instructs the AI to:
   - Create React components using `/App.jsx` as entry point
   - Use Tailwind CSS (not inline styles)
   - Import with `@/` alias for local files
   - Operate on virtual FS root (`/`)
3. **AI makes tool calls** using two custom tools:
   - `str_replace_editor` (`src/lib/tools/str-replace.ts`): view, create, str_replace, insert operations
   - `file_manager` (`src/lib/tools/file-manager.ts`): rename, delete operations
4. **Tool calls update VFS** → client receives streaming updates
5. **Client handles tool calls** via `FileSystemContext.handleToolCall()` to sync UI state
6. **Project saved** in `onFinish` callback (authenticated users only) with messages and VFS state

### Preview System

**Key file**: `src/components/preview/PreviewFrame.tsx`

**Transform pipeline** (`src/lib/transform/jsx-transformer.ts`):
1. Transform JSX/TSX files using Babel Standalone (React preset, TypeScript preset)
2. Create blob URLs for transformed code
3. Generate ES Module import map with:
   - React/ReactDOM from `esm.sh`
   - Third-party packages from `esm.sh`
   - Local files via blob URLs
   - `@/` alias support for imports
4. Inject Tailwind CSS via CDN script
5. Render HTML with import map in iframe with `srcdoc`

**Automatic entry point detection**: Looks for `/App.jsx`, `/App.tsx`, `/index.jsx`, etc.

**Error handling**: Syntax errors from Babel are displayed inline in preview with formatted error UI.

### Authentication & Projects

**JWT-based auth** (`src/lib/auth.ts`):
- `createSession()`, `getSession()`, `deleteSession()`, `verifySession()`
- Sessions stored in HTTP-only cookies (7-day expiry)
- Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem` routes

**Data model** (`prisma/schema.prisma`):
- `User`: id, email, password (bcrypt), projects[]
- `Project`: id, name, userId, messages (JSON), data (JSON, VFS state)

**Project persistence**:
- Anonymous users: VFS state only in memory (lost on refresh)
- Authenticated users: Auto-saved to database after each AI response
- Home page (`src/app/page.tsx`) redirects authed users to most recent project
- Project page (`src/app/[projectId]/page.tsx`) loads from database

### Provider System

**Mock vs Real AI** (`src/lib/provider.ts`):
- If `ANTHROPIC_API_KEY` is missing, uses `MockLanguageModel` which generates static Counter/Form/Card components
- Mock provider simulates streaming with delays and follows a 4-step tool call sequence
- Real provider uses `claude-haiku-4-5` model from `@ai-sdk/anthropic`

### Important Implementation Details

**Import map variations**: The transformer creates multiple import map entries for each file to handle:
- Absolute paths: `/components/Foo.jsx`
- Relative paths: `./components/Foo.jsx`
- Without extensions: `/components/Foo`
- `@/` alias: `@/components/Foo`

**VFS path normalization**: All paths normalized to start with `/`, remove trailing slashes, collapse multiple slashes.

**React context architecture**:
- `FileSystemProvider` wraps app to manage VFS state
- `ChatContext` manages chat messages and streaming state
- Both contexts work together to sync AI tool calls → VFS → UI

**Babel transform**: Configured with `runtime: "automatic"` for React (no need to import React in JSX files).

## Environment Variables

```bash
# Required for AI generation (optional - falls back to mock provider)
ANTHROPIC_API_KEY=sk-ant-...

# Required for production (defaults to 'development-secret-key' in dev)
JWT_SECRET=your-secret-key
```

## Database Schema Location

Prisma schema: `prisma/schema.prisma`

Generated client: `src/generated/prisma/` (imported as `@/generated/prisma` or from `@/lib/prisma.ts` singleton)

## Testing

Test files located in `__tests__` directories next to source files.

Vitest configured with jsdom environment for React component testing. Uses `@testing-library/react` and `@testing-library/user-event`.

## Key Files to Know

- `src/lib/file-system.ts` - VFS implementation
- `src/lib/transform/jsx-transformer.ts` - Babel transform + import map generation
- `src/app/api/chat/route.ts` - AI streaming endpoint
- `src/lib/contexts/file-system-context.tsx` - Client-side VFS state management
- `src/components/preview/PreviewFrame.tsx` - iframe preview renderer
- `src/lib/provider.ts` - AI provider abstraction (mock vs real)
