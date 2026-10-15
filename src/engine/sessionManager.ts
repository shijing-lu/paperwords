/**
 * Progressive Learning Multi-Round Session Manager
 * Best practice: In-Session Leech Elimination & Spaced Repetition Graduation
 *
 * Rules:
 * 1. Round 1: Study all N target new words.
 *    - Rating 1 (Mastered): Added to passed pool.
 *    - Rating 2/3 (Fuzzy/Unknown): Pops up reinforce card, then queued into Round 2.
 * 2. Round 2: Only study the words that were failed in Round 1.
 * 3. Round 3...: Repeated until 100% of today's target words have passed an active recall test.
 * 4. Graduation: Only when all words are passed, the session graduates to Ebbinghaus Spaced Repetition!
 */

import type { WordItem, ReviewState } from '../types';
import { calculateNextReviewState } from './ebbinghaus';

export interface DailyLearningSession {
  deckId: string;
  dateKey: string;             // YYYY-MM-DD
  currentRound: number;        // 1, 2, 3...
  targetWordIds: string[];     // All words planned for today (e.g. 50 words)
  activeQueueIds: string[];    // Words remaining in the current active round
  passedWordIds: string[];     // Words that have passed in the session
  nextRoundWordIds: string[];  // Words marked 2 or 3 in this round, queued for next round
  firstPassIds: string[];      // Words that passed on Round 1 (for First-Pass Accuracy)
  isGraduated: boolean;        // True when all words have passed all rounds and entered Ebbinghaus
}

const STORAGE_KEY = 'paperwords_progressive_session_v2';

