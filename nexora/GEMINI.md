# GEMINI.md — Nexora

> Catatan penting: Sebaiknya tulis isi GEMINI.md dalam Bahasa Inggris.
> Gemini memproses instruksi Bahasa Inggris lebih optimal.

---

## 1. Project Overview

- Name : Nexora
- Description : Aplikasi berbasis AI yang membantu siswa SMA/mahasiswa mengerjakan tugas dan persiapan ujian.
- Goal : Memudahkan siswa SMA maupun mahasiswa dalam mengerjakan tugas/projek dan persiapan ujian yang matang.
- Target Users: Siswa SMA dan mahasiswa
- Version : v1.0.0
- Status : Active development

---

## 2. Tech Stack

- Language : TypeScript
- Framework : Next.js 15 (App Router, Server Actions, Edge/Node Runtime)
- Styling : Tailwind CSS
- UI Library : shadcn/ui + Luicide React / @xyflow/react + KaTeX / react-katex
- Database : PostgreSQL (via Supabase / Neon) + pgvector
- ORM : Drizzle ORM
- Auth : Better Auth (Support Google OAuth 2.0 native, session management & seamless Next.js App Router integration)
- State Management: Zustand  (Global UI state, active logic tree state, session timers)
- Data Fetching : TanStack Query (React Query) + Vercel AI SDK (useChat, useCompletion untuk streaming LLM)
- AI & RAG Engine:
    - LLM Orchestration: LangChain / LlamaIndex (TypeScript)
    - Models: Gemini Flash 3.6 (High-bandwidth / Fast streaming) & Claude 3.5 / 4.6 (Complex reasoning & logic extraction)
    - Document Parsing & OCR: LlamaParse / Unstructured.io (Ekstrasi PDF/DOCX, rumus matematika, & tabel)
    - Vector Search / Reranking: pgvector + Cohere Rerank
- Package Manager : pnpm
- Deployment : Vercel + Supabase Cloud

---

## 3. Commands

```bash
# Development
pnpm run dev          # Jalankan dev server
pnpm run build        # Build untuk production
pnpm run start        # Jalankan production build
pnpm run lint         # Jalankan linter
pnpm run format       # Format kode

# Package Management
pnpm add [package]    # Install package baru

# Testing
pnpm run test         # Jalankan semua test
pnpm run test:unit    # Jalankan unit test saja
pnpm run test:e2e     # Jalankan e2e test saja

# Database
pnpm run db:migrate   # Jalankan migrasi
pnpm run db:seed      # Seed data awal
pnpm run db:reset     # Reset database
```

Always use pnpm

---

## 4. Project Structure

Architecture: Feature-Driven Structure

```
.agents/
  ├── GEMINI.md            # Specific instructions & context for the AI ​​Coding Agent
  ├── PRD.md               # Product Requirement Document (Vision, Features, Target Users)
  ├── DESIGN.md            # UI/UX guidelines (Colors, Fonts, Design System, Components)
  ├── ARCHITECTURE.md      # Technical documentation on data flow and architecture
  └── DATABASE.md          # Database schema & data relationship flows

src/
  ├── assets/              # Static assets (images, icons, fonts)
  │
  ├── components/          # Global UI components (Reusable)
  │   ├── ui/              # Button, Input, Card, Modal, Badge
  │   └── layout/          # Navbar, Sidebar, Footer
  │
  ├── features/            # Core features (Feature-Driven Structure)
  │   ├── auth/            # Login & Registration features
  │   ├── learning/        # Educational materials & modules
  │   ├── practice/        # Practice questions & quizzes
  │   └── discussion/      # Discussion forums & Q&A
  │       ├── components/  # Feature-specific components
  │       ├── services/    # API / database logic
  │       └── types/       # Feature-specific data types
  │
  ├── hooks/               # Custom React Hooks (e.g., useAuth, useDebounce)
  ├── lib/                 # Library configurations (e.g., Supabase, Axios, Firebase)
  ├── services/            # Global API logic
  ├── types/               # Global TypeScript interfaces/types
  └── utils/               # Helper functions (formatDate, currency, etc.)

public/ # Static assets that can be accessed by the public (favicon, logo)
package.json # Config dependencies & project scripts
tsconfig.json # TypeScript config
.env.example # Example environment variables (Environment variables)
```

