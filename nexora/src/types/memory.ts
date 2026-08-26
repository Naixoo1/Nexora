export interface UserMemory {
  id: string;
  userId: string;
  academicStrengths: string[];
  academicWeaknesses: string[];
  learningStyle: string;
  academicGoal: string;
  extractedTopics: string[];
  rawNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserMemoryPayload {
  academicStrengths?: string[];
  academicWeaknesses?: string[];
  learningStyle?: string;
  academicGoal?: string;
  extractedTopics?: string[];
  rawNotes?: string | null;
}

export interface MemoryExtractRequest {
  sessionId?: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
}

export interface MemoryExtractResponse {
  success: boolean;
  data: UserMemory | null;
  message?: string;
  extractedUpdates?: {
    newStrengths: string[];
    newWeaknesses: string[];
    learningStyleHint?: string;
    identifiedTopics: string[];
  };
}
