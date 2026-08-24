import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { parseAndApplyNexoraNodes } from '@/stores/useChatStore';
import { CanvasNodeTypeSchema } from '@/lib/validators/canvas';
import type {
  ActiveRecallFlashcardData,
  TimelineEventData,
  ConceptComparisonData,
  DialogueRehearsalData,
} from '@/types/canvas';

describe('Canvas Multi-Disciplinary Node Extensions', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      canvasId: 'test-canvas-123',
      title: 'Multidisciplinary Study Canvas',
      description: null,
      category: 'General',
      nodes: [],
      edges: [],
      selectedNodeId: null,
    });
  });

  describe('CanvasNodeTypeSchema Validation', () => {
    it('validates all 4 new node types successfully', () => {
      expect(CanvasNodeTypeSchema.parse('active_recall_flashcard')).toBe('active_recall_flashcard');
      expect(CanvasNodeTypeSchema.parse('timeline_event')).toBe('timeline_event');
      expect(CanvasNodeTypeSchema.parse('concept_comparison')).toBe('concept_comparison');
      expect(CanvasNodeTypeSchema.parse('dialogue_rehearsal')).toBe('dialogue_rehearsal');
    });
  });

  describe('Canvas Store Node Creation for Multi-Disciplinary Types', () => {
    it('creates active_recall_flashcard node with default and custom payload', () => {
      const flashcardPayload: ActiveRecallFlashcardData = {
        question: 'What is photosynthesis?',
        answer: 'Process by which green plants convert sunlight to chemical energy.',
        topicTag: 'Biology',
        confidenceScore: 3,
      };

      const node = useCanvasStore.getState().addNode(
        'active_recall_flashcard',
        { x: 100, y: 100 },
        {
          title: 'Photosynthesis Card',
          content: flashcardPayload.answer,
          customData: {
            type: 'active_recall_flashcard',
            payload: flashcardPayload,
          },
        }
      );

      expect(node.type).toBe('active_recall_flashcard');
      expect(node.data.title).toBe('Photosynthesis Card');
      const storeNodes = useCanvasStore.getState().nodes;
      expect(storeNodes.length).toBe(1);
    });

    it('creates timeline_event node with period and significance', () => {
      const timelinePayload: TimelineEventData = {
        dateOrPeriod: '17 Agustus 1945',
        eventTitle: 'Proklamasi Kemerdekaan Indonesia',
        causeOrSignificance: 'Deklarasi kemerdekaan bangsa Indonesia.',
        keyFigures: ['Ir. Soekarno', 'Moh. Hatta'],
        eraTag: 'Kemerdekaan',
      };

      const node = useCanvasStore.getState().addNode(
        'timeline_event',
        { x: 200, y: 200 },
        {
          title: timelinePayload.eventTitle,
          customData: {
            type: 'timeline_event',
            payload: timelinePayload,
          },
        }
      );

      expect(node.type).toBe('timeline_event');
      expect(node.data.title).toBe('Proklamasi Kemerdekaan Indonesia');
    });

    it('creates concept_comparison node with dual entities', () => {
      const comparisonPayload: ConceptComparisonData = {
        entityA: { name: 'Mitosis', traits: ['2 Diploid cells', 'Somatic growth'] },
        entityB: { name: 'Meiosis', traits: ['4 Haploid cells', 'Gamete production'] },
        criteriaMatrix: [{ criterion: 'Cell Count', entityAValue: '2', entityBValue: '4' }],
        keyTakeaway: 'Mitosis duplicates; Meiosis reduces.',
      };

      const node = useCanvasStore.getState().addNode(
        'concept_comparison',
        { x: 300, y: 300 },
        {
          title: 'Mitosis vs Meiosis',
          customData: {
            type: 'concept_comparison',
            payload: comparisonPayload,
          },
        }
      );

      expect(node.type).toBe('concept_comparison');
      expect(node.data.title).toBe('Mitosis vs Meiosis');
    });

    it('creates dialogue_rehearsal node with pronunciation cues', () => {
      const dialoguePayload: DialogueRehearsalData = {
        characterRole: 'Murid',
        dialogueLine: 'Punten Bapa, hapunten abdi telat.',
        phoneticOrPronunciationCue: 'Basa Lemes',
        toneOrContextCue: 'Sopan & Rengkuh',
      };

      const node = useCanvasStore.getState().addNode(
        'dialogue_rehearsal',
        { x: 400, y: 400 },
        {
          title: dialoguePayload.characterRole,
          customData: {
            type: 'dialogue_rehearsal',
            payload: dialoguePayload,
          },
        }
      );

      expect(node.type).toBe('dialogue_rehearsal');
      expect(node.data.title).toBe('Murid');
    });
  });

  describe('parseAndApplyNexoraNodes for Multi-Disciplinary Node Types', () => {
    it('parses active_recall_flashcard JSON payload correctly', () => {
      const responseText = `Here is the flashcard for your review:
\`\`\`nexora-node
{
  "title": "ATP Synthetase",
  "type": "active_recall_flashcard",
  "question": "What enzyme catalyzes ATP production during cellular respiration?",
  "answer": "ATP Synthase utilizes proton gradient across inner mitochondrial membrane.",
  "topicTag": "Cellular Respiration",
  "confidenceScore": 0
}
\`\`\``;

      parseAndApplyNexoraNodes(responseText);

      const nodes = useCanvasStore.getState().nodes;
      expect(nodes.length).toBe(1);
      const flashcard = nodes[0];
      expect(flashcard.type).toBe('active_recall_flashcard');
      expect(flashcard.data.title).toBe('ATP Synthetase');
      const customData = flashcard.data.customData as { payload: ActiveRecallFlashcardData };
      expect(customData.payload.question).toContain('What enzyme catalyzes');
    });

    it('parses timeline_event JSON payload correctly', () => {
      const responseText = `Here is the historical event node:
\`\`\`nexora-node
{
  "title": "Peristiwa Rengasdengklok",
  "type": "timeline_event",
  "dateOrPeriod": "16 Agustus 1945",
  "eventTitle": "Pengamanan Soekarno-Hatta ke Rengasdengklok",
  "causeOrSignificance": "Mendesak percepatan proklamasi tanpa campur tangan Jepang.",
  "keyFigures": ["Wikana", "Chaerul Saleh", "Sukarni"],
  "eraTag": "Revolusi Nasional"
}
\`\`\``;

      parseAndApplyNexoraNodes(responseText);

      const nodes = useCanvasStore.getState().nodes;
      expect(nodes.length).toBe(1);
      const timelineNode = nodes[0];
      expect(timelineNode.type).toBe('timeline_event');
      const customData = timelineNode.data.customData as { payload: TimelineEventData };
      expect(customData.payload.dateOrPeriod).toBe('16 Agustus 1945');
      expect(customData.payload.keyFigures).toContain('Sukarni');
    });

    it('parses concept_comparison JSON payload correctly', () => {
      const responseText = `Here is the comparison matrix:
\`\`\`nexora-node
{
  "title": "Kuantitatif vs Kualitatif",
  "type": "concept_comparison",
  "entityA": {
    "name": "Kuantitatif",
    "traits": ["Uji hipotesis statistik", "Data numerik terukur"]
  },
  "entityB": {
    "name": "Kualitatif",
    "traits": ["Eksplorasi makna mendalam", "Data naratif tematik"]
  },
  "criteriaMatrix": [
    { "criterion": "Fokus", "entityAValue": "Generalisasi populasi", "entityBValue": "Kedalaman fenomena" }
  ],
  "keyTakeaway": "Pilih kuantitatif untuk pengujian teori; kualitatif untuk pemahaman konteks."
}
\`\`\``;

      parseAndApplyNexoraNodes(responseText);

      const nodes = useCanvasStore.getState().nodes;
      expect(nodes.length).toBe(1);
      const compNode = nodes[0];
      expect(compNode.type).toBe('concept_comparison');
      const customData = compNode.data.customData as { payload: ConceptComparisonData };
      expect(customData.payload.entityA.name).toBe('Kuantitatif');
      expect(customData.payload.entityB.name).toBe('Kualitatif');
    });

    it('parses dialogue_rehearsal JSON payload correctly', () => {
      const responseText = `Here is the drama dialogue node:
\`\`\`nexora-node
{
  "title": "Prabu Siliwangi",
  "type": "dialogue_rehearsal",
  "characterRole": "Prabu Siliwangi",
  "dialogueLine": "Ulah lali kana purwadaksi!",
  "phoneticOrPronunciationCue": "Intonasi tegas jeung wibawa",
  "toneOrContextCue": "Titah Raja ka Punggawa",
  "translationOrMeaning": "Jangan lupa pada asal-usul dan jati diri!"
}
\`\`\``;

      parseAndApplyNexoraNodes(responseText);

      const nodes = useCanvasStore.getState().nodes;
      expect(nodes.length).toBe(1);
      const dialogueNode = nodes[0];
      expect(dialogueNode.type).toBe('dialogue_rehearsal');
      const customData = dialogueNode.data.customData as { payload: DialogueRehearsalData };
      expect(customData.payload.characterRole).toBe('Prabu Siliwangi');
      expect(customData.payload.dialogueLine).toBe('Ulah lali kana purwadaksi!');
    });
  });
});
