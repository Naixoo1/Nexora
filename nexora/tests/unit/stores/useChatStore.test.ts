import { describe, it, expect, beforeEach } from 'vitest';
import { parseAndApplyNexoraNodes } from '@/stores/useChatStore';
import { useCanvasStore } from '@/stores/useCanvasStore';

describe('Chat Store Node Parser & Canvas Auto-Attachment', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      canvasId: 'test-canvas-123',
      title: 'Barisan dan Deret',
      nodes: [
        {
          id: 'node-root-1',
          type: 'problem_root',
          position: { x: 300, y: 100 },
          data: {
            title: 'Soal Barisan Aritmetika',
            nodeType: 'problem_root',
            content: 'Diketahui U3 = 11 dan U7 = 27',
            validationStatus: 'valid',
          },
        },
      ],
      edges: [],
      selectedNodeId: 'node-root-1',
    });
  });

  it('parses fenced ```nexora-node``` blocks, creates node, and connects edge from parent', () => {
    const text = `Berikut adalah langkah menentukan nilai beda $b$:
\`\`\`nexora-node
{
  "title": "Beda Barisan (b)",
  "type": "reasoning_step",
  "latexFormula": "b = 4",
  "content": "Didapatkan dari selisih U7 - U3 dibagi 4.",
  "validationStatus": "valid"
}
\`\`\``;

    parseAndApplyNexoraNodes(text);

    const state = useCanvasStore.getState();
    expect(state.nodes.length).toBe(2);

    const newNode = state.nodes.find((n) => n.data.title === 'Beda Barisan (b)');
    expect(newNode).toBeDefined();
    expect(newNode?.data.latexFormula).toBe('b = 4');
    expect(newNode?.type).toBe('reasoning_step');
    expect(newNode?.position.y).toBe(320); // 100 + 220

    // Edge connected from node-root-1 to newNode
    expect(state.edges.length).toBe(1);
    expect(state.edges[0].source).toBe('node-root-1');
    expect(state.edges[0].target).toBe(newNode?.id);

    // Selected node moves to newNode
    expect(state.selectedNodeId).toBe(newNode?.id);
  });

  it('parses unbackticked raw nexora-node JSON payloads correctly', () => {
    const text = `Langkah selanjutnya adalah menghitung suku pertama:
nexora-node {
  "title": "Suku Pertama (a)",
  "type": "formula_block",
  "latexFormula": "a = 3",
  "content": "Substitusi nilai b ke persamaan U3.",
  "validationStatus": "valid"
}`;

    parseAndApplyNexoraNodes(text);

    const state = useCanvasStore.getState();
    expect(state.nodes.length).toBe(2);

    const newNode = state.nodes.find((n) => n.data.title === 'Suku Pertama (a)');
    expect(newNode).toBeDefined();
    expect(newNode?.data.latexFormula).toBe('a = 3');
    expect(newNode?.type).toBe('formula_block');
  });

  it('ignores duplicate nodes with identical title and latexFormula', () => {
    const text = `\`\`\`nexora-node
{
  "title": "Beda Barisan (b)",
  "latexFormula": "b = 4"
}
\`\`\``;

    parseAndApplyNexoraNodes(text);
    parseAndApplyNexoraNodes(text);

    const state = useCanvasStore.getState();
    expect(state.nodes.length).toBe(2);
  });
});
