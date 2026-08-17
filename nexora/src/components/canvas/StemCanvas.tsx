'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
} from '@xyflow/react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { ProblemRootNode } from './nodes/ProblemRootNode';
import { ReasoningStepNode } from './nodes/ReasoningStepNode';
import { WhatIfBranchNode } from './nodes/WhatIfBranchNode';
import { TheoremProofNode } from './nodes/TheoremProofNode';
import { FormulaBlockNode } from './nodes/FormulaBlockNode';
import { LogicEdge } from './edges/LogicEdge';
import { CanvasToolbar } from './CanvasToolbar';
import { VariableSidebar } from './VariableSidebar';
import { BranchSuggestionModal } from './BranchSuggestionModal';
import { Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StemCanvasProps {
  canvasId: string;
}

export const StemCanvas: React.FC<StemCanvasProps> = ({ canvasId }) => {
  const {
    nodes,
    edges,
    viewport,
    isSaving,
    lastSavedAt,
    error,
    selectedNodeId,
    loadCanvas,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setViewport,
    selectNode,
    selectEdge,
    deleteNode,
    deleteEdge,
    undo,
    redo,
    clearError,
  } = useCanvasStore();

  // Load canvas on mount
  useEffect(() => {
    if (canvasId) {
      loadCanvas(canvasId);
    }
  }, [canvasId, loadCanvas]);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in inputs or textareas
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z')
      ) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          deleteNode(selectedNodeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteNode, selectedNodeId]);

  // Register Custom Node Types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      problem_root: ProblemRootNode,
      reasoning_step: ReasoningStepNode,
      what_if_branch: WhatIfBranchNode,
      theorem_proof: TheoremProofNode,
      formula_block: FormulaBlockNode,
    }),
    []
  );

  // Register Custom Edge Types
  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      implication: LogicEdge,
      alternative: LogicEdge,
      dependency: LogicEdge,
      contradiction: LogicEdge,
    }),
    []
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#0B0F17]">
      {/* Top Floating Bar: Title & Auto-save Status */}
      <div className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-3">
        {/* Status Indicator */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-[#131926]/90 px-3 py-1.5 text-xs shadow-lg backdrop-blur-md">
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              <span className="text-slate-300">Saving changes...</span>
            </>
          ) : lastSavedAt ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-slate-400">
                Saved {new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(lastSavedAt)}
              </span>
            </>
          ) : (
            <span className="text-slate-500">Ready</span>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 shadow-lg backdrop-blur-md">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="ml-1 rounded px-1 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Floating Canvas Toolbar */}
      <CanvasToolbar />

      {/* React Flow Viewport */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onViewportChange={setViewport}
        defaultViewport={viewport}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2.5}
        snapToGrid
        snapGrid={[16, 16]}
        colorMode="dark"
        className="touch-none"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="rgba(255, 255, 255, 0.07)"
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!m-4 !border !border-white/10 !bg-[#131926] !shadow-xl backdrop-blur-md"
        />
        <MiniMap
          position="bottom-right"
          zoomable
          pannable
          nodeColor={(node) => {
            switch (node.type) {
              case 'problem_root':
                return '#06B6D4';
              case 'reasoning_step':
                return '#6366F1';
              case 'what_if_branch':
                return '#A855F7';
              case 'theorem_proof':
                return '#F59E0B';
              case 'formula_block':
                return '#38BDF8';
              default:
                return '#64748B';
            }
          }}
          maskColor="rgba(11, 15, 23, 0.75)"
          className="!m-4 !hidden !rounded-2xl !border !border-white/10 !bg-[#131926]/90 sm:!block"
        />
      </ReactFlow>

      {/* Floating Variable Panel */}
      <VariableSidebar />

      {/* AI Branch Suggestion Modal */}
      <BranchSuggestionModal />
    </div>
  );
};
