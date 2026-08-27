import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureUserExists, createCanvas } from '@/services/canvas';

// Hoist mock object for Drizzle db queries
const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
      transaction: vi.fn(),
    },
  };
});

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

describe('Canvas Service (canvas.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ensureUserExists', () => {
    it('returns resolved user ID and creates fallback user if missing', async () => {
      // User doesn't exist in DB
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue({}),
        }),
      });

      const result = await ensureUserExists('test-user-123');
      expect(result).toBe('test-user-123');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('returns existing user ID when user is already present', async () => {
      // User exists in DB
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing-user' }]),
          }),
        }),
      });

      const result = await ensureUserExists('existing-user');
      expect(result).toBe('existing-user');
    });

    it('defaults to guest-user if empty string is provided', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'guest-user' }]),
          }),
        }),
      });

      const result = await ensureUserExists('');
      expect(result).toBe('guest-user');
    });
  });

  describe('createCanvas', () => {
    it('creates canvas with transaction, handling sanitized optional fields', async () => {
      // User exists
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
          }),
        }),
      });

      const mockCreatedCanvas = {
        id: 'canvas-uuid-1',
        userId: 'user-1',
        taskId: null,
        title: 'Gerak Parabola',
        description: 'Fisika Kinematika',
        category: 'Fisika',
        viewport: { x: 0, y: 0, zoom: 1 },
        globalVars: [],
        isPublic: false,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockRootNode = {
        id: 'root-problem-1',
        canvasId: 'canvas-uuid-1',
        nodeType: 'problem_root',
        positionX: 0,
        positionY: 0,
        title: 'Gerak Parabola',
        content: 'Tentukan jarak terjauh peluru',
        latexFormula: 'R = \\frac{v_0^2 \\sin 2\\theta}{g}',
        validationStatus: 'valid',
        variables: [],
        data: {},
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        const fakeTx = {
          insert: vi.fn((table) => ({
            values: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue(
                table === mockDb ? [mockCreatedCanvas] : [mockRootNode]
              ),
            })),
          })),
        };
        // Mock returning for newCanvas
        fakeTx.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockCreatedCanvas]),
          }),
        });
        // Mock returning for rootNode
        fakeTx.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockRootNode]),
          }),
        });

        return callback(fakeTx);
      });

      const result = await createCanvas('user-1', {
        title: 'Gerak Parabola',
        description: 'Fisika Kinematika',
        category: 'Fisika',
        initialProblem: {
          statement: 'Tentukan jarak terjauh peluru',
          domain: 'Physics',
          latexFormula: 'R = \\frac{v_0^2 \\sin 2\\theta}{g}',
        },
      });

      expect(result.id).toBe('canvas-uuid-1');
      expect(result.title).toBe('Gerak Parabola');
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].data.latexFormula).toBe('R = \\frac{v_0^2 \\sin 2\\theta}{g}');
    });
  });
});