export const sessionManager = {
  // Get date key for today: YYYY-MM-DD
  getTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  getStorageKey(deckId: string, userId?: string): string {
    return userId ? `${STORAGE_KEY}_${userId}_${deckId}` : `${STORAGE_KEY}_${deckId}`;
  },

  // Load active session from localStorage
  loadSession(deckId: string, userId?: string): DailyLearningSession | null {
    try {
      const raw = localStorage.getItem(this.getStorageKey(deckId, userId));
      if (!raw) return null;
      const session: DailyLearningSession = JSON.parse(raw);
      // Validate date key
      if (session.dateKey !== this.getTodayKey()) {
        return null; // Expired, from previous day
      }
      return session;
    } catch (e) {
      console.warn('Failed to load learning session:', e);
      return null;
    }
  },

  // Save session state
  saveSession(session: DailyLearningSession, userId?: string) {
    try {
      localStorage.setItem(this.getStorageKey(session.deckId, userId), JSON.stringify(session));
    } catch (e) {
      console.warn('Failed to save learning session:', e);
    }
  },

  // Initialize a new session for today's words
  initSession(deckId: string, targetWords: WordItem[], userId?: string): DailyLearningSession {
    const todayKey = this.getTodayKey();
    const existing = this.loadSession(deckId, userId);
    if (existing && existing.dateKey === todayKey && existing.targetWordIds.length > 0) {
      return existing;
    }

    const ids = targetWords.map((w) => w.id);
    const session: DailyLearningSession = {
      deckId,
      dateKey: todayKey,
      currentRound: 1,
      targetWordIds: ids,
      activeQueueIds: [...ids],
      passedWordIds: [],
      nextRoundWordIds: [],
      firstPassIds: [],
      isGraduated: false,
    };

    this.saveSession(session);
    return session;
  },

  // Process rating for a word in the current round
  recordWordRating(
    session: DailyLearningSession,
    wordId: string,
    rating: 1 | 2 | 3,
    userId?: string
  ): {
    updatedSession: DailyLearningSession;
    roundFinished: boolean;
    allGraduated: boolean;
  } {
    // Remove from active queue of current round
    const nextActiveQueue = session.activeQueueIds.filter((id) => id !== wordId);
    let nextPassed = [...session.passedWordIds];
    let nextRoundQueue = [...session.nextRoundWordIds];
    let nextFirstPass = [...session.firstPassIds];

    if (rating === 1) {
      // Passed this round!
      if (!nextPassed.includes(wordId)) {
        nextPassed.push(wordId);
      }
      // If passed in Round 1, record as first-pass
      if (session.currentRound === 1 && !nextFirstPass.includes(wordId)) {
        nextFirstPass.push(wordId);
      }
    } else {
      // Fuzzy (2) or Unknown (3): Needs review in the next round!
      if (!nextRoundQueue.includes(wordId)) {
        nextRoundQueue.push(wordId);
      }
    }

    let updatedSession: DailyLearningSession = {
      ...session,
      activeQueueIds: nextActiveQueue,
      passedWordIds: nextPassed,
      nextRoundWordIds: nextRoundQueue,
      firstPassIds: nextFirstPass,
    };

    // Check if the current round has finished
    const roundFinished = nextActiveQueue.length === 0;
    let allGraduated = false;

    if (roundFinished) {
      if (nextRoundQueue.length === 0) {
        // No words left in next round: 100% Passed! All graduated!
        allGraduated = true;
        updatedSession.isGraduated = true;
      } else {
        // Advance to next round!
        updatedSession = {
          ...updatedSession,
          currentRound: session.currentRound + 1,
          activeQueueIds: [...nextRoundQueue],
          nextRoundWordIds: [], // Reset next round queue
        };
      }
    }

    this.saveSession(updatedSession, userId);
    return {
      updatedSession,
      roundFinished,
      allGraduated,
    };
  },

  // Clear session (e.g. when resetting daily plan)
  clearSession(deckId: string, userId?: string) {
    try {
      localStorage.removeItem(this.getStorageKey(deckId, userId));
    } catch (e) {}
  },

  // Generate batch database updates when all words in the session graduate
  generateGraduationUpdates(session: DailyLearningSession, wordsInDeck: WordItem[]): WordItem[] {
    const wordMap = new Map(wordsInDeck.map((w) => [w.id, w]));
    const now = Date.now();
    const intervalMinutes = 5; // 艾宾浩斯第 1 周期：5 分钟后首轮复习
    const nextReviewDate = now + intervalMinutes * 60 * 1000;

    const graduatedWords: WordItem[] = [];

    for (const id of session.targetWordIds) {
      const original = wordMap.get(id);
      if (!original) continue;

      const isFirstPass = session.firstPassIds.includes(id);
      const easeFactor = isFirstPass
        ? 2.5
        : Math.max(1.3, 2.5 - 0.15 * Math.min(4, session.currentRound - 1));
      const lapses = isFirstPass ? (original.reviewState.lapses || 0) : (original.reviewState.lapses || 0) + 1;

      graduatedWords.push({
        ...original,
        reviewState: {
          ...original.reviewState,
          repetition: 1,
          interval: intervalMinutes / (24 * 60),
          easeFactor,
          lastReviewDate: now,
          nextReviewDate,
          lapses,
          status: 'learning',
          lastRating: 1,
        },
      });
    }

    return graduatedWords;
  },

  // Calculate high-level progress & accuracy stats
  calculateSessionStats(session: DailyLearningSession) {
    const totalTarget = session.targetWordIds.length;
    const passedCount = session.passedWordIds.length;
    const firstPassCount = session.firstPassIds.length;
    const firstPassRate = totalTarget > 0 ? Math.round((firstPassCount / totalTarget) * 100) : 0;
    const passRate = totalTarget > 0 ? Math.round((passedCount / totalTarget) * 100) : 0;

    return {
      totalTarget,
      passedCount,
      firstPassCount,
      firstPassRate,
      passRate,
      currentRound: session.currentRound,
      remainingInRound: session.activeQueueIds.length,
      nextRoundPending: session.nextRoundWordIds.length,
      isGraduated: session.isGraduated,
    };
  },
};
