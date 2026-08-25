import { create } from 'zustand';

export type CallStatus = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

export interface CallMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface CallModeState {
  isCallOpen: boolean;
  callStatus: CallStatus;
  isMuted: boolean;
  userTranscript: string;
  aiResponseText: string;
  conversationHistory: CallMessage[];
  
  // Actions
  startCall: () => void;
  endCall: () => void;
  setCallStatus: (status: CallStatus) => void;
  toggleMute: () => void;
  setIsMuted: (isMuted: boolean) => void;
  setUserTranscript: (transcript: string) => void;
  setAiResponseText: (text: string) => void;
  addMessageToHistory: (role: 'user' | 'assistant', text: string) => void;
  clearCallHistory: () => void;
}

export const useCallModeStore = create<CallModeState>((set, get) => ({
  isCallOpen: false,
  callStatus: 'IDLE',
  isMuted: false,
  userTranscript: '',
  aiResponseText: '',
  conversationHistory: [],

  startCall: () => {
    set({
      isCallOpen: true,
      callStatus: 'LISTENING',
      userTranscript: '',
      aiResponseText: '',
      isMuted: false,
    });
  },

  endCall: () => {
    set({
      isCallOpen: false,
      callStatus: 'IDLE',
      userTranscript: '',
      aiResponseText: '',
    });
  },

  setCallStatus: (status: CallStatus) => {
    set({ callStatus: status });
  },

  toggleMute: () => {
    set((state) => ({ isMuted: !state.isMuted }));
  },

  setIsMuted: (isMuted: boolean) => {
    set({ isMuted });
  },

  setUserTranscript: (transcript: string) => {
    set({ userTranscript: transcript });
  },

  setAiResponseText: (text: string) => {
    set({ aiResponseText: text });
  },

  addMessageToHistory: (role: 'user' | 'assistant', text: string) => {
    const newMessage: CallMessage = {
      id: `call-msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      role,
      text,
      timestamp: Date.now(),
    };
    set((state) => ({
      conversationHistory: [...state.conversationHistory, newMessage],
    }));
  },

  clearCallHistory: () => {
    set({ conversationHistory: [] });
  },
}));
