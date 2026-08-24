import type { CanvasVariable, CanvasNodeType, NodeValidationStatus } from './canvas';
import type { TaskStatus, TaskPriority } from './task';

// ── Roles & Pedagogical Modes ────────────────────────────
export type ChatRole = 'user' | 'assistant' | 'system';

export type AcademicTutorMode =
  | 'socratic'        // Guided inquiry, questions student assumptions
  | 'olympiad'        // Deep theoretical rigor, invariants, monovariants
  | 'step_breakdown'  // Progressive derivation with explicit KaTeX displays
  | 'step-by-step'    // Strict derivation steps, verifying each line of math
  | 'brainstorming'   // Structured bullet outlines & methodology frameworks
  | 'thesis_mentor'   // Literature gap identification, methodology structure
  | 'general';        // Direct, concise, versatile conversational replies

// ── Multimodal Attachments ───────────────────────────────
export type ChatAttachmentType = 'image' | 'pdf' | 'text';

export interface ChatAttachment {
  id: string;
  name: string;                              // Original filename: "calculus_hw.jpg"
  type: ChatAttachmentType;                  // Discriminator for processing strategy
  mimeType: string;                          // IANA MIME: "image/jpeg", "application/pdf", "text/plain"
  data: string;                              // base64 for images/PDFs, raw text for text attachments
  size: number;                              // Byte size of original file (pre-encoding)
}

/** Lightweight metadata envelope stored in DB (excludes raw base64 data). */
export interface ChatAttachmentMeta {
  id: string;
  name: string;
  type: ChatAttachmentType;
  mimeType: string;
  size: number;
}

// ── Dynamic Context Snapshots ────────────────────────────
export interface TaskSubtaskSnapshot {
  id: string;
  title: string;
  status?: TaskStatus;
  completed: boolean;
}

export interface TaskContextSnapshot {
  taskId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string | null;
  dueDate?: string | null;
  isOverdue: boolean;
  subtasks?: TaskSubtaskSnapshot[];
  subtaskCount: number;
  completedSubtaskCount: number;
  milestoneProgressPct: number; // Derived: (completed / total) * 100
}

export interface CanvasDerivationStep {
  nodeId: string;
  title: string;
  nodeType: CanvasNodeType;
  latexFormula?: string;
  edgeType?: string;
  validationStatus?: NodeValidationStatus;
}

export interface CanvasNodeSnapshot {
  id: string;
  title: string;
  content?: string;
  latexFormula?: string;
  nodeType?: CanvasNodeType;
  validationStatus?: NodeValidationStatus;
  parentIds?: string[];
  isRoot?: boolean;
  isSelected?: boolean;
}

export interface CanvasEdgeSnapshot {
  id: string;
  source: string;
  target: string;
  label?: string;
  edgeType?: string;
}

export interface CanvasContextSnapshot {
  canvasId: string;
  canvasTitle: string;
  category?: string | null;
  targetGoal?: string | null;
  description?: string | null;
  selectedNodeId?: string;
  selectedNodeType?: CanvasNodeType;
  selectedNodeTitle?: string;
  selectedNodeFormula?: string;
  selectedNodeValidation?: NodeValidationStatus;
  derivationPath: CanvasDerivationStep[]; // Root-to-active node deduction sequence
  activeVariables: CanvasVariable[];     // Dynamic sliders with live values
  nodes?: CanvasNodeSnapshot[];           // Complete DAG tree nodes
  edges?: CanvasEdgeSnapshot[];           // Logic connections & hierarchy
}

import type { GradeLevel, SubjectCategory } from './planner';
import type { AppLocale } from '@/stores/useLanguageStore';

export interface ChatContextPayload {
  tutorMode: AcademicTutorMode;
  gradeLevel?: GradeLevel;
  subjectContext?: SubjectCategory;
  locale?: AppLocale;
  taskContext?: TaskContextSnapshot;
  canvasContext?: CanvasContextSnapshot;
  customInstructions?: string;
}

// ── Citations & Source Attribution ───────────────────────
export interface ChatSourceCitation {
  id: string;
  sourceType: 'task' | 'canvas_node' | 'formula' | 'document_chunk';
  referenceId: string;   // task UUID or React Flow node ID
  label: string;         // e.g. "Node 2: Integration by Parts" or "Task: Differential Equations"
  snippet?: string;      // LaTeX formula or text summary
}

// ── Message & Session Entities ───────────────────────────
export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: ChatRole;
  content: string;
  citations?: ChatSourceCitation[];
  attachments?: ChatAttachmentMeta[];
  contextSnapshot?: ChatContextPayload;
  createdAt: Date | string;
}

export interface ChatSession {
  id: string;
  userId: string;
  taskId?: string | null;
  canvasId?: string | null;
  title: string;
  tutorMode: AcademicTutorMode;
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}
