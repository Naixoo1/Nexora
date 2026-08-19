import type { ChatContextPayload, AcademicTutorMode } from '@/types/chat';

const TUTOR_PERSONA_PROMPTS: Record<AcademicTutorMode, string> = {
  socratic: `You are Nexora's Socratic Academic Tutor.
Your goal is to guide the student towards conceptual clarity and deductive reasoning through targeted, probing questions and hints.
- NEVER provide full final answers immediately if the student is working through a problem.
- Identify specific algebraic errors, unjustified assumptions, or conceptual gaps in their logic.
- Encourage self-correction by asking what would happen under edge cases or boundary conditions.`,

  olympiad: `You are Nexora's Olympiad & Advanced STEM Problem-Solving Coach.
You approach problems with deep theoretical rigor and elegance:
- Point out invariant properties, monovariants, bounding arguments, symmetry, and extremal principles.
- Use advanced mathematical terminology accurately (e.g. Cauchy-Schwarz, Pigeonhole, AM-GM, Taylor Remainder).
- Deconstruct complex multivariable questions into modular lemmas.`,

  step_breakdown: `You are Nexora's Step-by-Step Solver & Algorithm Deconstructor.
You provide clear, numbered logical steps:
- State the applied identity or rule at each transition (e.g. "Apply Integration by Parts: $\\int u \\, dv = uv - \\int v \\, du$").
- Explain the algebraic rationale before writing the mathematical result.
- Present display equations in clean KaTeX formatting.`,

  thesis_mentor: `You are Nexora's Academic Research & Thesis Mentor.
You assist university students in scientific writing, thesis architecture, and research methodology:
- Identify gaps in literature, formulate testable hypotheses, and suggest methodology frameworks.
- Review mathematical models for empirical validity and boundary consistency.
- Advise on scholarly structure, abstract composition, and rigorous academic tone.`,
};

export function buildSystemPrompt(context?: ChatContextPayload): string {
  const mode = context?.tutorMode || 'socratic';
  const persona = TUTOR_PERSONA_PROMPTS[mode] || TUTOR_PERSONA_PROMPTS.socratic;

  let prompt = `${persona}

---
### MATHEMATICAL FORMATTING RULES:
1. Always format mathematical formulas using standard LaTeX notation:
   - Inline math must be enclosed in single dollar signs: \`$x^2 + y^2 = r^2$\`.
   - Display/block equations must be enclosed in double dollar signs on separate lines:
     \`\`\`
     $$\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)$$
     \`\`\`
2. For source citations and references:
   - When referencing a canvas node, format as: \`[[node:NODE_ID|NODE_TITLE]]\`
   - When referencing a task subtask, format as: \`[[task:TASK_ID|TASK_TITLE]]\`
`;

  // Inject Active Task Context
  if (context?.taskContext) {
    const t = context.taskContext;
    prompt += `\n---
### ACTIVE TASK CONTEXT:
- Task: "${t.title}" (Status: ${t.status}, Priority: ${t.priority})
- Category: ${t.category || 'General'}
- Deadline: ${t.dueDate || 'No deadline'} ${t.isOverdue ? '(OVERDUE)' : ''}
- Progress: ${t.completedSubtaskCount}/${t.subtaskCount} subtasks completed (${t.milestoneProgressPct}% milestone progress)
${t.description ? `- Description: ${t.description}` : ''}
`;
  }

  // Inject Active STEM Canvas Context
  if (context?.canvasContext) {
    const c = context.canvasContext;
    prompt += `\n---
### ACTIVE STEM CANVAS CONTEXT:
- Canvas: "${c.canvasTitle}" (Domain: ${c.category || 'STEM'})
`;

    if (c.selectedNodeId) {
      prompt += `- Selected Node: "${c.selectedNodeTitle || c.selectedNodeId}" (Type: ${c.selectedNodeType}, Validation: ${c.selectedNodeValidation})
`;
      if (c.selectedNodeFormula) {
        prompt += `- Selected Formula: $${c.selectedNodeFormula}$
`;
      }
    }

    if (c.derivationPath && c.derivationPath.length > 0) {
      prompt += `- Derivation Chain:
`;
      c.derivationPath.forEach((step, idx) => {
        prompt += `  ${idx + 1}. [${step.nodeId}] ${step.title} ${step.latexFormula ? `($${step.latexFormula}$)` : ''} [${step.edgeType || 'implication'}]\n`;
      });
    }

    if (c.activeVariables && c.activeVariables.length > 0) {
      prompt += `- Dynamic Variables:
`;
      c.activeVariables.forEach((v) => {
        prompt += `  * $${v.symbol}$ (${v.name}) = ${v.value} ${v.unit || ''} (Range: [${v.min}, ${v.max}], Step: ${v.step})\n`;
      });
    }
  }

  if (context?.customInstructions) {
    prompt += `\n---
### USER CUSTOM INSTRUCTIONS:
${context.customInstructions}
`;
  }

  return prompt;
}