File placement rules:
- Always maintain the folder structure shown above.
- New UI components always go in `src/components/`.
- Business logic always goes in `src/features/[feature-name]/services/`.
- TypeScript types always go in `src/types/` or in `src/features/[feature-name]/types/` if feature-specific.
- Helpers and utilities always go in `src/utils/`.
- Do not create new folders without prior confirmation.
---

## 5. Naming Conventions

```
# Files and Folders
- Components    : PascalCase    example: UserCard.tsx, LogicTree.tsx
- Non-components: camelCase     example: useAuth.ts, getUserById.ts
- Folders       : kebab-case    example: user-profile/, logic-tree/
- Pages         : page.tsx or index.tsx example: page.tsx
- Layouts       : layout.tsx    example: layout.tsx
- Test files    : [name].test.ts or [name].spec.ts example: useAuth.test.ts

# In-Code
- Variables     : camelCase     example: userData, isLoading
- Constants     : UPPER_SNAKE_CASE   example: MAX_RETRY, BASE_URL
- Functions     : camelCase     example: getUserById, formatDate
- Types/Interfaces: PascalCase  example: UserType, ApiResponse
- Enums         : PascalCase    example: UserRole, OrderStatus
- CSS Classes   : kebab-case    example: user-card, nav-item

# Git Branches
- New features  : feat/[feature-name] example: feat/logic-tree
- Bug fixes     : fix/[bug-name] example: fix/login-bug
- Hotfixes      : hotfix/[name] example: hotfix/critical-bug
- Refactoring   : refactor/[name] example: refactor/cleanup-code
```

---

## 6. Code Conventions

```
# Coding Approach
- Apply Clean Code, DRY (Don't Repeat Yourself), and SOLID principles.
- Avoid duplicating business logic or UI blocks; extract repetitive operations (e.g., streaming parsers, math rendering helpers, timer logic) into dedicated functions or custom hooks.
- Prioritize explicit, self-documenting code over clever, concise one-liners.

# TypeScript
- Strict Mode: Always enable "strict": true in tsconfig.json.
- No 'any' Type: The 'any' type is strictly forbidden. Use 'unknown' with type guards if the type is dynamic, or define custom Zod schemas for external API payloads and inputs.
- Explicit Return Types: Always define the return type for functions, API handlers, and async actions explicitly: // ✅ Correct
export async function parseDocument(fileId: string): Promise<ParsedDocumentResult> { ... }
- Interfaces vs. Types: Use interface for object definitions and component props (e.g., TaskProps, LogicNodeProps).  Use type for unions, intersections, primitives, and utility transformations (e.g., UserRole = 'admin' | 'student').

# Urutan Import
1. External Libraries: Framework and third-party modules (e.g., react, next, lucide-react, @xyflow/react).
2. Internal Absolute Imports: Modules mapped via @/ alias (e.g., @/components, @/lib, @/services).
3. Internal Relative Imports: Nearby components or utility helpers (e.g., ./LogicTreeNode, ../utils/format-time).
4. Types & Interfaces: Type imports (e.g., import type { Task } from '@/types/task').
5. Assets & Styles: Global styles or static assets (e.g., ./styles.css).

# Export Pattern
- Named Exports: Use named exports for all components, hooks, service functions, and helper utilities: export const LogicTreeCanvas = () => { ... };
- Reserved strictly for Next.js file-system routing entry points (page.tsx, layout.tsx, loading.tsx, error.tsx).

# Error Handling
- Always wrap asynchronous operations (LLM streaming, document parsing, database queries) in try-catch blocks.
- Never expose raw internal database or AI provider errors to the client. Map all internal catches to clear, user-facing error messages.
- Validate all incoming client payloads using Zod prior to executing database operations or AI calls to satisfy input validation guardrails.
- Log detailed backend exceptions to server logs or monitoring platforms (e.g., LangSmith) while keeping client responses clean and structured.

# AI & Data Handling Specifics
- Handle AI streaming using structured SDK utilities (Vercel AI SDK) to keep client evaluation times under 2 seconds.
- Isolate PDF/DOCX chunking, embedding generation, and vector indexing within server-side background handlers or dedicated API services to ensure processing completes within the 3-minute performance threshold.
- Design conversation and coach modules with stateful memory layers that cache previous interactions (via Supabase) to maintain conversational context across sessions without incurring redundant API costs.
```

