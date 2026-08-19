'use client';

import React, { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Network,
  Sliders,
  Save,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { StemCanvas } from '@/components/canvas/StemCanvas';
import { ChatDrawer } from '@/components/chat/ChatDrawer';
import { FloatingBrainstormButton } from '@/components/chat/FloatingBrainstormButton';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { useChatStore } from '@/stores/useChatStore';
import type { CanvasContextSnapshot, CanvasDerivationStep } from '@/types/chat';
import { cn } from '@/lib/utils';

export default function CanvasStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const {
    title,
    category,
    nodes,
    edges,
    selectedNodeId,
    isSaving,
    lastSavedAt,
    isVariableSidebarOpen,
    globalVariables,
    saveGraph,
    setVariableSidebarOpen,
  } = useCanvasStore();

  const { openDrawer, setCanvasContext } = useChatStore();

  // Construct dynamic derivation path & canvas snapshot
  const handleOpenBrainstorm = () => {
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);

    // Build derivation path leading to selected node
    const derivationPath: CanvasDerivationStep[] = [];
    if (selectedNode) {
      let currId: string | undefined = selectedNode.id;
      const visited = new Set<string>();

      while (currId && !visited.has(currId)) {
        visited.add(currId);
        const node = nodes.find((n) => n.id === currId);
        if (!node) break;

        const incomingEdge = edges.find((e) => e.target === currId);
        derivationPath.unshift({
          nodeId: node.id,
          title: node.data.title,
          nodeType: node.data.nodeType || node.type || 'reasoning_step',
          latexFormula: node.data.latexFormula,
          edgeType: incomingEdge?.data?.edgeType || incomingEdge?.type,
          validationStatus: node.data.validationStatus,
        });

        currId = incomingEdge?.source;
      }
    }

    const snapshot: CanvasContextSnapshot = {
      canvasId: id,
      canvasTitle: title,
      category,
      selectedNodeId: selectedNode?.id,
      selectedNodeType: selectedNode?.data.nodeType || selectedNode?.type,
      selectedNodeTitle: selectedNode?.data.title,
      selectedNodeFormula: selectedNode?.data.latexFormula,
      selectedNodeValidation: selectedNode?.data.validationStatus,
      derivationPath,
      activeVariables: globalVariables,
    };

    setCanvasContext(snapshot);
    openDrawer({ canvasContext: snapshot });
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0B0F17] text-[#F1F5F9]">
      {/* Top Studio Navbar */}
      <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#131926]/90 px-4 backdrop-blur-xl">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/canvas"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Back to STEM Canvases"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="h-5 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-md">
              <Network className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                {title || 'STEM Logic Tree Canvas'}
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="text-cyan-400 font-semibold uppercase">{category || 'STEM Logic Tree'}</span>
                <span>•</span>
                <span>
                  {isSaving
                    ? 'Saving...'
                    : lastSavedAt
                    ? `Saved ${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(lastSavedAt)}`
                    : 'Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* AI Brainstorm Header Button */}
          <button
            type="button"
            onClick={handleOpenBrainstorm}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:opacity-95 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI Brainstorm</span>
          </button>

          {/* Dynamic Variables Toggle */}
          <button
            type="button"
            onClick={() => setVariableSidebarOpen(!isVariableSidebarOpen)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
              isVariableSidebarOpen
                ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                : 'border-white/10 bg-[#0B0F17] text-slate-300 hover:border-white/20 hover:text-white'
            )}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Variables</span>
            <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.2 text-[10px] font-mono text-cyan-300">
              {globalVariables.length}
            </span>
          </button>

          {/* Manual Save Button */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => saveGraph(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0B0F17] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            title="Save canvas state now"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
            ) : (
              <Save className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </header>

      {/* Main Interactive Canvas Area */}
      <main className="relative flex-1">
        <StemCanvas canvasId={id} />
      </main>

      {/* Floating Brainstorm Trigger Button */}
      <FloatingBrainstormButton onClickCustom={handleOpenBrainstorm} />

      {/* Slide-over Chat Drawer */}
      <ChatDrawer />
    </div>
  );
}
