/**
 * Academic prototype: LinguaLoop
 * Core domain types for the spaced-repetition flashcard module.
 */

/**
 * 4 distinct learner recall levels reflecting the ease of retrieval during a review.
 */
export type RecallLevel = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

/**
 * Flashcard model representing a vocabulary card and its current scheduling metadata.
 */
export interface Flashcard {
  /** Unique card identifier */
  id: string;
  /** Vocabulary word or phrase */
  word: string;
  /** Source language of the word (e.g. "Spanish") */
  sourceLanguage: string;
  /** Target language of the translation (e.g. "English") */
  targetLanguage: string;
  /** Meaning or translation of the vocabulary word */
  meaning: string;
  /** Optional contextual example sentence */
  exampleSentence?: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;

  // Scheduling metadata
  /** Consecutive successful reviews (resets to 0 on AGAIN) */
  repetitionCount: number;
  /** Current scheduled interval in calendar days */
  intervalDays: number;
  /** Scheduled next review date in 'YYYY-MM-DD' calendar format */
  nextReviewDate: string;
  /** ISO 8601 timestamp when last reviewed, or null if unreviewed */
  lastReviewedAt: string | null;
  /** Most recent recall rating selected by the learner */
  lastRecallLevel: RecallLevel | null;
}

/**
 * Output produced by the scheduling algorithm upon reviewing a card.
 */
export interface SchedulingResult {
  /** Updated consecutive successful review count */
  repetitionCount: number;
  /** Next interval in calendar days */
  intervalDays: number;
  /** Next review date formatted as 'YYYY-MM-DD' */
  nextReviewDate: string;
}
