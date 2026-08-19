import { describe, it, expect } from 'vitest';
import {
  AcademicTutorModeSchema,
  SendChatMessageSchema,
  CreateChatSessionSchema,
  ChatSessionListQuerySchema,
} from '@/lib/validators/chat';

describe('Chat Validators', () => {
  it('validates all academic tutor modes', () => {
    const modes = ['socratic', 'olympiad', 'step_breakdown', 'thesis_mentor'];
    for (const mode of modes) {
      expect(AcademicTutorModeSchema.parse(mode)).toBe(mode);
    }
    expect(() => AcademicTutorModeSchema.parse('invalid_mode')).toThrow();
  });

  it('validates SendChatMessage with dynamic task and canvas context', () => {
    const payload = {
      message: 'Can you verify this derivation step?',
      context: {
        tutorMode: 'socratic' as const,
        taskContext: {
          taskId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          title: 'Calculus Optimization Homework',
          status: 'in_progress' as const,
          priority: 'high' as const,
          isOverdue: false,
          subtaskCount: 5,
          completedSubtaskCount: 2,
          milestoneProgressPct: 40,
        },
        canvasContext: {
          canvasId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          canvasTitle: 'Projectile Motion DAG',
          selectedNodeId: 'node-2',
          selectedNodeTitle: 'Take derivative dy/dt',
          selectedNodeFormula: 'v(t) = v_0 - gt',
          derivationPath: [
            {
              nodeId: 'node-1',
              title: 'Problem Root',
              nodeType: 'problem_root',
              latexFormula: 'y(t) = v_0 t - \\frac{1}{2} g t^2',
            },
            {
              nodeId: 'node-2',
              title: 'Take derivative dy/dt',
              nodeType: 'reasoning_step',
              latexFormula: 'v(t) = v_0 - gt',
              edgeType: 'implication',
            },
          ],
          activeVariables: [
            {
              id: 'v_0',
              name: 'v_0',
              symbol: 'v_0',
              label: 'Initial Velocity',
              value: 25,
              defaultValue: 20,
              min: 0,
              max: 100,
              step: 1,
              isIndependent: true,
            },
          ],
        },
      },
    };

    const parsed = SendChatMessageSchema.parse(payload);
    expect(parsed.message).toBe('Can you verify this derivation step?');
    expect(parsed.context?.taskContext?.milestoneProgressPct).toBe(40);
    expect(parsed.context?.canvasContext?.derivationPath).toHaveLength(2);
  });

  it('validates CreateChatSession and ChatSessionListQuery', () => {
    const sessionPayload = {
      title: 'Thermodynamics Problem Discussion',
      tutorMode: 'olympiad' as const,
    };
    const session = CreateChatSessionSchema.parse(sessionPayload);
    expect(session.tutorMode).toBe('olympiad');

    const query = ChatSessionListQuerySchema.parse({ page: '2', limit: '10' });
    expect(query.page).toBe(2);
    expect(query.limit).toBe(10);
  });
});