---

## 7. Component Rules

```
# Component File Anatomy & Structure
1. Imports (External, Internal Absolute, Internal Relative, Types, Styles)
2. Props Interface / Type Definitions (e.g., TaskItemProps, LogicNodeProps)
3. Component Definition (Named export)
4. State & Hooks (Zustand stores, TanStack Query hooks, React hooks, AI SDK hooks)
5. Derived State & Memoized Computations (useMemo, useCallback)
6. Event Handlers & Local Helper Functions (e.g., handleStepSubmit, handleExpandNode)
7. JSX Render / Return Statement
8. Sub-components (Only if exclusively used within this file)

# Props Rules
- Always define props explicitly using TypeScript interfaces
- Use destructuring with default fallback values for optional props:
  interface ExamTimerProps {
    durationMinutes: number;
    autoSubmit?: boolean;
    onTimeUp: () => void;
  }
  export const ExamTimer = ({ 
    durationMinutes, 
    autoSubmit = true, 
    onTimeUp 
  }: ExamTimerProps) => { ... }
- Limit component props to a maximum of 7 props per component. If more are needed, group them into a structured object or use a context/Zustand store.

# Server vs. Client Component Rules (Next.js App Router)
- Default: Treat every component as a Server Component to optimize performance and reduce client-side bundle size.
- Add 'use client' directive explicitly at the top of the file ONLY when requiring:
    - Interactive state & lifecycle hooks (useState, useEffect, useReducer)
    - Browser APIs & document interaction (window, timers, localStorage)
    - Event handlers (onClick, onChange, onSubmit, onDrag)
    - Streaming UI hooks from Vercel AI SDK (useChat, useCompletion)
    - Non-SSR interactive libraries (e.g., React Flow / @xyflow/react for Logic Trees)
    - Zustand client-side store subscriptions (e.g., task progress tracking, conversation practice state)

# Component Granularity & Decomposition
- Extract to a standalone file in `@/components` if a component is reused in more than one route/view (e.g., LatexRenderer, DocumentUploader, StepByStepSolver).
- Keep specialized micro-components (e.g., LogicTreeCustomHandle, TimerBadge) inside the parent component file only if they are private to that specific module.
- Keep components focused on a single responsibility; split large UI views into smaller, composable presenter and container components.
```

---

## 8. Styling Rules

```
# Styling Approach
- Framework: Tailwind CSS v4 (or v3 with @tailwindcss/typography & tailwindcss-animate)
- Utility Helper: Always use `cn()` (clsx + tailwind-merge) for conditional classes
- No inline styles, except for purely dynamic runtime calculations (e.g., node coordinates in Logic Tree, countdown progress percentages)
- Never use `!important` unless overriding an un-configurable third-party style (e.g., KaTeX or React Flow base stylesheets)

# Visual Identity & Theme (Gemini-Inspired + Nexora Signature)
- Light Mode Palette:
    - Background (Base)    : Clean white to soft pearl (`hsl(0, 0%, 100%)` / `hsl(220, 20%, 98%)`)
    - Card & Sidebar       : `hsl(220, 14%, 96%)`
    - Text (Foreground)    : Charcoal Slate (`hsl(224, 71%, 4%)`)
    - Muted Text           : Neutral Gray (`hsl(220, 9%, 46%)`)
- Dark Mode Palette:
    - Background (Base)    : Deep Space Slate (`hsl(224, 71%, 4%)` / `#0B0F17`)
    - Surface / Cards      : Midnight Gray (`hsl(224, 60%, 7%)` / `#131926`)
    - Surface Secondary    : Hover Slate (`hsl(224, 45%, 12%)` / `#1E2638`)
    - Text (Foreground)    : Frost White (`hsl(210, 40%, 98%)`)
    - Muted Text           : Slate Gray (`hsl(215, 20%, 65%)`)
- Nexora Signature Accents:
    - Primary Accent       : Nexora Electric Indigo (`hsl(246, 80%, 62%)`)
    - Secondary Accent     : Aurora Teal / Cyan (`hsl(186, 95%, 48%)`)
    - AI Gradient Sparkle  : `bg-gradient-to-r from-indigo-500 via-sky-400 to-teal-400`
    - Interactive Highlight: Subtle cyan-indigo ring glows (`ring-1 ring-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]`)

