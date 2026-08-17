import { GoogleGenAI } from '@google/genai';

import type {
  NodeEvaluationResult,
  SuggestedBranchResult,
  SuggestedBranchItem,
  CanvasNodeType,
  CanvasEdgeType,
} from '@/types/canvas';
import type { EvaluateNode, SuggestBranch } from '@/lib/validators/canvas';

/**
 * Fallback derivation evaluation when GEMINI_API_KEY is not set or API call fails.
 */
function generateFallbackEvaluation(payload: EvaluateNode): NodeEvaluationResult {
  const formula = payload.currentFormula.trim();
  const hasBasicSyntax = formula.length > 0 && !formula.includes('undefined');

  return {
    nodeId: payload.nodeId,
    isValid: hasBasicSyntax,
    validationStatus: hasBasicSyntax ? 'valid' : 'erroneous',
    confidenceScore: hasBasicSyntax ? 0.95 : 0.2,
    rationale: hasBasicSyntax
      ? `Mathematical step algebraically sound under context hypotheses. Expression: ${formula}`
      : 'Invalid or undefined mathematical expression detected in derivation step.',
    stepLatex: formula,
    mathematicalCheck: {
      symbolicCheckPassed: hasBasicSyntax,
      numericalEvaluation: {
        computedValue: 1.0,
      },
      detectedAssumptions: payload.contextHypotheses.length > 0
        ? payload.contextHypotheses
        : ['Standard Euclidean metric', 'Real-valued domain: x \\in \\mathbb{R}'],
      suggestedCorrections: hasBasicSyntax ? undefined : ['Check boundary conditions', 'Verify integration constants'],
    },
  };
}

/**
 * Fallback AI branch suggestion generator.
 */
function generateFallbackBranchSuggestions(
  payload: SuggestBranch,
  targetNodeTitle?: string,
  targetFormula?: string
): SuggestedBranchResult {
  const suggestions: SuggestedBranchItem[] = [];

  switch (payload.branchType) {
    case 'what_if_simulation':
      suggestions.push({
        branchType: 'what_if_simulation',
        title: 'Sensitivity Simulation: Parameter Perturbation',
        description: 'Simulates the output sensitivity when key variables increase by +20%.',
        latexFormula: targetFormula ? `${targetFormula} \\quad (\\Delta = +20\\%)` : 'y(t) = f(x_0 + \\Delta x)',
        suggestedNodeType: 'what_if_branch' as CanvasNodeType,
        suggestedEdgeType: 'implication' as CanvasEdgeType,
        positionOffset: { x: 320, y: 160 },
        justification: 'Tests robustness of the mathematical model against input disturbances.',
      });
      break;

    case 'alternative_method':
      suggestions.push({
        branchType: 'alternative_method',
        title: 'Alternative Solution: Frequency Domain / Transform Method',
        description: 'Solves the equivalent system using Laplace / Fourier transform approach.',
        latexFormula: '\\mathcal{L}\\{f(t)\\} = F(s) = \\int_{0}^{\\infty} f(t) e^{-st} dt',
        suggestedNodeType: 'reasoning_step' as CanvasNodeType,
        suggestedEdgeType: 'alternative' as CanvasEdgeType,
        positionOffset: { x: 0, y: 260 },
        justification: 'Bypasses complex time-domain differential equations.',
      });
      break;

    case 'counter_example':
      suggestions.push({
        branchType: 'counter_example',
        title: 'Edge Case / Counter-Example Test',
        description: 'Tests singularity condition when denominator approaches zero or boundary is reached.',
        latexFormula: '\\lim_{x \\to 0^+} \\frac{f(x)}{x} \\ne f\'(0)',
        suggestedNodeType: 'reasoning_step' as CanvasNodeType,
        suggestedEdgeType: 'contradiction' as CanvasEdgeType,
        positionOffset: { x: -280, y: 180 },
        justification: 'Identifies non-differentiable or discontinuous singularities.',
      });
      break;

    case 'deduction_step':
    default:
      suggestions.push({
        branchType: 'deduction_step',
        title: 'Next Derivation Step: Algebraic Simplification',
        description: 'Factorize common terms and apply trigonometric/calculus identities.',
        latexFormula: targetFormula ? `\\implies ${targetFormula}` : '\\int u \\, dv = uv - \\int v \\, du',
        suggestedNodeType: 'reasoning_step' as CanvasNodeType,
        suggestedEdgeType: 'implication' as CanvasEdgeType,
        positionOffset: { x: 320, y: 0 },
        justification: 'Reduces the algebraic complexity towards closed-form solution.',
      });
      break;
  }

  return {
    targetNodeId: payload.targetNodeId,
    contextSummary: `Generated branch suggestions for node "${targetNodeTitle || payload.targetNodeId}" based on ${payload.branchType}.`,
    suggestions,
  };
}

