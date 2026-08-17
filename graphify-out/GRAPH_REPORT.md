# Graph Report - C:\code\ADM\YosukaADM  (2026-08-17)

## Corpus Check
- Corpus is ~5,578 words - fits in a single context window. You may not need a graph.

## Summary
- 43 nodes · 42 edges · 10 communities (8 shown, 2 thin omitted)
- Extraction: 45% EXTRACTED · 55% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.91)
- Token cost: 5,578 input · 2,840 output

## Community Hubs (Navigation)
- Nexora Design System & Styling
- AI Engine & Multi-Model Features
- Full-Stack Architecture & Data Layer
- Tryout HUD Timer & State Management
- Interactive Logic Tree Engine
- Authentication & User Session Flow
- STEM Step-by-Step Solver
- Project Vision & Architecture Overview
- Academic Task CRUD
- Target User Demographics

## God Nodes (most connected - your core abstractions)
1. `Nexora Full Tech Stack Specification` - 7 edges
2. `Nexora AI & RAG Engine Orchestration` - 7 edges
3. `Nexora Design System` - 4 edges
4. `Nexora Color Palette & Theme` - 4 edges
5. `Nexora Coding Agent Guidelines & Tech Architecture` - 3 edges
6. `Better Auth Native Google OAuth 2.0` - 3 edges
7. `Claude 3.5 / 4.6 (Complex Reasoning & Logic Extraction)` - 3 edges
8. `Zustand Client State Management` - 3 edges
9. `Document-to-Logic-Tree Converter & Simulation` - 3 edges
10. `Interactive Logic Tree UI Canvas` - 2 edges

## Surprising Connections (you probably didn't know these)
- `YosukaADM Nexora Project Repository` --references--> `Nexora Problem Statement & Product Vision`  [INFERRED]
  README.md → .agents/PRD.md
- `YosukaADM Nexora Project Repository` --references--> `Nexora Coding Agent Guidelines & Tech Architecture`  [EXTRACTED]
  README.md → .agents/GEMINI.md
- `Performance, Low-Bandwidth & Security Constraints` --rationale_for--> `Nexora Full Tech Stack Specification`  [INFERRED]
  .agents/PRD.md → .agents/GEMINI.md
- `Thesis Structure & Literature Gap Extractor` --conceptually_related_to--> `Nexora AI & RAG Engine Orchestration`  [INFERRED]
  .agents/PRD.md → .agents/GEMINI.md
- `Google OAuth Auth Card & Social Sign-In` --implements--> `Better Auth Native Google OAuth 2.0`  [INFERRED]
  .agents/DESIGN.md → .agents/GEMINI.md

## Hyperedges (group relationships)
- **STEM Interactive Document-to-Logic Tree Pipeline** — _agents_prd_stem_logic_tree_story, _agents_gemini_xyflow_react, _agents_design_interactive_logic_tree_ui, _agents_gemini_llamaparse_ocr [INFERRED 0.95]
- **STEM Step-by-Step Calculator & Formula Suite** — _agents_prd_step_calculator_solver, _agents_design_step_accordion, _agents_gemini_katex_renderer [INFERRED 0.95]
- **Google OAuth 2.0 Secure Authentication Flow** — _agents_design_auth_card, _agents_design_user_avatar_menu, _agents_gemini_better_auth, _agents_prd_non_functional_requirements [INFERRED 0.95]

## Communities (10 total, 2 thin omitted)

### Community 0 - "Nexora Design System & Styling"
Cohesion: 0.25
Nodes (8): Aurora Cyan / Teal (#06B6D4), Nexora Color Palette & Theme, Deep Space Slate Baseline (#0B0F17), Nexora Electric Indigo (#6366F1), Nexora Design System, Auto-Growing Prompt Bar Dock, Responsive Breakpoints (Mobile, Tablet, Desktop), Plus Jakarta Sans & JetBrains Mono Typography

### Community 1 - "AI Engine & Multi-Model Features"
Cohesion: 0.25
Nodes (8): Nexora AI & RAG Engine Orchestration, Claude 3.5 / 4.6 (Complex Reasoning & Logic Extraction), Gemini Flash 3.6 (Fast Streaming), Vercel AI SDK Streaming (useChat, useCompletion), AI Academic Advisor & Coach, AI Personalized Study Schedule Planner, Multilingual AI Conversation Practice, Thesis Structure & Literature Gap Extractor

### Community 2 - "Full-Stack Architecture & Data Layer"
Cohesion: 0.25
Nodes (8): Clean Code, DRY, SOLID & TypeScript Strict Rules, Drizzle ORM & PostgreSQL (Neon / Supabase), Feature-Driven Architecture Structure, Next.js 15 App Router & Server Actions, pgvector Vector Search & Cohere Rerank, Nexora Full Tech Stack Specification, Stateful AI Conversation & Output Memory Layer, Performance, Low-Bandwidth & Security Constraints

### Community 3 - "Tryout HUD Timer & State Management"
Cohesion: 0.67
Nodes (4): HUD Tryout Countdown Timer Widget, Zustand Client State Management, Brainstorming Progress & Milestone Tracker, Tryout Exam Practice with HUD Countdown Timer

### Community 4 - "Interactive Logic Tree Engine"
Cohesion: 0.67
Nodes (4): Interactive Logic Tree UI Canvas, LlamaParse / Unstructured Document OCR, @xyflow/react Interactive Logic Tree Engine, Document-to-Logic-Tree Converter & Simulation

### Community 5 - "Authentication & User Session Flow"
Cohesion: 0.67
Nodes (3): Google OAuth Auth Card & Social Sign-In, User Avatar & Profile Session Dropdown, Better Auth Native Google OAuth 2.0

### Community 6 - "STEM Step-by-Step Solver"
Cohesion: 1.00
Nodes (3): Step-by-Step STEM Solution Accordion, KaTeX / react-katex LaTeX Formula Renderer, Step-by-Step STEM Calculator & Solver

### Community 7 - "Project Vision & Architecture Overview"
Cohesion: 1.00
Nodes (3): Nexora Coding Agent Guidelines & Tech Architecture, Nexora Problem Statement & Product Vision, YosukaADM Nexora Project Repository

## Knowledge Gaps
- **17 isolated node(s):** `Nexora Electric Indigo (#6366F1)`, `Aurora Cyan / Teal (#06B6D4)`, `Deep Space Slate Baseline (#0B0F17)`, `Plus Jakarta Sans & JetBrains Mono Typography`, `Google OAuth Auth Card & Social Sign-In` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Nexora AI & RAG Engine Orchestration` connect `AI Engine & Multi-Model Features` to `Full-Stack Architecture & Data Layer`, `Interactive Logic Tree Engine`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **Why does `Nexora Full Tech Stack Specification` connect `Full-Stack Architecture & Data Layer` to `AI Engine & Multi-Model Features`, `Authentication & User Session Flow`, `Project Vision & Architecture Overview`?**
  _High betweenness centrality (0.232) - this node is a cross-community bridge._
- **Why does `LlamaParse / Unstructured Document OCR` connect `Interactive Logic Tree Engine` to `AI Engine & Multi-Model Features`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `Nexora Electric Indigo (#6366F1)`, `Aurora Cyan / Teal (#06B6D4)`, `Deep Space Slate Baseline (#0B0F17)` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._