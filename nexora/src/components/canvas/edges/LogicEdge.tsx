'use client';

import React, { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { X, ArrowRight, GitFork, Link2, AlertOctagon } from 'lucide-react';
import type { StemCanvasEdge, CanvasEdgeType } from '@/types/canvas';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';

export const LogicEdge: React.FC<EdgeProps<StemCanvasEdge>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}) => {
  const deleteEdge = useCanvasStore((state) => state.deleteEdge);
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeType: CanvasEdgeType = data?.edgeType || 'implication';
  const label = data?.label || edgeType;

  const edgeConfig = {
    implication: {
      color: '#6366F1', // Electric Indigo
      strokeDasharray: undefined,
      icon: ArrowRight,
      badge: 'bg-indigo-950/90 text-indigo-300 border-indigo-500/40',
    },
    alternative: {
      color: '#06B6D4', // Aurora Cyan
      strokeDasharray: '5,5',
      icon: GitFork,
      badge: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40',
    },
    dependency: {
      color: '#F59E0B', // Amber
      strokeDasharray: '3,3',
      icon: Link2,
      badge: 'bg-amber-950/90 text-amber-300 border-amber-500/40',
    },
    contradiction: {
      color: '#EF4444', // Crimson Danger
      strokeDasharray: '6,4',
      icon: AlertOctagon,
      badge: 'bg-rose-950/90 text-rose-300 border-rose-500/40',
    },
  }[edgeType];

  const Icon = edgeConfig.icon;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeConfig.color,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: edgeConfig.strokeDasharray,
          transition: 'stroke 0.2s, stroke-width 0.2s',
          filter: selected ? `drop-shadow(0 0 6px ${edgeConfig.color})` : undefined,
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group"
        >
          <div
            className={cn(
              'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider shadow-lg backdrop-blur-md transition-all',
              edgeConfig.badge,
              selected && 'ring-2 ring-white/50 scale-105'
            )}
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span className="capitalize">{label}</span>

            {/* Quick Delete Edge Button */}
            {isHovered && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteEdge(id);
                }}
                className="ml-1 rounded-full bg-rose-500/20 p-0.5 text-rose-400 hover:bg-rose-500 hover:text-white"
                title="Delete relationship edge"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
