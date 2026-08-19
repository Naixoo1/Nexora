import type { CanvasVariable, CanvasNodeType, NodeValidationStatus } from './canvas';
import type { TaskStatus, TaskPriority } from './task';

// ── Roles & Pedagogical Modes ────────────────────────────
export type ChatRole = 'user' | 'assistant' | 'system';

export type AcademicTutorMode =
  | 'socratic'        // Guided inquiry, questions student assumptions
  | 'olympiad'        // Deep theoretical rigor, invariants, monovariants
  | 'step_breakdown'  // Progressive derivation with explicit KaTeX displays
  | 'thesis_mentor';  // Literature gap identification, methodology structure

// ── Dynamic Context Snapshots ────────────────────────────
export interface TaskContextSnapshot {
  taskId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string | null;
  dueDate?: string | null;
  isOverdue: boolean;
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

export interface CanvasContextSnapshot {
  canvasId: string;
  canvasTitle: string;
  category?: string | null;
  selectedNodeId?: string;
  selectedNodeType?: CanvasNodeType;
  selectedNodeTitle?: string;
  selectedNodeFormula?: string;
  selectedNodeValidation?: NodeValidationStatus;
  derivationPath: CanvasDerivationStep[]; // Root-to-active node deduction sequence
  activeVariables: CanvasVariable[];     // Dynamic sliders with live values
}

export interface ChatContextPayload {
  tutorMode: AcademicTutorMode;
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
