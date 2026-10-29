import { describe, it, expect } from 'vitest';
import {
  calculateNextReview,
  applyReview,
  getDueCards,
} from './scheduler.ts';
import {
  isValidDateFormat,
  formatLocalDate,
  addDaysToDate,
  compareCalendarDates,
  isCardDue,
} from './dateUtils.ts';
import { Flashcard } from '../types/flashcard.ts';

// Helper to construct sample test cards
function createMockCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'test-card-1',
    word: 'luna',
    sourceLanguage: 'Spanish',
    targetLanguage: 'English',
    meaning: 'moon',
    exampleSentence: 'La luna brilla en la noche.',
    createdAt: '2026-10-01T10:00:00.000Z',
    repetitionCount: 0,
    intervalDays: 0,
    nextReviewDate: '2026-10-27',
    lastReviewedAt: null,
    lastRecallLevel: null,
    ...overrides,
  };
}

describe('Date Utilities (dateUtils.ts)', () => {
  describe('isValidDateFormat', () => {
    it('accepts valid YYYY-MM-DD dates', () => {
      expect(isValidDateFormat('2026-10-27')).toBe(true);
      expect(isValidDateFormat('2024-02-29')).toBe(true); // Leap year
    });

    it('rejects invalid calendar dates and bad formats', () => {
      expect(isValidDateFormat('2023-02-29')).toBe(false); // Not a leap year
      expect(isValidDateFormat('2026-13-01')).toBe(false); // Month 13
      expect(isValidDateFormat('2026-04-31')).toBe(false); // April has 30 days
      expect(isValidDateFormat('27-10-2026')).toBe(false); // DD-MM-YYYY
      expect(isValidDateFormat('2026/10/27')).toBe(false); // Slash separator
      expect(isValidDateFormat('')).toBe(false);
      // @ts-expect-error test runtime invalid type
      expect(isValidDateFormat(null)).toBe(false);
    });
  });

  describe('formatLocalDate', () => {
    it('formats a date instance to YYYY-MM-DD with zero-padding', () => {
      const d = new Date(2026, 4, 3); // May 3, 2026
      expect(formatLocalDate(d)).toBe('2026-05-03');
    });
  });

  describe('addDaysToDate', () => {
    it('adds 0 days and returns the identical date', () => {
      expect(addDaysToDate('2026-10-27', 0)).toBe('2026-10-27');
    });

    it('adds 1 day cleanly', () => {
      expect(addDaysToDate('2026-10-27', 1)).toBe('2026-10-28');
    });

    it('handles month boundaries correctly', () => {
      expect(addDaysToDate('2026-10-31', 1)).toBe('2026-11-01');
    });

    it('handles year rollover correctly', () => {
      expect(addDaysToDate('2026-12-31', 1)).toBe('2027-01-01');
      expect(addDaysToDate('2026-12-25', 10)).toBe('2027-01-04');
    });

    it('handles leap year boundaries', () => {
      expect(addDaysToDate('2024-02-28', 1)).toBe('2024-02-29');
      expect(addDaysToDate('2024-02-28', 2)).toBe('2024-03-01');
      expect(addDaysToDate('2023-02-28', 1)).toBe('2023-03-01');
    });

    it('throws on invalid base date or non-finite days', () => {
      expect(() => addDaysToDate('bad-date', 2)).toThrow(/Invalid baseDateStr format/);
      expect(() => addDaysToDate('2026-10-27', NaN)).toThrow(/Invalid days argument/);
    });
  });

  describe('compareCalendarDates', () => {
    it('compares dates accurately', () => {
      expect(compareCalendarDates('2026-10-25', '2026-10-27')).toBeLessThan(0);
      expect(compareCalendarDates('2026-10-27', '2026-10-27')).toBe(0);
      expect(compareCalendarDates('2026-11-01', '2026-10-27')).toBeGreaterThan(0);
    });

    it('throws if either date is invalid format', () => {
      expect(() => compareCalendarDates('invalid', '2026-10-27')).toThrow();
      expect(() => compareCalendarDates('2026-10-27', 'invalid')).toThrow();
    });
  });

  describe('isCardDue', () => {
    it('marks cards due today or earlier as due', () => {
      expect(isCardDue('2026-10-20', '2026-10-27')).toBe(true); // Overdue
      expect(isCardDue('2026-10-27', '2026-10-27')).toBe(true); // Due today
      expect(isCardDue('2026-10-28', '2026-10-27')).toBe(false); // Future
    });
  });
});

