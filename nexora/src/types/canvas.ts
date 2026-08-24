import type { Node, Edge, Viewport } from '@xyflow/react';

// ── Node & Edge Enums ─────────────────────────────────────
export type CanvasNodeType =
  | 'problem_root'
  | 'reasoning_step'
  | 'what_if_branch'
  | 'theorem_proof'
  | 'formula_block'
  | 'active_recall_flashcard'
  | 'timeline_event'
  | 'concept_comparison'
  | 'dialogue_rehearsal';

export type CanvasEdgeType =
  | 'implication'    // Logical deduction step (=>)
  | 'alternative'    // Alternative derivation method
  | 'dependency'     // Theorem, lemma, or axiom dependency
  | 'contradiction'; // Incompatible assumption / Reductio ad absurdum

export type NodeValidationStatus = 'valid' | 'tentative' | 'erroneous';

// ── Mathematical & Dynamic Variable Contracts ─────────────
export interface CanvasVariable {
  id: string;
  name: string;           // Variable identifier, e.g. "v_0", "theta"
  symbol: string;         // LaTeX symbol representation, e.g. "v_0", "\\theta"
  label: string;          // Human-readable name, e.g. "Initial Velocity"
  value: number;          // Current dynamic value
  defaultValue: number;   // Baseline value
  min: number;            // Lower slider bound
  max: number;            // Upper slider bound
  step: number;           // Slider increment step
  unit?: string;          // e.g. "m/s", "rad", "kg"
  description?: string;
  isIndependent: boolean; // True if user-controllable, false if computed
}

export interface LatexFormula {
  expression: string;     // Raw LaTeX, e.g. "\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
  displayMode: 'inline' | 'block';
  variables?: Record<string, string>; // Maps formula tokens to CanvasVariable IDs
  renderedResult?: string; // Evaluated numerical or algebraic result string
}

// ── Specialized Node Data Payloads ────────────────────────
export interface ProblemRootData {
  title: string;
  statement: string;
  domain: string;                   // "Calculus", "Linear Algebra", "Classical Mechanics"
  targetGoal: string;               // Target expression to solve/prove
  givenVariables: CanvasVariable[];
  latexFormula?: LatexFormula;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'olympiad';
}

export interface ReasoningStepData {
  title: string;
  stepNumber: number;
  explanation: string;
  appliedRule?: string;             // e.g. "Integration by Parts", "Chain Rule"
  latexFormula?: LatexFormula;
  intermediateResult?: string;
  validationStatus: NodeValidationStatus;
  validationMessage?: string;
  isCollapsed?: boolean;
  childCount?: number;
}

export interface WhatIfBranchData {
  hypothesis: string;               // e.g. "What if initial velocity increases by 50%?"
  modifiedVariables: {
    variableId: string;
    symbol: string;
    baselineValue: number;
    simulatedValue: number;
    deltaPercentage: number;
  }[];
  simulatedFormula: LatexFormula;
  outcomeComparison: string;        // Text explanation of difference vs baseline
  sensitivityScore?: number;        // Quantitative sensitivity index (0-1)
}

export interface TheoremProofData {
  theoremName: string;              // e.g. "Mean Value Theorem", "Taylor's Theorem"
  statementLatex: string;
  applicabilityConditions: string[];
  proofSummary?: string;
  sourceReference?: string;         // e.g. "Stewart Calculus 8th Ed., Chapter 4"
}

export interface FormulaBlockData {
  title?: string;
  formula: LatexFormula;
  stepByStepEvaluation?: {
    stepIndex: number;
    latex: string;
    explanation: string;
  }[];
  activeVariables: CanvasVariable[];
}

export interface ActiveRecallFlashcardData {
  question: string;
  answer: string;
  topicTag?: string;
  confidenceScore?: number; // 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
  isFlipped?: boolean;
  lastReviewedAt?: string;
}

export interface TimelineEventData {
  dateOrPeriod: string;
  eventTitle: string;
  causeOrSignificance: string;
  keyFigures?: string[];
  eraTag?: string;
  impactScore?: number;
}