# Tailwind Class Organization
- Maintain consistent utility ordering:
  Layout (display, position) > Spacing (m, p) > Sizing (w, h) > Borders & Backgrounds > Typography (font, text) > Effects & Transitions > States (hover, focus, dark:)
- Example: `className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card text-foreground transition-all hover:bg-accent dark:border-white/10"`

# Responsive Design
- Mobile-first approach
- Breakpoints:
    - Mobile Base : < 640px (Collapsible sidebar, floating action chat bar, full-screen solver)
    - Tablet (`md`): 768px (Split screen for chat + study notes)
    - Desktop (`lg`): 1024px+ (Multi-column view: AI Planner / Logic Tree canvas + Active Chat pane)
    - Wide (`xl`)  : 1280px+ (Expanded math solver with split step-by-step previews)

# Dark Mode & Theming Rules
- Support system preference detection with default to dark mode for study focus.
- Use CSS variables (`var(--primary)`, `var(--background)`, `var(--card)`) mapped in `globals.css` via shadcn/ui design tokens.
- Never hardcode raw hex values (e.g., `#ffffff`, `#000000`) inside component JSX.
- Test every component in both light and dark mode before committing.

# Micro-Interactions & Motion
- Streaming & Loading: Pulse glows for AI thinking states (`animate-pulse` with aurora gradient).
- Logic Tree Nodes: Smooth hover scales (`transition-transform duration-200 ease-out hover:scale-[1.02]`).
- Math / Formula Blocks: Render KaTeX inside clean, subtle card containers with copy buttons and horizontal scroll overflow handling (`overflow-x-auto`).
```

---

## 9. API & Data Fetching Rules

```
# Server vs. Client Fetching Strategy
- Server Fetch (React Server Components / Server Actions):
  - Use for initial page renders, user profile initialization, and static study plans.
  - Query databases directly inside Server Components using Drizzle/Prisma to reduce round-trips and optimize Time to First Byte (TTFB).
- Client Fetch (TanStack Query / React Query):
  - Use for data that updates based on user interaction (e.g., task CRUD operations, real-time progress tracker updates, exam timer submissions).
  - Always wrap fetching logic inside custom query/mutation hooks (e.g., `useTasks()`, `useUpdateProgress()`).
  - Never use `useEffect` for data fetching.
- AI Streaming (Vercel AI SDK):
  - Use for real-time chat interactions, step-by-step math solver breakdowns, and logic tree generation.
  - Handle streaming via SDK hooks (`useChat`, `useCompletion`) configured for low latency (< 2 seconds response time).

# Standard API Response Structure (REST & Server Actions)
- Always return a standardized response format for all non-streaming endpoints:
  ```typescript
  export interface ApiResponse<T> {
    success: boolean;
    data: T | null;
    message: string;
    errors?: Record<string, string[]>;
  }
- Streaming route handlers must return an appropriate stream response (e.g., toDataStreamResponse()).

# Error Handling & Validation
- Always wrap asynchronous route handlers, server actions, and external AI calls in try-catch blocks[cite: 1, 3].
- Payload Validation: Validate every incoming request body with Zod schemas before executing database mutations or AI pipeline calls:
const parsed = TaskSchema.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      message: "Invalid request payload",
      errors: parsed.error.flatten().fieldErrors,
    },
    { status: 400 }
  );
}
- Use accurate HTTP status codes:
    200 OK / 201 Created
    400 Bad Request (Zod validation failure or invalid params)
    401 Unauthorized (Missing, invalid, or expired session token)
    403 Forbidden (Insufficient role or unauthorized resource access)
    429 Too Many Requests (Rate limiting threshold exceeded)
    500 Internal Server Error (Never expose raw stack traces, database credentials, or internal AI errors in production)

# File & Code Organization
- Store all client-side fetch functions and mutations inside @/services/ or @/lib/api/.
- Separate API modules by domain (e.g., @/services/tasks.ts, @/services/documents.ts, @/services/ai.ts).
- Never execute raw fetch() calls or compose inline API requests directly inside UI components.

# Environment Variables & Security
- Never hardcode URLs, API keys, database credentials, or secrets in source code.
- Server-only secrets (DATABASE_URL, GEMINI_API_KEY, ANTHROPIC_API_KEY, AUTH_SECRET) must never use the NEXT_PUBLIC_ prefix to prevent client-side exposure[cite: 1].
- Use NEXT_PUBLIC_ only for public client-side configurations (e.g., NEXT_PUBLIC_APP_URL)[cite: 1].
```

