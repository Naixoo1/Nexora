import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInputArea } from '@/components/chat/ChatInputArea';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { useChatStore } from '@/stores/useChatStore';
import { useCallModeStore } from '@/stores/useCallModeStore';

describe('In-Chat Call Trigger & Session Sync', () => {
  beforeEach(() => {
    useChatStore.setState({
      currentSession: {
        id: 'session-test-123',
        userId: 'user-1',
        title: 'Test Geometry Session',
        tutorMode: 'socratic',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      messages: [],
    });

    useCallModeStore.setState({
      isCallOpen: false,
      callStatus: 'IDLE',
      activeSessionId: null,
    });
  });

  it('renders the In-Chat Call button and triggers startCall with current session ID', () => {
    render(<ChatInputArea />);

    const callButton = screen.getByTitle('Mulai Panggilan Suara AI (Call Mode)');
    expect(callButton).toBeDefined();

    fireEvent.click(callButton);

    const callState = useCallModeStore.getState();
    expect(callState.isCallOpen).toBe(true);
    expect(callState.activeSessionId).toBe('session-test-123');
    expect(callState.callStatus).toBe('LISTENING');
  });

  it('syncs voice message into useChatStore messages array', () => {
    useChatStore.setState((s) => ({
      messages: [
        ...s.messages,
        {
          id: 'voice-user-1',
          sessionId: 'session-test-123',
          userId: 'user-1',
          role: 'user',
          content: 'Jelaskan rumus deret geometri tak hingga',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'voice-ai-1',
          sessionId: 'session-test-123',
          userId: 'nexora-ai',
          role: 'assistant',
          content: 'Rumus deret geometri tak hingga konvergen adalah S = a / (1 - r).',
          createdAt: new Date().toISOString(),
        },
      ],
    }));

    const messages = useChatStore.getState().messages;
    expect(messages.length).toBe(2);
    expect(messages[0].content).toContain('deret geometri tak hingga');
    expect(messages[1].content).toContain('S = a / (1 - r)');
  });
});

describe('UserProfileModal Component', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'mem-1',
            userId: 'user-1',
            academicStrengths: ['Deret Geometri'],
            academicWeaknesses: ['Peluang'],
            learningStyle: 'Visual',
            academicGoal: 'OSN',
            extractedTopics: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    );
  });

  it('renders Profil Belajar AI dialog when isOpen is true', async () => {
    render(<UserProfileModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText(/Profil & Memori Belajar AI/i)).toBeDefined();
    expect(await screen.findByText(/Kekuatan Akademik/i)).toBeDefined();
    expect(await screen.findByText(/Area Pengembangan/i)).toBeDefined();
    expect(await screen.findByText(/Gaya Belajar Pilihan/i)).toBeDefined();
    expect(await screen.findByText(/Target \/ Sasaran Akademik/i)).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<UserProfileModal isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