export interface ConceptComparisonData {
  entityA: {
    name: string;
    traits: string[];
    summary?: string;
  };
  entityB: {
    name: string;
    traits: string[];
    summary?: string;
  };
  criteriaMatrix?: {
    criterion: string;
    entityAValue: string;
    entityBValue: string;
  }[];
  keyTakeaway?: string;
}

export interface DialogueRehearsalData {
  characterRole: string;
  dialogueLine: string;
  phoneticOrPronunciationCue?: string;
  toneOrContextCue?: string;
  translationOrMeaning?: string;
  rehearsalCompleted?: boolean;
}

// ── Union of All Node Data Payloads ───────────────────────
export interface CanvasNodeData {
  label?: string;
  nodeType: CanvasNodeType;
  validationStatus: NodeValidationStatus;
  isCollapsed?: boolean;
  title: string;
  content?: string;
  latexFormula?: string;
  variables?: CanvasVariable[];
  customData?:
    | { type: 'problem_root'; payload: ProblemRootData }
    | { type: 'reasoning_step'; payload: ReasoningStepData }
    | { type: 'what_if_branch'; payload: WhatIfBranchData }
    | { type: 'theorem_proof'; payload: TheoremProofData }
    | { type: 'formula_block'; payload: FormulaBlockData }
    | { type: 'active_recall_flashcard'; payload: ActiveRecallFlashcardData }
    | { type: 'timeline_event'; payload: TimelineEventData }
    | { type: 'concept_comparison'; payload: ConceptComparisonData }
    | { type: 'dialogue_rehearsal'; payload: DialogueRehearsalData }
    | Record<string, unknown>;
  [key: string]: unknown;
}

// ── React Flow Compatible DAG Node & Edge Types ───────────
export type StemCanvasNode = Node<CanvasNodeData, CanvasNodeType>;

export interface StemCanvasEdgeData {
  edgeType: CanvasEdgeType;
  label?: string;
  justification?: string;
  confidence?: number;
  [key: string]: unknown;
}

export type StemCanvasEdge = Edge<StemCanvasEdgeData, CanvasEdgeType>;

// ── Complete Canvas Aggregate & Summary ───────────────────
export interface CanvasSummary {
  id: string;
  userId: string;
  taskId: string | null;
  title: string;
  description: string | null;
  category: string | null;
  nodeCount: number;
  edgeCount: number;
  isPublic: boolean;
  viewport: Viewport;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CanvasGraph {
  id: string;
  userId: string;
  taskId: string | null;
  title: string;
  description: string | null;
  category: string | null;
  viewport: Viewport;
  nodes: StemCanvasNode[];
  edges: StemCanvasEdge[];
  globalVariables: CanvasVariable[];
  isPublic: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ── Evaluation & AI Branching Interfaces ──────────────────
export interface NodeEvaluationResult {
  nodeId: string;
  isValid: boolean;
  validationStatus: NodeValidationStatus;
  confidenceScore: number;
  rationale: string;
  stepLatex: string;
  mathematicalCheck: {
    symbolicCheckPassed: boolean;
    numericalEvaluation?: {
      computedValue: number;
      expectedValue?: number;
      absoluteError?: number;
    };
    detectedAssumptions: string[];
    suggestedCorrections?: string[];
  };
}

export interface SuggestedBranchItem {
  branchType: 'deduction_step' | 'what_if_simulation' | 'alternative_method' | 'counter_example';
  title: string;
  description: string;
  latexFormula?: string;
  suggestedNodeType: CanvasNodeType;
  suggestedEdgeType: CanvasEdgeType;
  positionOffset: { x: number; y: number };
  variables?: CanvasVariable[];
  justification: string;
}

export interface SuggestedBranchResult {
  targetNodeId: string;
  contextSummary: string;
  suggestions: SuggestedBranchItem[];
}

// ── Standardized API Response ─────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors?: Record<string, string[]>;
}