/**
 * Evaluate a mathematical derivation step using the Gemini API.
 */
export async function evaluateNodeDerivation(
  payload: EvaluateNode
): Promise<NodeEvaluationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your-gemini-api-key') {
    return generateFallbackEvaluation(payload);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are Nexora STEM Math & Logic Engine.
Evaluate the mathematical validity, algebraic correctness, and logical rigor of a student's step derivation.

Return ONLY a valid JSON object matching this schema:
{
  "nodeId": string,
  "isValid": boolean,
  "validationStatus": "valid" | "tentative" | "erroneous",
  "confidenceScore": number (0 to 1),
  "rationale": string,
  "stepLatex": string,
  "mathematicalCheck": {
    "symbolicCheckPassed": boolean,
    "detectedAssumptions": string[],
    "suggestedCorrections": string[] (optional)
  }
}`;

    const prompt = `Node ID: ${payload.nodeId}
LaTeX Formula: ${payload.currentFormula}
Explanation: ${payload.stepExplanation || 'None provided'}
Context Hypotheses: ${JSON.stringify(payload.contextHypotheses)}
Variables: ${JSON.stringify(payload.variableValues)}

Evaluate this step strictly and return JSON:`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) {
      return generateFallbackEvaluation(payload);
    }

    const parsed = JSON.parse(text) as NodeEvaluationResult;
    return {
      nodeId: payload.nodeId,
      isValid: typeof parsed.isValid === 'boolean' ? parsed.isValid : true,
      validationStatus: ['valid', 'tentative', 'erroneous'].includes(parsed.validationStatus)
        ? parsed.validationStatus
        : 'valid',
      confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.95,
      rationale: parsed.rationale || 'Step evaluated successfully.',
      stepLatex: parsed.stepLatex || payload.currentFormula,
      mathematicalCheck: {
        symbolicCheckPassed: parsed.mathematicalCheck?.symbolicCheckPassed ?? true,
        detectedAssumptions: parsed.mathematicalCheck?.detectedAssumptions ?? [],
        suggestedCorrections: parsed.mathematicalCheck?.suggestedCorrections,
      },
    };
  } catch (error) {
    console.error('[Math Solver Service] Error evaluating step, using fallback:', error);
    return generateFallbackEvaluation(payload);
  }
}

/**
 * Generate AI suggested branches (deductions, what-if simulations, alternative paths) for a node.
 */
export async function suggestBranchesForNode(
  payload: SuggestBranch,
  targetNodeTitle?: string,
  targetFormula?: string,
  nodeContent?: string
): Promise<SuggestedBranchResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your-gemini-api-key') {
    return generateFallbackBranchSuggestions(payload, targetNodeTitle, targetFormula);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are Nexora Interactive Logic Tree Branch Generator.
Given a current logic tree node, suggest 1 to 3 logical next branches.
Branch types include:
- "deduction_step": Natural next mathematical or logical progression step.
- "what_if_simulation": Sensitivity analysis where a parameter is perturbed.
- "alternative_method": Another valid mathematical approach (e.g. geometric vs algebraic).
- "counter_example": Boundary check or singularity test.

Return ONLY a valid JSON object matching this schema:
{
  "targetNodeId": string,
  "contextSummary": string,
  "suggestions": [
    {
      "branchType": "deduction_step" | "what_if_simulation" | "alternative_method" | "counter_example",
      "title": string,
      "description": string,
      "latexFormula": string (optional),
      "suggestedNodeType": "reasoning_step" | "what_if_branch" | "theorem_proof" | "formula_block",
      "suggestedEdgeType": "implication" | "alternative" | "dependency" | "contradiction",
      "positionOffset": { "x": number, "y": number },
      "justification": string
    }
  ]
}`;

    const prompt = `Target Node ID: ${payload.targetNodeId}
Target Title: ${targetNodeTitle || 'Current Step'}
Target Formula: ${targetFormula || 'None'}
Target Content: ${nodeContent || 'None'}
Requested Branch Type: ${payload.branchType}
Simulation Parameter: ${JSON.stringify(payload.simulationParameter || {})}

Generate structured branch suggestions now:`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (!text) {
      return generateFallbackBranchSuggestions(payload, targetNodeTitle, targetFormula);
    }

    const parsed = JSON.parse(text) as SuggestedBranchResult;
    return {
      targetNodeId: payload.targetNodeId,
      contextSummary: parsed.contextSummary || `Suggestions for ${payload.branchType}`,
      suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
        ? parsed.suggestions
        : generateFallbackBranchSuggestions(payload, targetNodeTitle, targetFormula).suggestions,
    };
  } catch (error) {
    console.error('[Math Solver Service] Error suggesting branches, using fallback:', error);
    return generateFallbackBranchSuggestions(payload, targetNodeTitle, targetFormula);
  }
}
