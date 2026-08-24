import { GoogleGenAI } from '@google/genai';
import { getModelCascade, delayWithJitter } from '@/services/ai-cascade';
import type {
  SuggestedBranchResult,
  SuggestedBranchItem,
  CanvasNodeType,
  CanvasEdgeType,
  CanvasVariable,
} from '@/types/canvas';
import type { SuggestBranch } from '@/lib/validators/canvas';

/**
 * Extracts and maps known mathematical variables and symbols from text/formula context.
 */
function extractContextualVariables(
  selectedNodeFormula?: string,
  problemFormula?: string,
  variablesContext?: CanvasVariable[]
): { a1?: string; d?: string; n?: string; genericVars: string[] } {
  const vars: { a1?: string; d?: string; n?: string; genericVars: string[] } = {
    genericVars: [],
  };

  if (variablesContext && variablesContext.length > 0) {
    for (const v of variablesContext) {
      if (v.symbol === 'a_1' || v.name === 'a_1' || v.name === 'a1') {
        vars.a1 = String(v.value);
      } else if (v.symbol === 'd' || v.name === 'd') {
        vars.d = String(v.value);
      } else if (v.symbol === 'n' || v.name === 'n') {
        vars.n = String(v.value);
      } else {
        vars.genericVars.push(`${v.symbol || v.name} = ${v.value}`);
      }
    }
  }

  // Regex extraction fallback from formula strings (e.g., a_1 = 7, d = 3)
  const combinedText = `${selectedNodeFormula || ''} ${problemFormula || ''}`;
  const a1Match = combinedText.match(/a(?:_1|1)\s*=\s*([0-9.-]+)/i);
  if (a1Match && !vars.a1) vars.a1 = a1Match[1];

  const dMatch = combinedText.match(/d\s*=\s*([0-9.-]+)/i);
  if (dMatch && !vars.d) vars.d = dMatch[1];

  const nMatch = combinedText.match(/n\s*=\s*([0-9.-]+)/i);
  if (nMatch && !vars.n) vars.n = nMatch[1];

  return vars;
}

/**
 * Generates 3 subject-aware dynamic fallback branches when AI is unavailable or fails.
 */
