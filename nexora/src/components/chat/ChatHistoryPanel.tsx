'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import type { ChatSession } from '@/types/chat';
import { cn } from '@/lib/utils';

export function groupSessionsByDate(sessions: ChatSession[]): Record<string, ChatSession[]> {
  const groups: Record<string, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: [],
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const last7DaysStart = todayStart - 7 * 24 * 60 * 60 * 1000;

  for (const session of sessions) {
    const sessionTime = new Date(session.updatedAt || session.createdAt).getTime();

    if (sessionTime >= todayStart) {
      groups.Today.push(session);
    } else if (sessionTime >= yesterdayStart) {
      groups.Yesterday.push(session);
    } else if (sessionTime >= last7DaysStart) {
      groups['Previous 7 Days'].push(session);
    } else {
      groups.Older.push(session);
    }
  }

  return groups;
}

export const ChatHistoryPanel: React.FC = () => {
  const {
    sessions,
    currentSession,
    isLoadingHistory,
    fetchSessions,
    selectSession,
    startNewChat,
    deleteSession,
    renameSession,
    setHistoryOpen,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  const grouped = useMemo(() => groupSessionsByDate(filteredSessions), [filteredSessions]);

  const handleStartEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = async (sessionId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingTitle.trim()) {
      await renameSession(sessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession(sessionId);
  };

  const handleSelectSession = (sessionId: string) => {
    selectSession(sessionId);
    // On small screens, close history panel when selecting a session
    if (window.innerWidth < 768) {
      setHistoryOpen(false);
    }
  };

  const handleNewChat = () => {
    startNewChat();
    if (window.innerWidth < 768) {
      setHistoryOpen(false);
    }
  };

  return (
    <div className="flex h-full w-72 md:w-80 flex-col border-r border-white/10 bg-[#0B0F17] text-white">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs sm:text-sm font-semibold text-white">Chat History</h3>
        </div>
        <button
          type="button"
          onClick={() => setHistoryOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Close History Panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Action Area: New Chat Button & Search Bar */}
      <div className="space-y-2.5 p-3">
        <button
          type="button"
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-2 text-xs font-semibold text-white shadow hover:opacity-95 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat Thread</span>
        </button>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chat history..."
            className="w-full rounded-xl border border-white/10 bg-[#131926] py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
          />
        </div>
      </div>

      {/* History Session List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4 no-scrollbar">
        {isLoadingHistory && sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <p className="animate-pulse">Loading previous chats...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-slate-400 px-4 space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-500">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="font-semibold text-slate-300">No Chat History Yet</p>
            <p className="text-[11px] text-slate-500">
              Start asking questions in STEM Canvas or Tasks to build your personal memory bank.
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([groupTitle, groupSessions]) => {
            if (groupSessions.length === 0) return null;

            return (
              <div key={groupTitle} className="space-y-1">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {groupTitle}
                </p>

                <div className="space-y-1">
                  {groupSessions.map((session) => {
                    const isActive = currentSession?.id === session.id;
                    const isEditing = editingSessionId === session.id;

                    return (
                      <div
                        key={session.id}
                        onClick={() => !isEditing && handleSelectSession(session.id)}
                        className={cn(
                          'group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-all cursor-pointer border',
                          isActive
                            ? 'border-cyan-500/40 bg-cyan-950/30 text-white font-medium shadow-sm'
                            : 'border-transparent text-slate-300 hover:border-white/5 hover:bg-white/5'
                        )}
                      >
                        {/* Session Details or Inline Rename Form */}
                        {isEditing ? (
                          <form
                            onSubmit={(e) => handleSaveRename(session.id, e)}
                            className="flex flex-1 items-center gap-1.5"
                          >
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              autoFocus
                              className="w-full rounded-md border border-cyan-500/50 bg-[#0B0F17] px-2 py-0.5 text-xs text-white focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="rounded p-1 text-cyan-400 hover:bg-cyan-500/20"
                              title="Save"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelRename}
                              className="rounded p-1 text-slate-400 hover:bg-white/10"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                              <MessageSquare
                                className={cn(
                                  'h-3.5 w-3.5 shrink-0',
                                  isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                                )}
                              />
                              <span className="truncate text-left">{session.title}</span>
                            </div>

                            {/* Hover Actions: Rename and Delete */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => handleStartEditing(session, e)}
                                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                                title="Rename Chat Thread"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDelete(session.id, e)}
                                className="rounded p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400"
                                title="Delete Chat Thread"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
