import React, { useState } from 'react';
import {
  Plus,
  Zap,
  GitFork,
  Sliders,
  Undo2,
  Redo2,
  Trash2,
  Target,
  Cpu,
  Award,
  Binary,
  Sparkles,
  Loader2,
  HelpCircle,
  History,
  Scale,
  MessageSquareQuote,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import type { CanvasNodeType } from '@/types/canvas';
import { cn } from '@/lib/utils';

export const CanvasToolbar: React.FC = () => {
  const {
    nodes,
    selectedNodeId,
    isEvaluating,
    isSuggestingBranches,
    globalVariables,
    isVariableSidebarOpen,
    history,
    addNode,
    deleteNode,
    evaluateNode,
    suggestBranches,
    undo,
    redo,
    setVariableSidebarOpen,
  } = useCanvasStore();

  const [showAddMenu, setShowAddMenu] = useState(false);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const handleAddNodeType = (type: CanvasNodeType) => {
    // Offset from center or selected node
    let pos = { x: 250, y: 150 };
    if (selectedNode) {
      pos = {
        x: selectedNode.position.x + (type === 'what_if_branch' ? 320 : 0),
        y: selectedNode.position.y + 180,
      };
    } else if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      pos = { x: lastNode.position.x, y: lastNode.position.y + 180 };
    }

    addNode(type, pos);
    setShowAddMenu(false);
  };

  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
      {/* Main Dock Container */}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#131926]/90 p-1.5 shadow-2xl backdrop-blur-xl">
        {/* Add Node Dropup / Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:opacity-95 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Node</span>
          </button>

          {/* Add Node Menu */}
          {showAddMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAddMenu(false)}
              />
              <div className="absolute bottom-12 left-0 z-50 w-64 rounded-2xl border border-white/10 bg-[#131926] p-2 shadow-2xl backdrop-blur-xl max-h-96 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  STEM & Analytical
                </div>
                <div className="space-y-1 mt-1">
                  <button
                    type="button"
                    onClick={() => handleAddNodeType('reasoning_step')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-left text-slate-200 transition-colors hover:bg-indigo-600/20 hover:text-white"
                  >
                    <Cpu className="h-4 w-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-semibold">Reasoning Step</div>
                      <div className="text-[10px] text-slate-400">Deduction & derivation</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNodeType('what_if_branch')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-left text-slate-200 transition-colors hover:bg-cyan-600/20 hover:text-white"
                  >
                    <GitFork className="h-4 w-4 text-cyan-400 shrink-0" />
                    <div>
                      <div className="font-semibold">What-If Branch</div>
                      <div className="text-[10px] text-slate-400">Variable simulation</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNodeType('formula_block')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-left text-slate-200 transition-colors hover:bg-sky-600/20 hover:text-white"
                  >
                    <Binary className="h-4 w-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-semibold">Formula Block</div>
                      <div className="text-[10px] text-slate-400">Interactive KaTeX math</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNodeType('theorem_proof')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-left text-slate-200 transition-colors hover:bg-amber-600/20 hover:text-white"
                  >
                    <Award className="h-4 w-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold">Theorem / Lemma</div>
                      <div className="text-[10px] text-slate-400">Axioms & conditions</div>
                    </div>
                  </button>
                </div>

                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2 border-t border-white/5 pt-1.5">
                  Humanities, Languages & Recall
                </div>
                <div className="space-y-1 mt-1">
                  <button
                    type="button"
                    onClick={() => handleAddNodeType('active_recall_flashcard')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-left text-slate-200 transition-colors hover:bg-cyan-600/20 hover:text-white"
                  >
                    <HelpCircle className="h-4 w-4 text-cyan-400 shrink-0" />
                    <div>
                      <div className="font-semibold">Recall Flashcard</div>
                      <div className="text-[10px] text-slate-400">Question & hidden answer</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNodeType('timeline_event')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-left text-slate-200 transition-colors hover:bg-amber-600/20 hover:text-white"
                  >
                    <History className="h-4 w-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold">Timeline Event</div>
                      <div className="text-[10px] text-slate-400">Date, event & significance</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNodeType('concept_comparison')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-left text-slate-200 transition-colors hover:bg-indigo-600/20 hover:text-white"
                  >
                    <Scale className="h-4 w-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-semibold">Concept Comparison</div>
                      <div className="text-[10px] text-slate-400">Entity A vs Entity B matrix</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNodeType('dialogue_rehearsal')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-left text-slate-200 transition-colors hover:bg-emerald-600/20 hover:text-white"
                  >
                    <MessageSquareQuote className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold">Dialogue Rehearsal</div>
                      <div className="text-[10px] text-slate-400">Roleplay & pronunciation</div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-5 w-px bg-white/10 mx-0.5" />

        {/* AI Action: Evaluate Step */}
        <button
          type="button"
          disabled={!selectedNodeId || isEvaluating}
          onClick={() => selectedNodeId && evaluateNode(selectedNodeId)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all',
            selectedNodeId
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 hover:text-white'
              : 'text-slate-500 opacity-50 cursor-not-allowed'
          )}
          title={selectedNodeId ? 'Evaluate mathematical derivation step' : 'Select a node to evaluate'}
        >
          {isEvaluating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
          ) : (
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
          )}
          <span className="hidden md:inline">Evaluate Step</span>
        </button>

        {/* AI Action: What-If Branch Suggestion */}
        <button
          type="button"
          disabled={!selectedNodeId || isSuggestingBranches}
          onClick={() => selectedNodeId && suggestBranches(selectedNodeId)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all',
            selectedNodeId
              ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30 hover:text-white'
              : 'text-slate-500 opacity-50 cursor-not-allowed'
          )}
          title={selectedNodeId ? 'AI Suggest What-If simulation branches' : 'Select a node to branch'}
        >
          {isSuggestingBranches ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          )}
          <span className="hidden md:inline">Suggest Branch</span>
        </button>

        <div className="h-5 w-px bg-white/10 mx-0.5" />

        {/* Global Variables Panel Trigger */}
        <button
          type="button"
          onClick={() => setVariableSidebarOpen(!isVariableSidebarOpen)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-all',
            isVariableSidebarOpen
              ? 'bg-cyan-500 text-slate-950 font-semibold'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          )}
          title="Toggle Variable & Simulation Panel"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] bg-white/10 px-1.5 rounded-full">
            {globalVariables.length}
          </span>
        </button>

        <div className="h-5 w-px bg-white/10 mx-0.5" />

        {/* Undo / Redo */}
        <button
          type="button"
          disabled={!canUndo}
          onClick={undo}
          className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={redo}
          className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        {/* Delete Selected Node */}
        {selectedNodeId && (
          <>
            <div className="h-5 w-px bg-white/10 mx-0.5" />
            <button
              type="button"
              onClick={() => deleteNode(selectedNodeId)}
              className="rounded-xl p-2 text-rose-400 hover:bg-rose-500/20 transition-colors"
              title="Delete selected node"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
