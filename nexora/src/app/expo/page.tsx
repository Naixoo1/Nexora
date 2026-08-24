import type { Metadata } from 'next';
import { ExpoChallengeArena } from '@/components/expo/ExpoChallengeArena';

export const metadata: Metadata = {
  title: 'Expo Challenge Arena | Nexora AI',
  description:
    'Interactive Multi-Disciplinary AI Challenge Arena with voice-driven problem solving, Socratic hints, and speed solver certification.',
};

export default function ExpoPage() {
  return <ExpoChallengeArena />;
}
