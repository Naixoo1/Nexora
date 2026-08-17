'use client';

import React, { useState } from 'react';
import {
  X,
  Sliders,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import type { CanvasVariable } from '@/types/canvas';

export const VariableSidebar: React.FC = () => {
  const {
    globalVariables,
    isVariableSidebarOpen,
    setVariableSidebarOpen,
    updateVariable,
    addGlobalVariable,
    deleteGlobalVariable,
  } = useCanvasStore();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [defaultValue, setDefaultValue] = useState('10');
  const [min, setMin] = useState('0');
  const [max, setMax] = useState('100');
  const [step] = useState('1');
  const [unit, setUnit] = useState('');

  if (!isVariableSidebarOpen) return null;

  const handleCreateVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const val = parseFloat(defaultValue) || 0;
    const minVal = parseFloat(min) || 0;
    const maxVal = parseFloat(max) || 100;
    const stepVal = parseFloat(step) || 1;

    const newVar: CanvasVariable = {
      id: `var-${Date.now()}`,
      name: name.trim(),
      symbol: symbol.trim() || name.trim(),
      label: name.trim(),
      value: val,
      defaultValue: val,
      min: minVal,
      max: maxVal,
      step: stepVal,
      unit: unit.trim() || undefined,
      isIndependent: true,
    };

    addGlobalVariable(newVar);

    // Reset form
    setName('');
    setSymbol('');
    setDefaultValue('10');
    setMin('0');
    setMax('100');
    setUnit('');
    setIsAdding(false);
  };

  return (
    <div className="fixed right-4 top-20 bottom-24 z-40 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#131926]/95 p-5 shadow-2xl backdrop-blur-2xl transition-all flex flex-col">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Dynamic Variables</h3>
            <p className="text-[11px] text-slate-400">Interactive parameter simulation</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setVariableSidebarOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Variables List Container */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {globalVariables.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-[#0B0F17]/60 p-4 text-center">
            <TrendingUp className="mx-auto h-6 w-6 text-cyan-400/60" />
            <p className="mt-2 text-xs text-slate-300 font-semibold">
              No Global Variables Registered
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Create mathematical variables to link sliders across derivation branches and What-If scenarios.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {globalVariables.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border border-white/5 bg-[#0B0F17]/80 p-3 space-y-2 hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-cyan-300">
                    <span>{v.name}</span>
                    {v.unit && (
                      <span className="text-[10px] text-slate-500 font-normal">({v.unit})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs font-bold text-white">
                      {v.value}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteGlobalVariable(v.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete variable"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min={v.min}
                  max={v.max}
                  step={v.step}
                  value={v.value}
                  onChange={(e) => updateVariable(v.id, parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-lg bg-slate-800 accent-cyan-400 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>min: {v.min}</span>
                  <span>def: {v.defaultValue}</span>
                  <span>max: {v.max}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Variable Section */}
        {isAdding ? (
          <form
            onSubmit={handleCreateVariable}
            className="rounded-xl border border-indigo-500/30 bg-[#0B0F17] p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
              <span>New Mathematical Variable</span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold uppercase text-slate-400">Name / Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. v_0"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#131926] px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-slate-400">Unit (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. m/s"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#131926] px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold uppercase text-slate-400">Default</label>
                <input
                  type="number"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#131926] px-2 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-slate-400">Min</label>
                <input
                  type="number"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#131926] px-2 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-slate-400">Max</label>
                <input
                  type="number"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#131926] px-2 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 py-2 text-xs font-bold text-white shadow hover:opacity-90 active:scale-98"
            >
              Add Variable
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:border-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create New Variable</span>
          </button>
        )}
      </div>
    </div>
  );
};