export function generateDynamicSubjectFallbacks(
  payload: SuggestBranch,
  targetNodeTitle?: string,
  targetFormula?: string,
  problemRootTitle?: string
): SuggestedBranchResult {
  const selectedFormula = payload.selectedNode?.latexFormula || targetFormula || '';
  const problemFormula = payload.problemRoot?.latexFormula || '';
  const contextVars = extractContextualVariables(
    selectedFormula,
    problemFormula,
    payload.variablesContext
  );

  const a1 = contextVars.a1 || '7';
  const d = contextVars.d || '3';
  const nodeTitle = payload.selectedNode?.title || targetNodeTitle || 'Langkah Derivasi';

  // Handle specific single branch requests if explicitly specified
  if (payload.branchType === 'what_if_simulation') {
    const delta = payload.simulationParameter?.deltaPercent || 20;
    const varName = payload.simulationParameter?.variableId || 'k';
    const singleWhatIf: SuggestedBranchItem = {
      branchType: 'what_if_simulation',
      angleType: 'what_if_exploration',
      title: `Sensitivity Simulation: Parameter Perturbation (${varName} +${delta}%)`,
      description: `Simulates output sensitivity when key variable ${varName} increases by +${delta}%.`,
      latexFormula: targetFormula ? `${targetFormula} \\quad (\\Delta ${varName} = +${delta}\\%)` : `y(t) = f(${varName} + \\Delta ${varName})`,
      suggestedNodeType: 'what_if_branch' as CanvasNodeType,
      suggestedEdgeType: 'implication' as CanvasEdgeType,
      positionOffset: { x: 320, y: 160 },
      justification: 'Tests robustness of the mathematical model against input disturbances.',
    };
    return {
      targetNodeId: payload.targetNodeId,
      contextSummary: `Generated what-if simulation for node "${nodeTitle}".`,
      suggestions: [singleWhatIf],
    };
  }

  if (payload.branchType === 'counter_example') {
    const singleCounter: SuggestedBranchItem = {
      branchType: 'counter_example',
      angleType: 'what_if_exploration',
      title: 'Uji Kasus Batas / Counter-Example Test',
      description: 'Tests singularity condition when denominator approaches zero or boundary is reached.',
      latexFormula: '\\lim_{x \\to 0^+} \\frac{f(x)}{x} \\ne f\'(0)',
      suggestedNodeType: 'reasoning_step' as CanvasNodeType,
      suggestedEdgeType: 'contradiction' as CanvasEdgeType,
      positionOffset: { x: -280, y: 180 },
      justification: 'Identifies non-differentiable or discontinuous singularities.',
    };
    return {
      targetNodeId: payload.targetNodeId,
      contextSummary: `Generated counter-example test for node "${nodeTitle}".`,
      suggestions: [singleCounter],
    };
  }

  // 1. Angle 1: Alternative Method
  const angle1: SuggestedBranchItem = {
    branchType: 'alternative_method',
    angleType: 'alternative_method',
    title: 'Metode Alternatif: Pasangan Nilai Suku (Gauss Pairing)',
    description: `Gunakan metode penjumlahan berpasangan suku awal dan akhir $S_n = \\frac{n}{2}(a_1 + a_n)$ untuk memvalidasi rumus umum deret aritmatika tanpa ekspansi aljabar panjang.`,
    hypothesis: 'Penjumlahan simetris suku ke-k dan suku ke-(n-k+1) menghasilkan nilai konstan.',
    latexFormula: `S_n = \\frac{n}{2}(${a1} + a_n) \\iff S_n = \\frac{n}{2}[${a1} + (${a1} + (n-1)${d})]`,
    suggestedNodeType: 'reasoning_step' as CanvasNodeType,
    suggestedEdgeType: 'alternative' as CanvasEdgeType,
    positionOffset: { x: -320, y: 160 },
    justification: 'Menyediakan sudut pandang geometris/simetris yang intuitif bagi pembuktian rumus deret.',
  };

  // 2. Angle 2: Next Logical Progression
  const angle2: SuggestedBranchItem = {
    branchType: 'deduction_step',
    angleType: 'next_progression',
    title: 'Kelanjutan Logis: Substitusi Nilai Parameter ke Rumus Jumlah $S_n$',
    description: `Lanjutkan langkah turunan dengan mensubstitusikan suku pertama $a_1 = ${a1}$ dan beda $d = ${d}$ ke dalam bentuk umum deret aritmatika $S_n = \\frac{n}{2}[2a_1 + (n-1)d]$.`,
    hypothesis: `Ekspansi aljabar langsung menghasilkan rumus suku banyak eksplisit dalam variabel $n$.`,
    latexFormula: `S_n = \\frac{n}{2}[2(${a1}) + (n-1)(${d})] = \\frac{n}{2}[14 + 3n - 3] = \\frac{n}{2}(3n + 11)`,
    suggestedNodeType: 'reasoning_step' as CanvasNodeType,
    suggestedEdgeType: 'implication' as CanvasEdgeType,
    positionOffset: { x: 0, y: 220 },
    justification: 'Langkah langsung berikutnya untuk menyelesaikan target pencarian nilai/rumus $S_n$.',
  };

  // 3. Angle 3: What-If / Edge Case Exploration
  const negatedD = d.startsWith('-') ? d.substring(1) : `-${d}`;
  const angle3: SuggestedBranchItem = {
    branchType: 'what_if_simulation',
    angleType: 'what_if_exploration',
    title: `Simulasi What-If: Eksplorasi Beda Negatif ($d = ${negatedD}$)`,
    description: `Uji perilaku barisan apabila beda antar suku bernilai negatif ($d = ${negatedD}$). Barisan menjadi monoton turun menuju nilai negatif.`,
    hypothesis: `Jika $d = ${negatedD} < 0$, maka suku ke-$n$ akan bernilai negatif untuk $n > \\lceil \\frac{${a1}}{${Math.abs(Number(d) || 3)}} \\rceil + 1$.`,
    latexFormula: `a_n = ${a1} + (n-1)(${negatedD}) = ${Number(a1) + Math.abs(Number(d) || 3)} - ${Math.abs(Number(d) || 3)}n`,
    suggestedNodeType: 'what_if_branch' as CanvasNodeType,
    suggestedEdgeType: 'implication' as CanvasEdgeType,
    positionOffset: { x: 320, y: 160 },
    justification: 'Menganalisis sensitivitas dan konvergensi barisan saat gradien pertumbuhan berbalik arah.',
  };

  return {
    targetNodeId: payload.targetNodeId,
    contextSummary: `Dihasilkan 3 cabang sudut pandang pedagogis untuk node "${nodeTitle}".`,
    suggestions: [angle1, angle2, angle3],
  };
}

