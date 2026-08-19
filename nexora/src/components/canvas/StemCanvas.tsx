'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { NodeToTaskModal } from './NodeToTaskModal';
import { Check, Loader2, AlertCircle } from 'lucide-react';

export interface StemCanvasProps {
  canvasId: string;
}

export const StemCanvas: React.FC<StemCanvasProps> = ({ canvasId }) => {
  const searchParams = useSearchParams();
  const targetNodeIdFromQuery = searchParams.get('nodeId');

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

  // Select target node if requested in query parameter (?nodeId=...)
  useEffect(() => {
    if (targetNodeIdFromQuery && nodes.length > 0) {
      const found = nodes.find((n) => n.id === targetNodeIdFromQuery);
      if (found) {
        selectNode(targetNodeIdFromQuery);
      }
    }
  }, [targetNodeIdFromQuery, nodes, selectNode]);

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

  // Node selection handlers
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  const handlePaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0B0F17]">
      {/* Auto-Save & Status Float Indicator */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-xl border border-white/10 bg-[#131926]/90 px-3 py-1.5 text-xs text-slate-300 shadow-xl backdrop-blur-md">
        {isSaving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
            <span className="font-medium text-cyan-300">Auto-saving...</span>
          </>
        ) : error ? (
          <div className="flex items-center gap-1 text-rose-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="ml-1 rounded px-1 text-[10px] bg-rose-500/20 hover:bg-rose-500/30"
            >
              dismiss
            </button>
          </div>
        ) : (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400">
              {lastSavedAt
                ? `Saved ${new Intl.DateTimeFormat('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }).format(lastSavedAt)}`
                : 'Synced'}
            </span>
          </>
        )}
      </div>

      {/* Floating Action Toolbar */}
      <CanvasToolbar />

      {/* Main React Flow Graph Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        defaultViewport={viewport}
        onViewportChange={setViewport}
        minZoom={0.2}
        maxZoom={2.5}
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        className="touch-none select-none bg-[#0B0F17]"
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

      {/* Node to Task Conversion Modal */}
      <NodeToTaskModal />
    </div>
  );
};
