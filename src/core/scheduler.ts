/**
 * Academic prototype: LinguaLoop
 * Spaced-Repetition Scheduling Algorithm
 *
 * DISCLAIMER:
 * This algorithm is a simplified pedagogical heuristic designed strictly for
 * instructional transparency in an educational case study. It does NOT claim
 * cognitive, medical, or psychological validation.
 *
 * DESIGN PRINCIPLES:
 * 1. Pure & Deterministic: Output depends strictly on input arguments; no hidden clock or side effects.
 * 2. Isolated from UI & Storage: Pure mathematical logic testable in complete isolation.
 * 3. Transparent Rules: Every recall rating follows a clear, explicit mathematical transition.
 * 4. Calendar-Date Normalization: All due dates are tracked in 'YYYY-MM-DD' format.
 */

import { Flashcard, RecallLevel, SchedulingResult } from '../types/flashcard.ts';
import { addDaysToDate, compareCalendarDates, getTodayLocalDate, isValidDateFormat } from './dateUtils.ts';

/**
 * Calculates the next scheduling state for a flashcard based on the learner's recall rating.
 *
 * RULES:
 *
 * 1. SAME-DAY REVIEW GUARD (card.lastReviewedAt === reviewDateStr):
 *    - Prevents cramming / artificial advancement on the same calendar day.
 *    - AGAIN: Resets repetitionCount to 0, intervalDays to 1, scheduled for tomorrow.
 *    - HARD, GOOD, EASY: Repetition count and interval are NOT increased. The existing
 *      interval is preserved (minimum 1 day) and scheduled from the current review date.
 *
 * 2. STANDARD DAILY REVIEWS (card.lastReviewedAt !== reviewDateStr):
 *
 *    A. AGAIN:
 *       - Indicates complete failure or lapse in recall.
 *       - Consecutive repetition count resets to 0.
 *       - Next interval is reset to 1 day (due the following calendar day).
 *
 *    B. HARD:
 *       - Indicates correct recall achieved with significant effort or hesitation.
 *       - Consecutive repetition count remains unchanged (neither increments nor resets).
 *       - Next interval increases by at least 1 day when current interval >= 1:
 *         nextIntervalDays = Math.max(1, currentInterval + 1, Math.round(currentInterval * 1.2))
 *
 *    C. GOOD:
 *       - Indicates successful recall with normal/expected effort.
 *       - Consecutive repetition count increments by 1.
 *       - Base progression ladder:
 *         * Repetition 1 -> 1 day
 *         * Repetition 2 -> 3 days
 *         * Repetition 3 -> 7 days
 *         * Repetition 4+ -> Math.round(currentInterval * 2.0)
 *       - Non-decreasing safeguard:
 *         nextIntervalDays = Math.max(targetInterval, currentInterval)
 *
 *    D. EASY:
 *       - Indicates immediate, effortless recall.
 *       - Consecutive repetition count increments by 1.
 *       - Accelerated progression ladder:
 *         * Repetition 1 -> 3 days
 *         * Repetition 2 -> 7 days
 *         * Repetition 3 -> 14 days
 *         * Repetition 4+ -> Math.round(currentInterval * 2.5)
 *       - Non-decreasing safeguard:
 *         nextIntervalDays = Math.max(targetInterval, currentInterval)
 *
 * Calculation of Next Review Date:
 * - Calculated as `reviewDate + nextIntervalDays` using calendar day arithmetic.
 * - For overdue cards, scheduling advances from the review date (today), NOT the past due date.
 *
 * @param card - Current flashcard state
 * @param recallLevel - Learner's rating ('AGAIN' | 'HARD' | 'GOOD' | 'EASY')
 * @param reviewDateStr - Calendar date of review in 'YYYY-MM-DD' format (defaults to today)
 * @returns SchedulingResult containing updated repetitionCount, intervalDays, and nextReviewDate
 */