describe('Spaced-Repetition Scheduler (scheduler.ts)', () => {
  const REVIEW_DATE = '2026-10-27';

  describe('Recall Level: AGAIN', () => {
    it('resets repetitionCount to 0 and schedules interval of 1 day for a new card', () => {
      const card = createMockCard({ repetitionCount: 0, intervalDays: 0 });
      const result = calculateNextReview(card, 'AGAIN', REVIEW_DATE);

      expect(result.repetitionCount).toBe(0);
      expect(result.intervalDays).toBe(1);
      expect(result.nextReviewDate).toBe('2026-10-28');
    });

    it('resets repetitionCount to 0 even from a high repetition count and large interval', () => {
      const card = createMockCard({ repetitionCount: 5, intervalDays: 30 });
      const result = calculateNextReview(card, 'AGAIN', REVIEW_DATE);

      expect(result.repetitionCount).toBe(0);
      expect(result.intervalDays).toBe(1);
      expect(result.nextReviewDate).toBe('2026-10-28');
    });
  });

  describe('Recall Level: HARD (Correction 1: Stagnation Prevention)', () => {
    it('advances interval 1 -> 2 while keeping repetitionCount unchanged', () => {
      const card = createMockCard({ repetitionCount: 1, intervalDays: 1 });
      const result = calculateNextReview(card, 'HARD', REVIEW_DATE);

      expect(result.repetitionCount).toBe(1);
      // Math.max(1, 1 + 1, Math.round(1 * 1.2)) = 2
      expect(result.intervalDays).toBe(2);
      expect(result.nextReviewDate).toBe('2026-10-29');
    });

    it('advances interval 2 -> 3 while keeping repetitionCount unchanged', () => {
      const card = createMockCard({ repetitionCount: 2, intervalDays: 2 });
      const result = calculateNextReview(card, 'HARD', REVIEW_DATE);

      expect(result.repetitionCount).toBe(2);
      // Math.max(1, 2 + 1, Math.round(2 * 1.2)) = 3
      expect(result.intervalDays).toBe(3);
      expect(result.nextReviewDate).toBe('2026-10-30');
    });

    it('advances interval 3 -> 4 while keeping repetitionCount unchanged', () => {
      const card = createMockCard({ repetitionCount: 2, intervalDays: 3 });
      const result = calculateNextReview(card, 'HARD', REVIEW_DATE);

      expect(result.repetitionCount).toBe(2);
      // Math.max(1, 3 + 1, Math.round(3 * 1.2)) = 4
      expect(result.intervalDays).toBe(4);
      expect(result.nextReviewDate).toBe('2026-10-31');
    });

    it('advances interval 10 -> 12 when 1.2x exceeds currentInterval + 1', () => {
      const card = createMockCard({ repetitionCount: 3, intervalDays: 10 });
      const result = calculateNextReview(card, 'HARD', REVIEW_DATE);

      expect(result.repetitionCount).toBe(3);
      // Math.max(1, 10 + 1, Math.round(10 * 1.2)) = Math.max(1, 11, 12) = 12
      expect(result.intervalDays).toBe(12);
      expect(result.nextReviewDate).toBe('2026-11-08');
    });

    it('sets interval to 1 day for a brand-new card with interval 0', () => {
      const card = createMockCard({ repetitionCount: 0, intervalDays: 0 });
      const result = calculateNextReview(card, 'HARD', REVIEW_DATE);

      expect(result.repetitionCount).toBe(0);
      // Math.max(1, 0 + 1, Math.round(0 * 1.2)) = 1
      expect(result.intervalDays).toBe(1);
      expect(result.nextReviewDate).toBe('2026-10-28');
    });
  });

  describe('Recall Level: GOOD (Correction 2: Non-Decreasing Safeguard)', () => {
    it('follows normal 1 -> 3 -> 7 progression for repetitions 1, 2, 3', () => {
      // Rep 1: 1 day
      const r1 = calculateNextReview(createMockCard({ repetitionCount: 0, intervalDays: 0 }), 'GOOD', REVIEW_DATE);
      expect(r1.repetitionCount).toBe(1);
      expect(r1.intervalDays).toBe(1);
      expect(r1.nextReviewDate).toBe('2026-10-28');

      // Rep 2: 3 days
      const r2 = calculateNextReview(createMockCard({ repetitionCount: 1, intervalDays: 1 }), 'GOOD', REVIEW_DATE);
      expect(r2.repetitionCount).toBe(2);
      expect(r2.intervalDays).toBe(3);
      expect(r2.nextReviewDate).toBe('2026-10-30');

      // Rep 3: 7 days
      const r3 = calculateNextReview(createMockCard({ repetitionCount: 2, intervalDays: 3 }), 'GOOD', REVIEW_DATE);
      expect(r3.repetitionCount).toBe(3);
      expect(r3.intervalDays).toBe(7);
      expect(r3.nextReviewDate).toBe('2026-11-03');
    });

    it('never decreases an existing longer interval (repetition 1 does not drop from 10 to 1)', () => {
      // Card accumulated interval 10 via previous reviews, but repetitionCount is 0
      const card = createMockCard({ repetitionCount: 0, intervalDays: 10 });
      const result = calculateNextReview(card, 'GOOD', REVIEW_DATE);

      expect(result.repetitionCount).toBe(1);
      // Target is 1, but Math.max(1, 10) preserves 10
      expect(result.intervalDays).toBe(10);
      expect(result.nextReviewDate).toBe('2026-11-06');
    });

    it('never decreases an existing longer interval (repetition 2 does not drop from 5 to 3)', () => {
      const card = createMockCard({ repetitionCount: 1, intervalDays: 5 });
      const result = calculateNextReview(card, 'GOOD', REVIEW_DATE);

      expect(result.repetitionCount).toBe(2);
      // Target is 3, Math.max(3, 5) preserves 5
      expect(result.intervalDays).toBe(5);
      expect(result.nextReviewDate).toBe('2026-11-01');
    });

    it('doubles current interval for repetition >= 4', () => {
      const card = createMockCard({ repetitionCount: 3, intervalDays: 7 });
      const result = calculateNextReview(card, 'GOOD', REVIEW_DATE);

      expect(result.repetitionCount).toBe(4);
      expect(result.intervalDays).toBe(14);
      expect(result.nextReviewDate).toBe('2026-11-10');

      const card5 = createMockCard({ repetitionCount: 4, intervalDays: 14 });
      const result5 = calculateNextReview(card5, 'GOOD', REVIEW_DATE);
      expect(result5.repetitionCount).toBe(5);
      expect(result5.intervalDays).toBe(28);
    });
  });

  describe('Recall Level: EASY (Correction 2: Non-Decreasing Safeguard)', () => {
    it('follows normal 3 -> 7 -> 14 progression for repetitions 1, 2, 3', () => {
      const r1 = calculateNextReview(createMockCard({ repetitionCount: 0, intervalDays: 0 }), 'EASY', REVIEW_DATE);
      expect(r1.repetitionCount).toBe(1);
      expect(r1.intervalDays).toBe(3);
      expect(r1.nextReviewDate).toBe('2026-10-30');

      const r2 = calculateNextReview(createMockCard({ repetitionCount: 1, intervalDays: 3 }), 'EASY', REVIEW_DATE);
      expect(r2.repetitionCount).toBe(2);
      expect(r2.intervalDays).toBe(7);
      expect(r2.nextReviewDate).toBe('2026-11-03');

      const r3 = calculateNextReview(createMockCard({ repetitionCount: 2, intervalDays: 7 }), 'EASY', REVIEW_DATE);
      expect(r3.repetitionCount).toBe(3);
      expect(r3.intervalDays).toBe(14);
      expect(r3.nextReviewDate).toBe('2026-11-10');
    });

    it('never decreases an existing longer interval (repetition 1 does not drop from 12 to 3)', () => {
      const card = createMockCard({ repetitionCount: 0, intervalDays: 12 });
      const result = calculateNextReview(card, 'EASY', REVIEW_DATE);

      expect(result.repetitionCount).toBe(1);
      // Target is 3, Math.max(3, 12) preserves 12
      expect(result.intervalDays).toBe(12);
      expect(result.nextReviewDate).toBe('2026-11-08');
    });

    it('applies 2.5x multiplier for repetition >= 4', () => {
      const card = createMockCard({ repetitionCount: 3, intervalDays: 14 });
      const result = calculateNextReview(card, 'EASY', REVIEW_DATE);

      expect(result.repetitionCount).toBe(4);
      // Math.round(14 * 2.5) = 35
      expect(result.intervalDays).toBe(35);
      expect(result.nextReviewDate).toBe('2026-12-01');
    });
  });

  describe('Same-Day Repeat Reviews (Correction 3: Anti-Cramming Guard)', () => {
    const cardReviewedEarlierToday = createMockCard({
      repetitionCount: 2,
      intervalDays: 3,
      lastReviewedAt: '2026-10-27', // Same calendar date as REVIEW_DATE
    });

    it('does NOT increase repetitionCount or interval when rated GOOD on the same day', () => {
      const result = calculateNextReview(cardReviewedEarlierToday, 'GOOD', REVIEW_DATE);

      expect(result.repetitionCount).toBe(2); // Unchanged
      expect(result.intervalDays).toBe(3);    // Unchanged
      expect(result.nextReviewDate).toBe('2026-10-30'); // reviewDate + 3 days
    });

    it('does NOT increase repetitionCount or interval when rated EASY on the same day', () => {
      const result = calculateNextReview(cardReviewedEarlierToday, 'EASY', REVIEW_DATE);

      expect(result.repetitionCount).toBe(2); // Unchanged
      expect(result.intervalDays).toBe(3);    // Unchanged
      expect(result.nextReviewDate).toBe('2026-10-30');
    });

    it('does NOT increase repetitionCount or interval when rated HARD on the same day', () => {
      const result = calculateNextReview(cardReviewedEarlierToday, 'HARD', REVIEW_DATE);

      expect(result.repetitionCount).toBe(2); // Unchanged
      expect(result.intervalDays).toBe(3);    // Unchanged
      expect(result.nextReviewDate).toBe('2026-10-30');
    });

    it('resets repetitionCount to 0 and interval to 1 when rated AGAIN on the same day', () => {
      const result = calculateNextReview(cardReviewedEarlierToday, 'AGAIN', REVIEW_DATE);

      expect(result.repetitionCount).toBe(0); // Reset
      expect(result.intervalDays).toBe(1);    // Reset
      expect(result.nextReviewDate).toBe('2026-10-28'); // Due tomorrow
    });
  });

  describe('Multi-Step Progression Simulation', () => {
    it('accurately tracks state through a realistic sequence of daily reviews', () => {
      let card = createMockCard({ repetitionCount: 0, intervalDays: 0, lastReviewedAt: null });

      // Step 1: User rates GOOD on day 1
      card = applyReview(card, 'GOOD', '2026-10-01');
      expect(card.repetitionCount).toBe(1);
      expect(card.intervalDays).toBe(1);
      expect(card.nextReviewDate).toBe('2026-10-02');
      expect(card.lastReviewedAt).toBe('2026-10-01');
      expect(card.lastRecallLevel).toBe('GOOD');

      // Step 2: User reviews next day and rates GOOD
      card = applyReview(card, 'GOOD', '2026-10-02');
      expect(card.repetitionCount).toBe(2);
      expect(card.intervalDays).toBe(3);
      expect(card.nextReviewDate).toBe('2026-10-05');

      // Step 3: User struggled on 2026-10-05 and rates HARD
      card = applyReview(card, 'HARD', '2026-10-05');
      // Repetition count remains 2; interval = Math.max(1, 3 + 1, Math.round(3 * 1.2)) = 4 days
      expect(card.repetitionCount).toBe(2);
      expect(card.intervalDays).toBe(4);
      expect(card.nextReviewDate).toBe('2026-10-09');

      // Step 4: User rates GOOD on 2026-10-09 (rep becomes 3)
      card = applyReview(card, 'GOOD', '2026-10-09');
      expect(card.repetitionCount).toBe(3);
      expect(card.intervalDays).toBe(7);
      expect(card.nextReviewDate).toBe('2026-10-16');

      // Step 5: User finds it effortless and rates EASY on 2026-10-16 (rep becomes 4)
      card = applyReview(card, 'EASY', '2026-10-16');
      // Rep = 4; interval = Math.round(7 * 2.5) = 18 days
      expect(card.repetitionCount).toBe(4);
      expect(card.intervalDays).toBe(18);
      expect(card.nextReviewDate).toBe('2026-11-03');

      // Step 6: User forgets and rates AGAIN on 2026-11-03
      card = applyReview(card, 'AGAIN', '2026-11-03');
      expect(card.repetitionCount).toBe(0);
      expect(card.intervalDays).toBe(1);
      expect(card.nextReviewDate).toBe('2026-11-04');
      expect(card.lastRecallLevel).toBe('AGAIN');
    });
  });

  describe('Overdue Cards Scheduling', () => {
    it('schedules next review relative to review date, NOT the past due date', () => {
      // Card was due on 2026-10-01 (26 days overdue)
      const overdueCard = createMockCard({
        repetitionCount: 1,
        intervalDays: 1,
        nextReviewDate: '2026-10-01',
        lastReviewedAt: '2026-09-30',
      });

      // User reviews it today (2026-10-27) as GOOD (next rep = 2, interval = 3 days)
      const result = calculateNextReview(overdueCard, 'GOOD', '2026-10-27');

      expect(result.intervalDays).toBe(3);
      // Must be 2026-10-27 + 3 days = 2026-10-30, NEVER 2026-10-01 + 3 days
      expect(result.nextReviewDate).toBe('2026-10-30');
    });
  });

  describe('Daily Review List (getDueCards)', () => {
    it('filters out future cards and returns due cards sorted deterministically', () => {
      const cardPastOverdue = createMockCard({
        id: 'card-1-overdue',
        nextReviewDate: '2026-10-20',
        lastReviewedAt: '2026-10-10',
      });
      const cardDueToday = createMockCard({
        id: 'card-2-today',
        nextReviewDate: '2026-10-27',
        lastReviewedAt: '2026-10-20',
      });
      const cardUnreviewedDueToday = createMockCard({
        id: 'card-3-unreviewed',
        nextReviewDate: '2026-10-27',
        lastReviewedAt: null,
      });
      const cardFuture = createMockCard({
        id: 'card-4-future',
        nextReviewDate: '2026-10-28',
      });

      const cards = [cardFuture, cardDueToday, cardPastOverdue, cardUnreviewedDueToday];
      const dueCards = getDueCards(cards, '2026-10-27');

      // Expect 3 cards due, excluding card-4-future
      expect(dueCards).toHaveLength(3);

      // Ordering expectations:
      // 1. card-1-overdue (2026-10-20 < 2026-10-27)
      expect(dueCards[0].id).toBe('card-1-overdue');

      // 2. Both due today (2026-10-27): unreviewed cards prioritized before reviewed
      expect(dueCards[1].id).toBe('card-3-unreviewed');
      expect(dueCards[2].id).toBe('card-2-today');
    });

    it('breaks ties deterministically using card.id', () => {
      const cardA = createMockCard({ id: 'alpha', nextReviewDate: '2026-10-27', lastReviewedAt: null });
      const cardB = createMockCard({ id: 'beta', nextReviewDate: '2026-10-27', lastReviewedAt: null });

      const sorted = getDueCards([cardB, cardA], '2026-10-27');
      expect(sorted[0].id).toBe('alpha');
      expect(sorted[1].id).toBe('beta');
    });

    it('returns an empty array when no cards are due', () => {
      const cards = [
        createMockCard({ id: 'c1', nextReviewDate: '2026-10-28' }),
        createMockCard({ id: 'c2', nextReviewDate: '2026-10-29' }),
      ];
      expect(getDueCards(cards, '2026-10-27')).toEqual([]);
    });
  });

  describe('Defensive & Edge Case Handling', () => {
    it('throws when given an invalid date format', () => {
      const card = createMockCard();
      expect(() => calculateNextReview(card, 'GOOD', 'invalid-date')).toThrow(
        /Invalid reviewDateStr format/
      );
    });

    it('throws when getDueCards is given an invalid reference date', () => {
      expect(() => getDueCards([], 'not-a-date')).toThrow(/Invalid referenceDateStr format/);
    });

    it('sanitizes negative or floating numbers defensively without crashing', () => {
      const card = createMockCard({ repetitionCount: -3, intervalDays: -5 });
      const result = calculateNextReview(card, 'GOOD', '2026-10-27');

      // Normalized repetitionCount from 0 -> 1; interval = 1
      expect(result.repetitionCount).toBe(1);
      expect(result.intervalDays).toBe(1);
      expect(result.nextReviewDate).toBe('2026-10-28');
    });

    it('throws for an unsupported recall level at runtime', () => {
      const card = createMockCard();
      // @ts-expect-error test invalid recall level
      expect(() => calculateNextReview(card, 'UNKNOWN_LEVEL', '2026-10-27')).toThrow(
        /Unsupported recall level/
      );
    });
  });
});