---

## 10. State Management Rules

```
# State Hierarchy & Selection Strategy
Always apply the simplest state layer appropriate for the use case:
1. Local State (`useState`, `useReducer`):** Single-component UI state (e.g., input field text, dropdown toggles, modal open/close states).
2. Lifted State:** Shared state between 2–3 tightly coupled parent-child components (e.g., passing step index to a child form).
3. Server Cache State (TanStack Query / Vercel AI SDK):** Remote data fetching, cached query responses, and AI streaming session state. Never duplicate server cache into global client stores.
4. Global Client State (Zustand):** Multi-component application state, persistent sessions, cross-page state, or complex interactive canvas state.

# When to Use Zustand Global Stores
- Active interactive canvas data (e.g., React Flow nodes, expanded logic tree branches, variable simulation values)[cite: 3].
- Exam practice timer & tryout sessions (active countdown, question navigation, answered question status)[cite: 3].
- Brainstorming progress tracker (current milestone step, progress percentage, cancellation status)[cite: 3].
- Active AI Coach / Conversation Practice mode settings (target language, speaking speed, coaching role)[cite: 3].
- UI preferences that persist across routes (sidebar collapse, panel split ratios, active layout mode)[cite: 1].

# Zustand Store Architecture & Rules
- Domain-Specific Stores:** Create modular stores per feature under `@/stores/` (e.g., `useLogicTreeStore`, `useExamStore`, `useProgressStore`, `useUIStore`). Never combine all state into a single monolithic store[cite: 1].
- Atomic Selectors: Always use explicit selectors to prevent unnecessary component re-renders:
  ```typescript
  // ✅ Correct: Only re-renders when remainingSeconds changes
  const remainingSeconds = useExamStore((state) => state.remainingSeconds);

  // ❌ Incorrect: Re-renders on any store state update
  const { remainingSeconds } = useExamStore();
- Derived State: Never store values that can be computed on the fly. Calculate them via getters, selectors, or useMemo (e.g., compute progressPercentage from completedSteps / totalSteps instead of saving a separate state)[cite: 1].
- State Immutability & Actions: Encapsulate all state transitions inside store actions; never mutate state directly from outside components.
- Persistence: Use the Zustand persist middleware only for data intended to survive browser refreshes (e.g., UI layout preferences, unfinished exam drafts in localStorage).

# React Context Usage Guidelines
- Restrict React Context to data that changes infrequently across the tree (e.g., ThemeProvider for dark/light mode, AuthSessionProvider)[cite: 1].
- Do not use React Context for high-frequency updates (e.g., real-time timer ticks, streaming tokens, mouse drag coordinates on logic trees) to avoid cascading re-renders[cite: 1].
```

---

## 11. Performance Rules

```
# Code Splitting & Dynamic Imports
- Heavy Client Libraries: Always lazy load large client-side modules via `next/dynamic` with `ssr: false` to keep the main bundle lightweight:
  ```typescript
  // Dynamic import for interactive React Flow logic canvas
  const LogicTreeCanvas = dynamic(
    () => import('@/components/logic-tree/LogicTreeCanvas').then((mod) => mod.LogicTreeCanvas),
    { ssr: false, loading: () => <LogicTreeSkeleton/> }
  );

  // Dynamic import for heavy math/KaTeX previewers
  const MathSolverPreview = dynamic(
    () => import('@/components/solver/MathSolverPreview').then((mod) => mod.MathSolverPreview),
    { ssr: false }
  );
- Conditional & Modal Views: Dynamically load non-critical UI dialogs, document upload modals, and conversation practice audio analyzers on demand.

# Low-Bandwidth & Asset Optimization (4G / Mobile Friendly)
- Framework Image Component: Always use next/image instead of raw <img> tags to enable automated WebP/AVIF compression, responsive srcset, and blur placeholders.
- Explicit Image Dimensions: Always specify explicit width and height (or fill) to prevent Cumulative Layout Shift (CLS).
- Font & Icon Optimization: Use next/font for zero-layout-shift Google fonts and import icons individually from lucide-react rather than pulling in the whole bundle.

# Re-render Optimization
- Zustand Selectors: Use fine-grained atomic selectors for store values (especially inside real-time countdown timers and logic nodes) so unrelated components do not re-render.
- Wrap complex data transformations (such as RAG context filtering, logic tree graph layout layouting, or statistical breakdown calculations) in useMemo.
- Use useCallback for event handlers passed down to deeply nested lists (e.g., node interaction listeners in React Flow, question option selectors in tryouts).
- Avoid premature memoization; profile components with React DevTools before wrapping simple presentational elements.

# Tree-Shaking & Bundle Size Discipline
- Selective Imports: Import only targeted subpaths and utilities from third-party libraries:
```typescript
// ✅ Correct: Tree-shakable import
import debounce from 'lodash/debounce';

