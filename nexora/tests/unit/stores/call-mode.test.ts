import { describe, it, expect, beforeEach } from 'vitest';
import { useCallModeStore } from '@/stores/useCallModeStore';

describe('useCallModeStore', () => {
  beforeEach(() => {
    useCallModeStore.setState({
      isCallOpen: false,
      callStatus: 'IDLE',
      isMuted: false,
      userTranscript: '',
      aiResponseText: '',
      conversationHistory: [],
    });
  });

  it('starts a call and sets status to LISTENING', () => {
    const store = useCallModeStore.getState();
    store.startCall();

    const state = useCallModeStore.getState();
    expect(state.isCallOpen).toBe(true);
    expect(state.callStatus).toBe('LISTENING');
    expect(state.isMuted).toBe(false);
  });

  it('updates call statuses smoothly between turns', () => {
    const store = useCallModeStore.getState();
    store.startCall();
    expect(useCallModeStore.getState().callStatus).toBe('LISTENING');

    store.setCallStatus('PROCESSING');
    expect(useCallModeStore.getState().callStatus).toBe('PROCESSING');

    store.setCallStatus('SPEAKING');
    expect(useCallModeStore.getState().callStatus).toBe('SPEAKING');
  });

  it('toggles microphone mute state', () => {
    const store = useCallModeStore.getState();
    store.toggleMute();
    expect(useCallModeStore.getState().isMuted).toBe(true);

    store.toggleMute();
    expect(useCallModeStore.getState().isMuted).toBe(false);
  });

  it('adds user and assistant messages to conversation history', () => {
    const store = useCallModeStore.getState();
    store.addMessageToHistory('user', 'Berapa turunan dari x^2?');
    store.addMessageToHistory('assistant', 'Turunan dari x^2 adalah 2x.');

    const history = useCallModeStore.getState().conversationHistory;
    expect(history.length).toBe(2);
    expect(history[0].role).toBe('user');
    expect(history[0].text).toBe('Berapa turunan dari x^2?');
    expect(history[1].role).toBe('assistant');
    expect(history[1].text).toBe('Turunan dari x^2 adalah 2x.');
  });

  it('ends call and resets state to IDLE', () => {
    const store = useCallModeStore.getState();
    store.startCall();
    store.setUserTranscript('Hello Nexora');
    store.setAiResponseText('Hello student!');
    store.endCall();

    const state = useCallModeStore.getState();
    expect(state.isCallOpen).toBe(false);
    expect(state.callStatus).toBe('IDLE');
    expect(state.userTranscript).toBe('');
    expect(state.aiResponseText).toBe('');
  });
});
