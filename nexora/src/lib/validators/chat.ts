import { z } from 'zod';
import {
  CanvasNodeTypeSchema,
  NodeValidationStatusSchema,
  CanvasVariableSchema,
} from './canvas';
import { TaskStatusSchema, TaskPrioritySchema } from './task';

export const AcademicTutorModeSchema = z.enum([
  'socratic',
  'olympiad',
  'step_breakdown',
  'thesis_mentor',
]);

export const TaskContextSnapshotSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  category: z.string().nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  isOverdue: z.boolean().default(false),
  subtaskCount: z.number().int().min(0).default(0),
  completedSubtaskCount: z.number().int().min(0).default(0),
  milestoneProgressPct: z.number().min(0).max(100).default(0),
});

export const CanvasDerivationStepSchema = z.object({
  nodeId: z.string(),
  title: z.string(),
  nodeType: CanvasNodeTypeSchema,
  latexFormula: z.string().optional(),
  edgeType: z.string().optional(),
  validationStatus: NodeValidationStatusSchema.optional(),
});

export const CanvasContextSnapshotSchema = z.object({
  canvasId: z.string().uuid(),
  canvasTitle: z.string(),
  category: z.string().nullable().optional(),
  selectedNodeId: z.string().optional(),
  selectedNodeType: CanvasNodeTypeSchema.optional(),
  selectedNodeTitle: z.string().optional(),
  selectedNodeFormula: z.string().optional(),
  selectedNodeValidation: NodeValidationStatusSchema.optional(),
  derivationPath: z.array(CanvasDerivationStepSchema).default([]),
  activeVariables: z.array(CanvasVariableSchema).default([]),
});

export const ChatContextPayloadSchema = z.object({
  tutorMode: AcademicTutorModeSchema.default('socratic'),
  taskContext: TaskContextSnapshotSchema.optional(),
  canvasContext: CanvasContextSnapshotSchema.optional(),
  customInstructions: z.string().max(2000).optional(),
});

// ── Multimodal Attachment Validation ─────────────────────
export const ChatAttachmentTypeSchema = z.enum(['image', 'pdf', 'text']);

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const ALLOWED_PDF_MIMES = ['application/pdf'] as const;
const ALLOWED_TEXT_MIMES = ['text/plain', 'text/markdown'] as const;

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;   // 4 MB
const MAX_PDF_SIZE = 10 * 1024 * 1024;     // 10 MB
const MAX_TEXT_SIZE = 512 * 1024;           // 500 KB

export const ChatAttachmentSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(255),
    type: ChatAttachmentTypeSchema,
    mimeType: z.string().min(1),
    data: z.string().min(1),
    size: z.number().int().min(1),
  })
  .superRefine((att, ctx) => {
    switch (att.type) {
      case 'image': {
        if (!(ALLOWED_IMAGE_MIMES as readonly string[]).includes(att.mimeType)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid image MIME type "${att.mimeType}". Allowed: ${ALLOWED_IMAGE_MIMES.join(', ')}`,
            path: ['mimeType'],
          });
        }
        if (att.size > MAX_IMAGE_SIZE) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Image exceeds maximum size of ${MAX_IMAGE_SIZE / (1024 * 1024)} MB`,
            path: ['size'],
          });
        }
        break;
      }
      case 'pdf': {
        if (!(ALLOWED_PDF_MIMES as readonly string[]).includes(att.mimeType)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid PDF MIME type "${att.mimeType}". Allowed: ${ALLOWED_PDF_MIMES.join(', ')}`,
            path: ['mimeType'],
          });
        }
        if (att.size > MAX_PDF_SIZE) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `PDF exceeds maximum size of ${MAX_PDF_SIZE / (1024 * 1024)} MB`,
            path: ['size'],
          });
        }
        break;
      }
      case 'text': {
        if (!(ALLOWED_TEXT_MIMES as readonly string[]).includes(att.mimeType)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid text MIME type "${att.mimeType}". Allowed: ${ALLOWED_TEXT_MIMES.join(', ')}`,
            path: ['mimeType'],
          });
        }
        if (att.size > MAX_TEXT_SIZE) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Text file exceeds maximum size of ${MAX_TEXT_SIZE / 1024} KB`,
            path: ['size'],
          });
        }
        break;
      }
    }
  });

// ── Request Schemas ──────────────────────────────────────
export const SendChatMessageSchema = z.object({
  sessionId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  canvasId: z.string().uuid().optional(),
  message: z.string().min(1, 'Message cannot be empty').max(10000),
  context: ChatContextPayloadSchema.optional(),
  attachments: z.array(ChatAttachmentSchema).max(5).optional(),
});

export const CreateChatSessionSchema = z.object({
  taskId: z.string().uuid().optional(),
  canvasId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).default('New Brainstorming Session'),
  tutorMode: AcademicTutorModeSchema.default('socratic'),
});

export const ChatSessionListQuerySchema = z.object({
  taskId: z.string().uuid().optional(),
  canvasId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SendChatMessage = z.infer<typeof SendChatMessageSchema>;
export type CreateChatSession = z.infer<typeof CreateChatSessionSchema>;
export type ChatSessionListQuery = z.infer<typeof ChatSessionListQuerySchema>;
