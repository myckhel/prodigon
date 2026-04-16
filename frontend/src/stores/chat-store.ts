// ---------------------------------------------------------------------------
// Chat Store — manages sessions, messages, and active session state
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { nanoid } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
  latencyMs?: number;
  isStreaming?: boolean;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;

  // Derived helpers
  activeSession: () => ChatSession | undefined;

  // Actions
  createSession: () => string;
  setActiveSession: (id: string) => void;
  deleteSession: (id: string) => void;
  addMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  appendToMessage: (sessionId: string, messageId: string, token: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  activeSession: () => {
    const state = get();
    return state.sessions.find((s) => s.id === state.activeSessionId);
  },

  createSession: () => {
    const id = nanoid();
    const now = Date.now();
    const session: ChatSession = {
      id,
      title: 'New Chat',
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: id,
    }));
    return id;
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
  },

  deleteSession: (id) => {
    set((state) => {
      const remaining = state.sessions.filter((s) => s.id !== id);
      const newActiveId =
        state.activeSessionId === id
          ? remaining.length > 0
            ? remaining[0].id
            : null
          : state.activeSessionId;
      return { sessions: remaining, activeSessionId: newActiveId };
    });
  },

  addMessage: (sessionId, message) => {
    const id = nanoid();
    const now = Date.now();
    const fullMessage: ChatMessage = { ...message, id, timestamp: now };

    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;

        // Update session title from first user message
        const title =
          s.messages.length === 0 && message.role === 'user'
            ? message.content.slice(0, 50) || 'New Chat'
            : s.title;

        return {
          ...s,
          title,
          updatedAt: now,
          messages: [...s.messages, fullMessage],
        };
      }),
    }));

    return id;
  },

  updateMessage: (sessionId, messageId, updates) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          updatedAt: Date.now(),
          messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, ...updates } : m,
          ),
        };
      }),
    }));
  },

  appendToMessage: (sessionId, messageId, token) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, content: m.content + token } : m,
          ),
        };
      }),
    }));
  },
}));
