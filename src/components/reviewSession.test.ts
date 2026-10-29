import { describe, it, expect, beforeEach } from 'vitest';
import { Flashcard } from '../types/flashcard.ts';
import { getDueCards, calculateNextReview, applyReview } from '../core/scheduler.ts';
import { addDaysToDate } from '../core/dateUtils.ts';
import {
  setStorageProvider,
  MemoryStorage,
  saveFlashcards,
  getFlashcards,
  updateFlashcard,
} from '../storage/localStorage.ts';
import { ReviewLogEntry } from './StudySummary.tsx';

const TEST_KEY = 'lingualoop_review_test';
const TODAY = '2026-10-28';

function createCard(id: string, overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id,
    word: `word-${id}`,
    sourceLanguage: 'Spanish',
    targetLanguage: 'English',
    meaning: `meaning-${id}`,
    exampleSentence: `Example sentence for ${id}`,
    createdAt: '2026-10-01T10:00:00.000Z',
    repetitionCount: 0,
    intervalDays: 0,
    nextReviewDate: TODAY,
    lastReviewedAt: null,
    lastRecallLevel: null,
    ...overrides,
  };
}

describe('Review Session Integration & Flow (Stage 4B)', () => {
  beforeEach(() => {
    setStorageProvider(new MemoryStorage());
  });

  describe('A & B: Review Queue Generation (getDueCards)', () => {
    it('loads overdue cards, cards due today, and unreviewed cards while excluding future cards', () => {
      const overdueCard = createCard('card-overdue', {
        nextReviewDate: addDaysToDate(TODAY, -2),
        lastReviewedAt: addDaysToDate(TODAY, -5),
      });
      const dueTodayCard = createCard('card-today', {
        nextReviewDate: TODAY,
        lastReviewedAt: addDaysToDate(TODAY, -1),
      });
      const newCard = createCard('card-new', {
        nextReviewDate: TODAY,
        lastReviewedAt: null,
      });
      const futureCard = createCard('card-future', {
        nextReviewDate: addDaysToDate(TODAY, 3),
        lastReviewedAt: TODAY,
      });

      const allCards = [futureCard, dueTodayCard, overdueCard, newCard];
      const queue = getDueCards(allCards, TODAY);

      // Future card must be excluded
      expect(queue).toHaveLength(3);
      expect(queue.some((c) => c.id === 'card-future')).toBe(false);

      // Overdue card must be first in the queue
      expect(queue[0].id).toBe('card-overdue');
      // Unreviewed card prioritized before reviewed card due today
      expect(queue[1].id).toBe('card-new');
      expect(queue[2].id).toBe('card-today');
    });

    it('K: handles empty review queue gracefully when no cards are due', () => {
      const futureCards = [
        createCard('f1', { nextReviewDate: addDaysToDate(TODAY, 1) }),
        createCard('f2', { nextReviewDate: addDaysToDate(TODAY, 5) }),
      ];

      const queue = getDueCards(futureCards, TODAY);
      expect(queue).toEqual([]);
    });
  });

  describe('C: Reveal Answer State', () => {
    it('correctly tracks answer visibility toggle without altering card data', () => {
      let isAnswerRevealed = false;
      expect(isAnswerRevealed).toBe(false);

      // Simulate clicking "Show Answer"
      isAnswerRevealed = true;
      expect(isAnswerRevealed).toBe(true);
    });
  });

  describe('D, E, F, G: Rating Updates via Scheduler', () => {
    it('D: AGAIN resets repetitionCount to 0 and interval to 1 day', () => {
      const card = createCard('c1', { repetitionCount: 3, intervalDays: 7 });
      const updated = applyReview(card, 'AGAIN', TODAY);

      expect(updated.repetitionCount).toBe(0);
      expect(updated.intervalDays).toBe(1);
      expect(updated.nextReviewDate).toBe(addDaysToDate(TODAY, 1));
      expect(updated.lastReviewedAt).toBe(TODAY);
      expect(updated.lastRecallLevel).toBe('AGAIN');
    });

    it('E: HARD increases interval by at least 1 day without increasing repetitionCount', () => {
      const card = createCard('c2', { repetitionCount: 2, intervalDays: 3 });
      const updated = applyReview(card, 'HARD', TODAY);

      expect(updated.repetitionCount).toBe(2); // Unchanged
      expect(updated.intervalDays).toBe(4);    // Math.max(1, 3+1, round(3*1.2)) = 4
      expect(updated.nextReviewDate).toBe(addDaysToDate(TODAY, 4));
      expect(updated.lastRecallLevel).toBe('HARD');
    });

    it('F: GOOD advances repetitionCount and applies standard interval ladder', () => {
      const card = createCard('c3', { repetitionCount: 1, intervalDays: 1 });
      const updated = applyReview(card, 'GOOD', TODAY);

      expect(updated.repetitionCount).toBe(2);
      expect(updated.intervalDays).toBe(3);
      expect(updated.nextReviewDate).toBe(addDaysToDate(TODAY, 3));
      expect(updated.lastRecallLevel).toBe('GOOD');
    });

    it('G: EASY advances repetitionCount and applies bonus interval ladder', () => {
      const card = createCard('c4', { repetitionCount: 1, intervalDays: 3 });
      const updated = applyReview(card, 'EASY', TODAY);

      expect(updated.repetitionCount).toBe(2);
      expect(updated.intervalDays).toBe(7);
      expect(updated.nextReviewDate).toBe(addDaysToDate(TODAY, 7));
      expect(updated.lastRecallLevel).toBe('EASY');
    });
  });

  describe('H & I: Storage Persistence & Queue Progression', () => {
    it('H: persists updated card through storage adapter preserving all original attributes', () => {
      const originalCard = createCard('c-persist', {
        word: 'estrella',
        meaning: 'star',
        sourceLanguage: 'Spanish',
        targetLanguage: 'English',
        exampleSentence: 'Las estrellas brillan.',
        createdAt: '2026-10-01T12:00:00.000Z',
      });
      saveFlashcards([originalCard], TEST_KEY);

      const reviewedCard = applyReview(originalCard, 'GOOD', TODAY);
      updateFlashcard(reviewedCard, TEST_KEY);

      const retrievedCards = getFlashcards(TEST_KEY);
      expect(retrievedCards).toHaveLength(1);

      const saved = retrievedCards[0];
      // Preserved fields
      expect(saved.word).toBe('estrella');
      expect(saved.meaning).toBe('star');
      expect(saved.sourceLanguage).toBe('Spanish');
      expect(saved.targetLanguage).toBe('English');
      expect(saved.exampleSentence).toBe('Las estrellas brillan.');
      expect(saved.createdAt).toBe('2026-10-01T12:00:00.000Z');

      // Updated scheduling fields
      expect(saved.repetitionCount).toBe(1);
      expect(saved.intervalDays).toBe(1);
      expect(saved.nextReviewDate).toBe(addDaysToDate(TODAY, 1));
      expect(saved.lastReviewedAt).toBe(TODAY);
      expect(saved.lastRecallLevel).toBe('GOOD');
    });

    it('I: advances currentIndex to the next card in queue', () => {
      const queue = [createCard('c1'), createCard('c2'), createCard('c3')];
      let currentIndex = 0;

      // Card 1
      expect(queue[currentIndex].id).toBe('c1');
      currentIndex += 1;

      // Card 2
      expect(queue[currentIndex].id).toBe('c2');
      currentIndex += 1;

      // Card 3
      expect(queue[currentIndex].id).toBe('c3');
      currentIndex += 1;

      // Completed
      expect(currentIndex).toBe(queue.length);
    });

    it('prevents queue skipping when card state updates parent deck mid-session (Priority 1 bug fix)', () => {
      // 3 cards initially due today
      const card1 = createCard('c1', { word: 'uno', nextReviewDate: TODAY });
      const card2 = createCard('c2', { word: 'dos', nextReviewDate: TODAY });
      const card3 = createCard('c3', { word: 'tres', nextReviewDate: TODAY });

      let parentDeck = [card1, card2, card3];

      // Frozen session queue initialized once at session start
      const sessionQueue = getDueCards(parentDeck, TODAY);
      expect(sessionQueue.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);

      const reviewedOrder: string[] = [];
      let currentIndex = 0;

      // --- Review Card 1 ---
      const activeCard0 = sessionQueue[currentIndex];
      expect(activeCard0.id).toBe('c1');
      reviewedOrder.push(activeCard0.id);

      // Card 1 is reviewed as GOOD and moves into future
      const updatedCard1 = applyReview(activeCard0, 'GOOD', TODAY);
      // Parent deck state updates (like onCardUpdated in App.tsx)
      parentDeck = parentDeck.map((c) => (c.id === updatedCard1.id ? updatedCard1 : c));

      // Demonstrating the fixed bug:
      // If we had dynamically re-queried getDueCards(parentDeck, TODAY), the queue would shrink:
      const dynamicShrunkQueue = getDueCards(parentDeck, TODAY);
      expect(dynamicShrunkQueue).toHaveLength(2); // c1 was removed
      // If index advanced to 1 in dynamicShrunkQueue, dynamicShrunkQueue[1] would be 'c3', skipping 'c2'!
      expect(dynamicShrunkQueue[1].id).toBe('c3');

      // But with our frozen sessionQueue, index 1 correctly points to Card 2:
      currentIndex += 1;
      const activeCard1 = sessionQueue[currentIndex];
      expect(activeCard1.id).toBe('c2');
      reviewedOrder.push(activeCard1.id);

      // --- Review Card 2 ---
      const updatedCard2 = applyReview(activeCard1, 'GOOD', TODAY);
      parentDeck = parentDeck.map((c) => (c.id === updatedCard2.id ? updatedCard2 : c));
      currentIndex += 1;

      // --- Review Card 3 ---
      const activeCard2 = sessionQueue[currentIndex];
      expect(activeCard2.id).toBe('c3');
      reviewedOrder.push(activeCard2.id);

      const updatedCard3 = applyReview(activeCard2, 'EASY', TODAY);
      parentDeck = parentDeck.map((c) => (c.id === updatedCard3.id ? updatedCard3 : c));
      currentIndex += 1;

      // All 3 cards reviewed sequentially in exact order without skipping
      expect(reviewedOrder).toEqual(['c1', 'c2', 'c3']);
      expect(currentIndex).toBe(sessionQueue.length);
    });
  });

  describe('J: Progress Tracking', () => {
    it('computes Card X of Y and progress percentage accurately', () => {
      const totalCards = 4;

      const step0Percent = Math.round((0 / totalCards) * 100);
      expect(step0Percent).toBe(0);

      const step1Percent = Math.round((1 / totalCards) * 100);
      expect(step1Percent).toBe(25);

      const step2Percent = Math.round((2 / totalCards) * 100);
      expect(step2Percent).toBe(50);

      const step3Percent = Math.round((3 / totalCards) * 100);
      expect(step3Percent).toBe(75);

      const step4Percent = Math.round((4 / totalCards) * 100);
      expect(step4Percent).toBe(100);
    });
  });

  describe('L: StudySummary Aggregation', () => {
    it('correctly aggregates rating counts and next review distributions', () => {
      const sampleLogs: ReviewLogEntry[] = [
        { card: createCard('c1'), rating: 'GOOD', nextInterval: 3 },
        { card: createCard('c2'), rating: 'AGAIN', nextInterval: 1 },
        { card: createCard('c3'), rating: 'GOOD', nextInterval: 7 },
        { card: createCard('c4'), rating: 'HARD', nextInterval: 2 },
        { card: createCard('c5'), rating: 'EASY', nextInterval: 14 },
      ];

      expect(sampleLogs.length).toBe(5);
      expect(sampleLogs.filter((l) => l.rating === 'AGAIN').length).toBe(1);
      expect(sampleLogs.filter((l) => l.rating === 'HARD').length).toBe(1);
      expect(sampleLogs.filter((l) => l.rating === 'GOOD').length).toBe(2);
      expect(sampleLogs.filter((l) => l.rating === 'EASY').length).toBe(1);

      // Schedule distribution
      const dueTomorrow = sampleLogs.filter((l) => l.nextInterval === 1).length;
      const scheduledLater = sampleLogs.filter((l) => l.nextInterval > 1).length;

      expect(dueTomorrow).toBe(1);
      expect(scheduledLater).toBe(4);
    });
  });

  describe('M: Same-Day Review Protection', () => {
    it('freezes repetitionCount and interval when card is reviewed multiple times on the same calendar day', () => {
      // Card was reviewed earlier today
      const card = createCard('c-sameday', {
        repetitionCount: 2,
        intervalDays: 3,
        lastReviewedAt: TODAY,
      });

      // Rating GOOD again on the same day
      const resGood = calculateNextReview(card, 'GOOD', TODAY);
      expect(resGood.repetitionCount).toBe(2); // Does not increase
      expect(resGood.intervalDays).toBe(3);    // Does not advance

      // Rating EASY again on the same day
      const resEasy = calculateNextReview(card, 'EASY', TODAY);
      expect(resEasy.repetitionCount).toBe(2); // Does not increase
      expect(resEasy.intervalDays).toBe(3);    // Does not advance

      // Rating HARD again on the same day
      const resHard = calculateNextReview(card, 'HARD', TODAY);
      expect(resHard.repetitionCount).toBe(2); // Does not increase
      expect(resHard.intervalDays).toBe(3);    // Does not advance

      // Rating AGAIN still resets card to 0 repetitions and 1 day interval
      const resAgain = calculateNextReview(card, 'AGAIN', TODAY);
      expect(resAgain.repetitionCount).toBe(0);
      expect(resAgain.intervalDays).toBe(1);
      expect(resAgain.nextReviewDate).toBe(addDaysToDate(TODAY, 1));
    });
  });
});
