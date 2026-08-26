'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Brain,
  Sparkles,
  Target,
  BookOpen,
  RotateCcw,
  Save,
  Loader2,
  Plus,
  Check,
  User as UserIcon,
  HelpCircle,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import type { UserMemory, UserMemoryPayload } from '@/types/memory';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { data: session } = authClient.useSession();

  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable local state
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [learningStyle, setLearningStyle] = useState<string>('');
  const [academicGoal, setAcademicGoal] = useState<string>('');

  // Input states for new tags
  const [newStrengthInput, setNewStrengthInput] = useState('');
  const [newWeaknessInput, setNewWeaknessInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchMemory();
    }
  }, [isOpen]);

  const fetchMemory = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/memory');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setMemory(json.data);
          setStrengths(json.data.academicStrengths || []);
          setWeaknesses(json.data.academicWeaknesses || []);
          setLearningStyle(json.data.learningStyle || '');
          setAcademicGoal(json.data.academicGoal || '');
        }
      }
    } catch (err) {
      console.error('[UserProfileModal] Failed to load user memory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStrength = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStrengthInput.trim();
    if (trimmed && !strengths.includes(trimmed)) {
      setStrengths([...strengths, trimmed]);
      setNewStrengthInput('');
    }
  };

  const handleRemoveStrength = (tag: string) => {
    setStrengths(strengths.filter((s) => s !== tag));
  };

  const handleAddWeakness = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWeaknessInput.trim();
    if (trimmed && !weaknesses.includes(trimmed)) {
      setWeaknesses([...weaknesses, trimmed]);
      setNewWeaknessInput('');
    }
  };

  const handleRemoveWeakness = (tag: string) => {
    setWeaknesses(weaknesses.filter((w) => w !== tag));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      const payload: UserMemoryPayload = {
        academicStrengths: strengths,
        academicWeaknesses: weaknesses,
        learningStyle: learningStyle.trim(),
        academicGoal: academicGoal.trim(),
      };

      const res = await fetch('/api/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setMemory(json.data);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('[UserProfileModal] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Apakah kamu yakin ingin mereset seluruh data memori profil belajar AI Nexora?')) {
      return;
    }

    try {
      setIsResetting(true);
      const res = await fetch('/api/memory', {
        method: 'DELETE',
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setMemory(json.data);
          setStrengths(json.data.academicStrengths || []);
          setWeaknesses(json.data.academicWeaknesses || []);
          setLearningStyle(json.data.learningStyle || '');
          setAcademicGoal(json.data.academicGoal || '');
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('[UserProfileModal] Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0B0F17] text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#131926]/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-400">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Profil & Memori Belajar AI
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/20">
                  Adaptive Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Kustomisasi personalisasi AI untuk materi tugas, pemecahan masalah, & ujian.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Account Info Banner */}
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#131926] p-4">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="h-12 w-12 rounded-full border border-cyan-500/30 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-300 border border-cyan-500/30">
                {session?.user?.name?.charAt(0) || <UserIcon className="h-6 w-6" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white text-sm truncate">
                {session?.user?.name || 'Pelajar Nexora (Tamu)'}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {session?.user?.email || 'Mode Tamu / Belum Masuk Akun'}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-cyan-400">
                <Sparkles className="h-3 w-3" />
                <span>Memori adaptif diperbarui otomatis saat sesi selesai.</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              <span className="text-xs">Memuat profil belajar AI...</span>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Section 1: Academic Strengths */}
              <div className="rounded-xl border border-white/10 bg-[#131926]/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    Kekuatan Akademik & Konsep yang Dikuasai
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {strengths.length} topik terdeteksi
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[36px] items-center">
                  {strengths.length === 0 ? (
                    <span className="text-xs italic text-slate-500">
                      Belum ada kekuatan yang dicatat. Tambahkan topik di bawah.
                    </span>
                  ) : (
                    strengths.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 shadow-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveStrength(tag)}
                          className="text-emerald-400 hover:text-white"
                          title={`Hapus ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddStrength} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newStrengthInput}
                    onChange={(e) => setNewStrengthInput(e.target.value)}
                    placeholder="Tambah kekuatan (mis: Deret Geometri, Kinematika)..."
                    className="flex-1 rounded-lg border border-white/10 bg-[#0B0F17] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newStrengthInput.trim()}
                    className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah</span>
                  </button>
                </form>
              </div>

              {/* Section 2: Academic Weaknesses / Growth Areas */}
              <div className="rounded-xl border border-white/10 bg-[#131926]/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-amber-400" />
                    Area Pengembangan / Materi yang Perlu Latihan Ekstra
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {weaknesses.length} topik terdeteksi
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[36px] items-center">
                  {weaknesses.length === 0 ? (
                    <span className="text-xs italic text-slate-500">
                      Belum ada area tantangan yang dicatat.
                    </span>
                  ) : (
                    weaknesses.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 shadow-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveWeakness(tag)}
                          className="text-amber-400 hover:text-white"
                          title={`Hapus ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddWeakness} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newWeaknessInput}
                    onChange={(e) => setNewWeaknessInput(e.target.value)}
                    placeholder="Tambah area belajar (mis: Peluang Kombinatorika, Logika Boolean)..."
                    className="flex-1 rounded-lg border border-white/10 bg-[#0B0F17] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newWeaknessInput.trim()}
                    className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah</span>
                  </button>
                </form>
              </div>

              {/* Section 3: Learning Style & Academic Goal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-[#131926]/70 p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
                    Gaya Belajar Pilihan
                  </label>
                  <textarea
                    rows={2}
                    value={learningStyle}
                    onChange={(e) => setLearningStyle(e.target.value)}
                    placeholder="Contoh: Penjelasan bertahap, analogi visual, atau pembuktian formal..."
                    className="w-full rounded-lg border border-white/10 bg-[#0B0F17] p-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none resize-none"
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-[#131926]/70 p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-indigo-400" />
                    Target / Sasaran Akademik
                  </label>
                  <textarea
                    rows={2}
                    value={academicGoal}
                    onChange={(e) => setAcademicGoal(e.target.value)}
                    placeholder="Contoh: Persiapan OSN Informatika, Lolos PTN Impian, Ujian Sekolah..."
                    className="w-full rounded-lg border border-white/10 bg-[#0B0F17] p-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#131926]/80 px-6 py-4">
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting || isLoading}
            className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-colors disabled:opacity-40"
          >
            {isResetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            <span>Reset Memori</span>
          </button>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium animate-in fade-in">
                <Check className="h-4 w-4" />
                Tersimpan!
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 rounded-xl transition-colors"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:opacity-95 active:scale-95 transition-all disabled:opacity-40"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