// ❌ Incorrect: Bundles the entire lodash library
import { debounce } from 'lodash';
```
- Keep the first-load JS bundle under 100 KB per route to ensure fast load times over weak mobile connections.

# Rendering Strategies (Server Components, Streaming & Cache)
- Server Components by Default: Push the 'use client' boundary down to the leaf nodes of the component tree to minimize client-side JavaScript execution.
- Edge Streaming: Stream AI responses directly to the client via Vercel AI SDK to achieve an initial token response time under 2 seconds.
- Database & Route Caching: Cache static study syllabus materials, FAQ data, and document templates using Next.js data cache / ISR with sensible revalidation tags to minimize database load across 1,000 concurrent users.
```

---

## 12. Git Rules

Whenever the Antigravity CLI finishes making code changes or additions, commit them to GitHub immediately before moving on to the next task. This is important so you can compare the old and new code, as well as undo changes if the results do not meet expectations.

```
# Commit Message Format
feat     : [description of new feature]
fix      : [description of bug fix]
refactor : [description of refactoring change]
style    : [styling or formatting changes]
docs     : [documentation changes]
test     : [addition or modification of tests]
chore    : [configuration or tooling changes]

# Examples
feat: add user authentication with Google OAuth
fix: resolve infinite scroll not triggering on mobile
refactor: extract user card into reusable component

# Additional Rules
- Security: Never commit `.env` files or any files containing secrets (API keys, credentials, etc.).
- Atomicity: A single commit should contain one specific change.
- Focus: Do not combine unrelated changes into the same commit.
```

---

## 13. Features

```
# Completed & Operational
- [x] Project workspace initialization & tech stack scaffolding
- [x] Base repository setup & Antigravity CLI configuration

# In Progress — Do not modify without confirmation
- [ ] Google OAuth 2.0 authentication & secure session management (Better Auth)
- [ ] Chatbot core interface with real-time streaming (Vercel AI SDK + Gemini Flash / Claude)

# Backlog / Planned
- [ ] Document Ingestion Engine (PDF/DOCX upload, OCR, and chunking)
- [ ] Interactive Logic Tree Canvas (@xyflow/react for STEM algorithm breakdowns & "What-if" simulations)
- [ ] Step-by-Step Calculator & Solver with KaTeX mathematical formula rendering
- [ ] Exam Practice Timer (Timed tryout sessions with countdown manager)
- [ ] Task Management & Progress Tracker (CRUD tasks, brainstorming milestones & completion status)
- [ ] AI Study Planner (Custom schedule & study roadmap generator)
- [ ] AI Coach & Multi-language Conversation Practice
- [ ] AI Long-term Memory (Contextual recall of past outputs and study sessions)
- [ ] Research/Thesis Analyzer (Chapter outline extraction & literature gap identification)
```

---

## 14. Testing

