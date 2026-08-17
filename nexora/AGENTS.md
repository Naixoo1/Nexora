# AGENTS.md — Nexora Multi-Agent System

This document defines the agent roster, routing triggers, and collaboration workflows for building Nexora using Antigravity CLI.

---

## 1. Agent Roster & File Mapping

| ID | Agent Role | Instruction File | Primary Focus | Recommended Model |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **Architect & PRD Lead** | `.agents/01-architect.md` | Data modeling, API contracts, PRD scope enforcement | Claude Opus / High-Reasoning |
| **02** | **Frontend Engineer** | `.agents/02-frontend.md` | Next.js 15 App Router, UI components, Zustand, AI SDK streaming | Gemini Flash / Claude Sonnet |
| **03** | **Design & UI/UX Specialist** | `.agents/03-design.md` | `DESIGN.md` tokens, Tailwind CSS, mobile/desktop responsiveness | Gemini Flash / Claude Sonnet |
| **04** | **STEM & Canvas Specialist** | `.agents/04-stem-canvas.md` | React Flow (`@xyflow/react`) logic trees, KaTeX math solver | Claude Opus / High-Reasoning |
| **05** | **Backend, Auth & RAG Engineer**| `.agents/05-backend-rag.md` | Better Auth, Google OAuth, PostgreSQL/pgvector, RAG pipeline | Claude Opus / Gemini Flash |
| **06** | **QA & Testing Auditor** | `.agents/06-qa-tester.md` | Vitest, React Testing Library, Playwright, MSW mocks | Claude Sonnet / Gemini Flash |
| **07** | **DevOps & Release Manager** | `.agents/07-devops.md` | Git conventions, migrations, environment security, builds | Gemini Flash |

---

## 2. Dispatch Triggers (When to Invoke Which Agent)

- **Invoke `01-architect`** when planning new database schemas, defining Zod validation interfaces, or verifying whether a feature request is within `PRD.md` scope.
- **Invoke `02-frontend`** when building pages, implementing forms, handling client-side state in Zustand, or configuring real-time chat streaming.
- **Invoke `03-design`** when creating new visual components, tuning dark/light mode themes, adjusting mobile navigation drawers, or refactoring CSS class hierarchies.
- **Invoke `04-stem-canvas`** when implementing interactive logic tree branches, custom node handles, "What-if" simulations, or KaTeX formula rendering.
- **Invoke `05-backend-rag`** when configuring Better Auth routes, setting up Google OAuth, running database migrations with Drizzle/Prisma, or tuning document ingestion parsers.
- **Invoke `06-qa-tester`** when writing test suites for business logic (exam timers, math parsing), API route handlers, and Playwright end-to-end flows.
- **Invoke `07-devops`** before committing code to format commit messages, verify `.env` protection, and run final production build verifications.

---

## 3. Collaboration Pipeline (Feature Lifecycle)

For any new feature or major refactoring task, follow this sequential execution path:
[PRD Requirement]
│
▼

01-architect       ──► Defines data models, Zod schemas & API contracts
│
├───────────────────────────────┐
▼                               ▼

05-backend-rag             3. 02-frontend / 04-stem-canvas
(Builds endpoints & RAG)      (Builds UI & interactive canvas)
│                               │
└───────────────┬───────────────┘
▼
4. 03-design
(Enforces styling tokens & responsive layout)
│
▼
5. 06-qa-tester
(Writes unit, integration & E2E tests)
│
▼
6. 07-devops
(Audits git commit & executes push)

---

## 4. Operational Guardrails

- **Single Source of Truth:** `PRD.md` defines what gets built, `GEMINI.md` defines how code is written, and `DESIGN.md` defines how elements appear.
- **Strict Role Boundaries:** Agents must not cross boundaries without handoff (e.g., Frontend agents should consume interfaces created by Architect/Backend rather than inventing uncoordinated payload types).
- **Security Checkpoint:** No agent may output or stage production secrets, unencrypted tokens, or unrestricted API endpoints.