/**
 * Primary AI Multi-Branch Generator with Full Graph Lineage and 3 Pedagogical Angles.
 */
export async function suggestBranchesForNode(
  payload: SuggestBranch,
  targetNodeTitle?: string,
  targetFormula?: string,
  nodeContent?: string,
  existingContext?: string
): Promise<SuggestedBranchResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your-gemini-api-key') {
    return generateDynamicSubjectFallbacks(payload, targetNodeTitle, targetFormula);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build rich graph lineage context
    const selectedNodeInfo = payload.selectedNode || {
      id: payload.targetNodeId,
      title: targetNodeTitle || 'Focused Node',
      content: nodeContent,
      latexFormula: targetFormula,
    };

    const problemRootInfo = payload.problemRoot
      ? `Problem Root: "${payload.problemRoot.title}" ${
          payload.problemRoot.latexFormula ? `($${payload.problemRoot.latexFormula}$)` : ''
        } - ${payload.problemRoot.content || ''}`
      : 'Problem Root: Derivasi Matematika';

    const targetGoalInfo = payload.targetGoal
      ? `Target Goal / Objective: ${payload.targetGoal}`
      : '';

    const ancestorStepsInfo =
      payload.ancestorNodes && payload.ancestorNodes.length > 0
        ? payload.ancestorNodes
            .map(
              (anc, idx) =>
                `  ${idx + 1}. [${anc.nodeType || 'step'}] "${anc.title}" ${
                  anc.latexFormula ? `($${anc.latexFormula}$)` : ''
                }: ${anc.content || ''}`
            )
            .join('\n')
        : '  (No preceding ancestor nodes; selected node is near root)';

    const recentChatText =
      payload.recentChatContext && payload.recentChatContext.length > 0
        ? payload.recentChatContext
            .slice(-4)
            .map((c) => `${c.role.toUpperCase()}: ${c.content}`)
            .join('\n')
        : '';

    const systemInstruction = `You are Nexora Interactive Logic Tree Multi-Branch Generator.
Your role is to analyze a student's active STEM/Logic Canvas graph lineage and generate EXACTLY 3 distinct, high-pedagogy branch suggestions.

You MUST produce 3 specific angles:
1. ANGLE 1 ("alternative_method"): An alternative solving technique or conceptual approach (e.g. geometric pairing, graphical approach, recurrence formulation, energy method vs kinematics).
2. ANGLE 2 ("next_progression"): The immediate subsequent derivation step moving directly towards solving the problem / target goal using the problem's concrete variables.
3. ANGLE 3 ("what_if_exploration"): A conceptual mutation, parameter variation, or boundary/edge case (e.g. negative difference d = -3, fraction parameters, zero boundary, infinite limits).

CRITICAL FORMAT RULES:
- Output ONLY valid JSON matching the exact schema below.
- Do NOT output markdown code fences, thought tags, or prose outside JSON.
- Every suggestion MUST include a valid LaTeX formula (e.g. "S_n = \\\\frac{n}{2}(3n + 11)") without raw unmatched brackets.
- Use Indonesian language for all titles, descriptions, hypotheses, and justifications.

JSON Response Schema:
{
  "targetNodeId": "${payload.targetNodeId}",
  "contextSummary": "Ringkasan 3 cabang alternatif untuk node",
  "suggestions": [
    {
      "branchType": "alternative_method",
      "angleType": "alternative_method",
      "title": "Metode Alternatif: ...",
      "description": "Penjelasan pendekatan alternatif...",
      "hypothesis": "Hipotesis cara penyelesaian...",
      "latexFormula": "\\\\text{Formula LaTeX}",
      "suggestedNodeType": "reasoning_step",
      "suggestedEdgeType": "alternative",
      "positionOffset": { "x": -320, "y": 160 },
      "justification": "Mengapa pendekatan ini memperdalam pemahaman..."
    },
    {
      "branchType": "deduction_step",
      "angleType": "next_progression",
      "title": "Kelanjutan Logis: ...",
      "description": "Langkah langsung berikutnya...",
      "hypothesis": "Hasil substitusi aljabar langsung...",
      "latexFormula": "\\\\text{Formula LaTeX}",
      "suggestedNodeType": "reasoning_step",
      "suggestedEdgeType": "implication",
      "positionOffset": { "x": 0, "y": 220 },
      "justification": "Melanjutkan pembuktian menuju target solusi..."
    },
    {
      "branchType": "what_if_simulation",
      "angleType": "what_if_exploration",
      "title": "Simulasi What-If: ...",
      "description": "Eksplorasi jika parameter diubah...",
      "hypothesis": "Perilaku sistem saat parameter bermutasi...",
      "latexFormula": "\\\\text{Formula LaTeX}",
      "suggestedNodeType": "what_if_branch",
      "suggestedEdgeType": "implication",
      "positionOffset": { "x": 320, "y": 160 },
      "justification": "Menguji batas dan ketahanan model matematika..."
    }
  ]
}`;

    const prompt = `=== GRAPH LINEAGE CONTEXT ===
${problemRootInfo}
${targetGoalInfo}

Preceding Ancestor Path:
${ancestorStepsInfo}

Focused Selected Node:
- Title: "${selectedNodeInfo.title}"
- NodeType: ${selectedNodeInfo.nodeType || 'reasoning_step'}
- Formula: ${selectedNodeInfo.latexFormula || targetFormula || 'None'}
- Description: ${selectedNodeInfo.content || nodeContent || 'None'}

${
  payload.variablesContext && payload.variablesContext.length > 0
    ? `Active Variables: ${payload.variablesContext.map((v) => `${v.symbol || v.name}=${v.value}`).join(', ')}`
    : ''
}

${recentChatText ? `Recent Chat Context:\n${recentChatText}\n` : ''}
${existingContext ? `Existing Nodes in Canvas DAG:\n${existingContext}\n` : ''}

Generate the 3 distinct pedagogical branch angles now as strict JSON:`;

    const cascade = getModelCascade();
    let text: string | null = null;
    let lastError: unknown = null;

    for (let i = 0; i < cascade.length; i++) {
      const candidateModel = cascade[i];
      try {
        const response = await ai.models.generateContent({
          model: candidateModel,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        if (response.text) {
          text = response.text;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(
          `[Branch Suggester] Model "${candidateModel}" failed (attempt ${i + 1}/${cascade.length}):`,
          err instanceof Error ? err.message : err
        );

        if (i < cascade.length - 1) {
          await delayWithJitter(300, 200);
        }
      }
    }

    if (!text) {
      console.warn(
        '[Branch Suggester] All cascade attempts failed. Using dynamic fallback. Last error:',
        lastError
      );
      return generateDynamicSubjectFallbacks(payload, targetNodeTitle, targetFormula);
    }

    // Clean JSON response
    let cleanJson = text.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    const parsed = JSON.parse(cleanJson) as SuggestedBranchResult;

    if (
      parsed &&
      Array.isArray(parsed.suggestions) &&
      parsed.suggestions.length >= 2
    ) {
      return {
        targetNodeId: payload.targetNodeId,
        contextSummary:
          parsed.contextSummary ||
          `Dihasilkan ${parsed.suggestions.length} cabang alternatif untuk node "${targetNodeTitle || payload.targetNodeId}".`,
        suggestions: parsed.suggestions,
      };
    }

    return generateDynamicSubjectFallbacks(payload, targetNodeTitle, targetFormula);
  } catch (error) {
    console.error('[Branch Suggester Service] Error generating suggestions, using fallback:', error);
    return generateDynamicSubjectFallbacks(payload, targetNodeTitle, targetFormula);
  }
}