```
# Testing Strategy & Frameworks
- Unit & Component Testing: Vitest + React Testing Library (Blazing fast ESM runner for pure functions, custom hooks, and isolated UI components)
- Integration Testing: Vitest with Mock Service Worker (MSW) to mock external AI completions (Gemini / Claude) and document parser pipelines
- End-to-End (E2E) Testing: Playwright (Testing full browser flows: Google OAuth sign-in, document upload workflows, logic tree node interactions, and timed tryouts)

# What Must Be Tested
- Core Business Logic & Utilities:
  - Mathematical evaluation & step-by-step solver parsing functions
  - Exam timer state transitions, countdown deductions, and auto-submit triggers
  - Document chunking, metadata extraction, and logic tree branch hierarchy calculations
- API Endpoints & Server Actions:
  - Request validation schemas (Zod happy path and error cases)
  - Protected route access (verifying 401 unauthorized behaviors on unauthenticated calls)
  - Standardized JSON responses and error boundaries
- **Critical UI Components:**
  - Interactive Logic Tree node expand/collapse behaviors
  - AI chat input container, streaming text chunk renders, and KaTeX equation formatting blocks
  - Study task CRUD forms and progress tracker bars

# What Should NOT Be Tested
- Trivial presentational components (static icons, simple wrappers, pure layout cards)
- Third-party library internals (e.g., verifying that `@xyflow/react` handles dragging or Tailwind renders CSS)
- Static configuration files (`tsconfig.json`, `tailwind.config.ts`, `.eslintrc`)

# Test Authoring Rules
- Colocation / File Naming: Keep test files adjacent to their source implementation or inside a `__tests__/` directory using `[filename].test.ts(x)`
- Descriptive Naming Convention: Write clear behavioral descriptions:
  `describe('ExamTimer', () => { it('should auto-submit answers when countdown reaches zero') })`
- AAA Pattern: Structure test bodies using the **Arrange, Act, Assert** pattern:
  ```typescript
  it('should compute correct progress percentage on task completion', () => {
    // Arrange
    const totalSteps = 5;
    const completedSteps = 3;

    // Act
    const progress = calculateProgress(completedSteps, totalSteps);

    // Assert
    expect(progress).toBe(60);
  });

# Code Coverage Targets & Priority
- Minimum Target: 75% overall test coverage
- Execution Priority: Math solver & timer utilities > API authentication & route validation > Global Zustand stores > Interactive UI components
```

---

## 15. Do Not

If instructions or prompts are ambiguous, ASK FIRST before coding.
Do not make assumptions and proceed without confirmation.

```
# Structure and Files
- Do not create new folders without confirmation
- Do not delete files without confirmation
- Do not move files without confirmation
- Do not alter the existing folder structure

# Code
- Do not use the 'any' type in TypeScript
- Do not hardcode values ​​that should come from environment variables
- Do not commit .env files or files containing secrets
- Do not install new packages without confirmation
- Do not remove or modify working features without clear instructions

# Prohibited Patterns
- Do not use [disallowed packages or patterns]
- Do not use useEffect for data fetching
- Do not use inline styles for values ​​that can be handled by utility classes

# Database
- Do not run commands that modify or delete production data
- Do not create database migrations without confirmation
- Do not expose database credentials to the client side

# Security
- Do not expose API keys or any secrets to the client
- Do not bypass user input validation
- Do not skip error handling in API routes
```

---

## 16. Environment Variables

```
# Setup & Security Rules
- Copy `.env.example` to `.env.local` for local development.
- Never commit `.env`, `.env.local`, or any file containing active secrets to the repository.
- Restrict all secret credentials to server-only runtimes; only expose variables prefixed with `NEXT_PUBLIC_` to the browser.

# Public Variables (Safe for client-side use)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000          # Base public URL of the application
NEXT_PUBLIC_SUPABASE_URL=[https://xyz.supabase.co](https://xyz.supabase.co)    # Public Supabase project endpoint
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key         # Supabase anonymous public key

# Server-Only Variables (NEVER expose to the client)
DATABASE_URL=postgresql://user:password@host:port/dbname # Direct PostgreSQL / pgvector connection string
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key          # Elevated key for backend database tasks & document storage
GEMINI_API_KEY=your_gemini_api_key                       # Google Gemini API key (Flash / Pro models)
ANTHROPIC_API_KEY=your_anthropic_api_key                 # Anthropic API key (Claude reasoning models)
COHERE_API_KEY=your_cohere_api_key                       # Cohere API key for semantic reranking
LLAMAPARSE_API_KEY=your_llamaparse_api_key               # Parser key for complex PDFs, formulas, and tables

# Auth Variables
BETTER_AUTH_SECRET=your_super_secret_auth_token_key      # Secret key for session encryption and signing
BETTER_AUTH_URL=http://localhost:3000                    # Auth endpoint base URL
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com # Google OAuth Client ID
GOOGLE_CLIENT_SECRET=your_google_client_secret                     # Google OAuth Client Secret (Server-only)
```
