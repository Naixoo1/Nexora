import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '@/services/chat-prompt';
import {
  mockTaskContext,
  mockOverdueTaskContext,
  mockCanvasContext,
  mockChatContextPayload,
} from '../../mocks/chatMocks';
import type { ChatContextPayload, AcademicTutorMode } from '@/types/chat';

describe('chat-prompt service (buildSystemPrompt)', () => {
  describe('Tutor Mode Personas', () => {
    it('should build Socratic persona and default when no context is passed', () => {
      // Arrange & Act
      const prompt = buildSystemPrompt();

      // Assert
      expect(prompt).toContain("You are Nexora's Socratic Academic Tutor.");
      expect(prompt).toContain('NEVER provide full final answers immediately');
      expect(prompt).toContain('MATHEMATICAL FORMATTING RULES');
      expect(prompt).toContain('Strict Persona & Anti-Thought Leaking');
      expect(prompt).toContain('MANDATORY STEM CANVAS NODE GENERATION');
      expect(prompt).toContain('[[node:NODE_ID|NODE_TITLE]]');
    });

    it('should build Olympiad persona when tutorMode is olympiad', () => {
      // Arrange
      const context: ChatContextPayload = {
        tutorMode: 'olympiad',
      };

      // Act
      const prompt = buildSystemPrompt(context);

      // Assert
      expect(prompt).toContain("You are Nexora's Olympiad & Advanced STEM Problem-Solving Coach.");
      expect(prompt).toContain('invariant properties, monovariants, bounding arguments');
      expect(prompt).toContain('Cauchy-Schwarz');
    });

    it('should build Step Breakdown persona when tutorMode is step_breakdown', () => {
      // Arrange
      const context: ChatContextPayload = {
        tutorMode: 'step_breakdown',
      };

      // Act
      const prompt = buildSystemPrompt(context);

      // Assert
      expect(prompt).toContain("You are Nexora's Step-by-Step Solver & Algorithm Deconstructor.");
      expect(prompt).toContain('State the applied identity or rule at each transition');
      expect(prompt).toContain('clean KaTeX formatting');
    });

    it('should build Thesis Mentor persona when tutorMode is thesis_mentor', () => {
      // Arrange
      const context: ChatContextPayload = {
        tutorMode: 'thesis_mentor',
      };

      // Act
      const prompt = buildSystemPrompt(context);

      // Assert
      expect(prompt).toContain("You are Nexora's Academic Research & Thesis Mentor.");
      expect(prompt).toContain('Identify gaps in literature, formulate testable hypotheses');
      expect(prompt).toContain('scientific writing, thesis architecture');
    });

    it('should fallback to Socratic persona when unknown tutorMode is provided', () => {
      // Arrange
      const context = {
        tutorMode: 'unknown_mode' as unknown as AcademicTutorMode,
      };

      // Act
      const prompt = buildSystemPrompt(context);

      // Assert
      expect(prompt).toContain("You are Nexora's Socratic Academic Tutor.");
    });
  });

  describe('Task Context Injection', () => {
    it('should inject active task metadata, progress, and category into system prompt', () => {
      // Arrange
      const context: ChatContextPayload = {
        tutorMode: 'step_breakdown',
        taskContext: mockTaskContext,
      };

      // Act
      const prompt = buildSystemPrompt(context);

      // Assert
      expect(prompt).toContain('ACTIVE TASK CONTEXT:');
      expect(prompt).toContain('Task: "Kalkulus Integral: Derivasi Persamaan Bernoulli"');
      expect(prompt).toContain('Status: in_progress, Priority: high');
      expect(prompt).toContain('Category: Fisika & Matematika');
      expect(prompt).toContain('Progress: 3/4 subtasks completed (75% milestone progress)');
      expect(prompt).toContain('Turunkan hukum kontinuitas fluida');
      expect(prompt).not.toContain('(OVERDUE)');
    });

    it('should append (OVERDUE) tag when task isOverdue is true', () => {
      // Arrange
      const context: ChatContextPayload = {
        tutorMode: 'socratic',
        taskContext: mockOverdueTaskContext,
      };

      // Act
      const prompt = buildSystemPrompt(context);

      // Assert
      expect(prompt).toContain('Task: "Tugas Aljabar Linear: Nilai Eigen & Vektor Eigen"');
      expect(prompt).toContain('(OVERDUE)');
      expect(prompt).toContain('Progress: 1/5 subtasks completed (20% milestone progress)');
    });
  });

  describe('Canvas Context Injection', () => {
    it('should inject active canvas context including selected node, formula, derivation path, and dynamic variables', () => {
      // Arrange
      const context: ChatContextPayload = {
        tutorMode: 'olympiad',
        canvasContext: mockCanvasContext,
      };

      // Act
      const prompt = buildSystemPrompt(context);

      // Assert
      expect(prompt).toContain('ACTIVE STEM CANVAS CONTEXT:');
      expect(prompt).toContain('Canvas: "Derivasi Gerak Parabola & Jangkauan Maksimum"');
      expect(prompt).toContain('Selected Node: "Dekomposisi Vektor Kecepatan"');
      expect(prompt).toContain('Selected Formula: $v_x = v_0 \\cos(\\theta), \\quad v_y = v_0 \\sin(\\theta) - gt$');
      expect(prompt).toContain('Derivation Chain:');
      expect(prompt).toContain('1. [node-root-1] Problem Root: Proyektil 2D');
      expect(prompt).toContain('2. [node-step-1] Dekomposisi Vektor Kecepatan');
      expect(prompt).toContain('Dynamic Variables:');
      expect(prompt).toContain('* $v_0$ (v_0) = 25 m/s');
      expect(prompt).toContain('* $\\theta$ (theta) = 45 deg');
    });

    it('should handle canvas context with minimal fields and empty path/variables', () => {
      // Arrange
      const minimalCanvasContext = {
        canvasId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
        canvasTitle: 'Analisis Fourier',
        derivationPath: [],
        activeVariables: [],
      };

      const context: ChatContextPayload = {
        tutorMode: 'socratic',
        canvasContext: minimalCanvasContext,
      };

      // Act
      const prompt = buildSystemPrompt(context);

      // Assert
      expect(prompt).toContain('Canvas: "Analisis Fourier"');
      expect(prompt).not.toContain('Derivation Chain:');
      expect(prompt).not.toContain('Dynamic Variables:');
    });
  });

  describe('Custom User Instructions & Combined Rich Context', () => {
    it('should append user custom instructions section when present', () => {
      // Arrange
      const context: ChatContextPayload = {
        tutorMode: 'socratic',
        customInstructions: 'Gunakan analogi fisika klasik dan hindari istilah kalkulus lanjutan.',
      };

      // Act
      const prompt = buildSystemPrompt(context);

      // Assert
      expect(prompt).toContain('USER CUSTOM INSTRUCTIONS:');
      expect(prompt).toContain('Gunakan analogi fisika klasik dan hindari istilah kalkulus lanjutan.');
    });

    it('should integrate task context, canvas context, and custom instructions together seamlessly', () => {
      // Arrange & Act
      const prompt = buildSystemPrompt(mockChatContextPayload);

      // Assert
      expect(prompt).toContain("You are Nexora's Socratic Academic Tutor.");
      expect(prompt).toContain('ACTIVE TASK CONTEXT:');
      expect(prompt).toContain('ACTIVE STEM CANVAS CONTEXT:');
      expect(prompt).toContain('USER CUSTOM INSTRUCTIONS:');
      expect(prompt).toContain('Gunakan Bahasa Indonesia formal');
    });
  });
});