export function calculateNextReview(
  card: Pick<Flashcard, 'repetitionCount' | 'intervalDays'> & { lastReviewedAt?: string | null },
  recallLevel: RecallLevel,
  reviewDateStr: string = getTodayLocalDate()
): SchedulingResult {
  if (!isValidDateFormat(reviewDateStr)) {
    throw new Error(
      `Invalid reviewDateStr format. Expected 'YYYY-MM-DD', received: "${reviewDateStr}"`
    );
  }

  // Defensive sanitization: ensure repetitionCount and intervalDays are non-negative integers
  const currentRepetition = Math.max(0, Math.trunc(card.repetitionCount || 0));
  const currentInterval = Math.max(0, Math.trunc(card.intervalDays || 0));

  // Check same-day review guard (calendar-date comparison)
  const isSameDayReview = typeof card.lastReviewedAt === 'string' && card.lastReviewedAt === reviewDateStr;

  if (isSameDayReview) {
    if (recallLevel === 'AGAIN') {
      // Failing a card on the same day resets progress and schedules for tomorrow
      const nextIntervalDays = 1;
      return {
        repetitionCount: 0,
        intervalDays: nextIntervalDays,
        nextReviewDate: addDaysToDate(reviewDateStr, nextIntervalDays),
      };
    }

    // HARD, GOOD, EASY on same calendar day: do not artificially increase repetitions or interval
    const nextIntervalDays = Math.max(1, currentInterval);
    return {
      repetitionCount: currentRepetition,
      intervalDays: nextIntervalDays,
      nextReviewDate: addDaysToDate(reviewDateStr, nextIntervalDays),
    };
  }

  // Standard review on a new day
  let nextRepetitionCount: number;
  let nextIntervalDays: number;

  switch (recallLevel) {
    case 'AGAIN': {
      // Complete lapse: reset repetitions to 0; schedule for 1 day later
      nextRepetitionCount = 0;
      nextIntervalDays = 1;
      break;
    }

    case 'HARD': {
      // Difficult recall: repetition count unchanged; interval increases by at least 1 day
      nextRepetitionCount = currentRepetition;
      nextIntervalDays = Math.max(1, currentInterval + 1, Math.round(currentInterval * 1.2));
      break;
    }

    case 'GOOD': {
      // Standard successful recall: increment repetition count
      nextRepetitionCount = currentRepetition + 1;

      let targetInterval: number;
      if (nextRepetitionCount === 1) {
        targetInterval = 1;
      } else if (nextRepetitionCount === 2) {
        targetInterval = 3;
      } else if (nextRepetitionCount === 3) {
        targetInterval = 7;
      } else {
        targetInterval = Math.round(currentInterval * 2.0);
      }

      // Safeguard: a successful review must never decrease an existing valid interval
      nextIntervalDays = Math.max(targetInterval, currentInterval);
      break;
    }

    case 'EASY': {
      // Effortless recall: increment repetition count with bonus progression
      nextRepetitionCount = currentRepetition + 1;

      let targetInterval: number;
      if (nextRepetitionCount === 1) {
        targetInterval = 3;
      } else if (nextRepetitionCount === 2) {
        targetInterval = 7;
      } else if (nextRepetitionCount === 3) {
        targetInterval = 14;
      } else {
        targetInterval = Math.round(currentInterval * 2.5);
      }

      // Safeguard: a successful review must never decrease an existing valid interval
      nextIntervalDays = Math.max(targetInterval, currentInterval);
      break;
    }

    default: {
      const invalidLevel: never = recallLevel;
      throw new Error(`Unsupported recall level: ${invalidLevel}`);
    }
  }

  const nextReviewDate = addDaysToDate(reviewDateStr, nextIntervalDays);

  return {
    repetitionCount: nextRepetitionCount,
    intervalDays: nextIntervalDays,
    nextReviewDate,
  };
}

/**
 * Applies a review to a flashcard, returning a new immutable copy with updated scheduling fields.
 *
 * @param card - Flashcard to review
 * @param recallLevel - Rating chosen by user
 * @param reviewDateStr - Review date in 'YYYY-MM-DD' format (defaults to today)
 * @returns New Flashcard instance with updated state
 */
export function applyReview(
  card: Flashcard,
  recallLevel: RecallLevel,
  reviewDateStr: string = getTodayLocalDate()
): Flashcard {
  const result = calculateNextReview(card, recallLevel, reviewDateStr);

  return {
    ...card,
    repetitionCount: result.repetitionCount,
    intervalDays: result.intervalDays,
    nextReviewDate: result.nextReviewDate,
    lastReviewedAt: reviewDateStr,
    lastRecallLevel: recallLevel,
  };
}

/**
 * Filters and sorts flashcards that are due for review on or before the given reference date.
 *
 * Sorting order (deterministic):
 * 1. Overdue cards first (ascending by nextReviewDate, oldest first).
 * 2. Unreviewed cards next (lastReviewedAt === null).
 * 3. Stable tie-breaker: ascending alphabetical by card.id.
 *
 * @param cards - Collection of flashcards
 * @param referenceDateStr - Evaluation date in 'YYYY-MM-DD' format (defaults to today)
 * @returns Array of due flashcards in deterministic study order
 */
export function getDueCards(
  cards: Flashcard[],
  referenceDateStr: string = getTodayLocalDate()
): Flashcard[] {
  if (!isValidDateFormat(referenceDateStr)) {
    throw new Error(
      `Invalid referenceDateStr format. Expected 'YYYY-MM-DD', received: "${referenceDateStr}"`
    );
  }

  return cards
    .filter((card) => compareCalendarDates(card.nextReviewDate, referenceDateStr) <= 0)
    .sort((a, b) => {
      // 1. Compare scheduled review date
      const dateComparison = compareCalendarDates(a.nextReviewDate, b.nextReviewDate);
      if (dateComparison !== 0) return dateComparison;

      // 2. Unreviewed cards prioritized next
      const aIsUnreviewed = a.lastReviewedAt === null;
      const bIsUnreviewed = b.lastReviewedAt === null;
      if (aIsUnreviewed && !bIsUnreviewed) return -1;
      if (!aIsUnreviewed && bIsUnreviewed) return 1;

      // 3. Stable tie-breaker
      return a.id.localeCompare(b.id);
    });
}
