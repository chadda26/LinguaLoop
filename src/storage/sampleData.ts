/**
 * Academic prototype: LinguaLoop
 * Fictional educational sample data.
 *
 * NOTE:
 * - Purely fictional and pedagogical demonstration entries.
 * - Zero copyrighted commercial word lists or external translation APIs used.
 * - Configured with varied scheduling states to demonstrate daily review filtering.
 */

import { Flashcard } from '../types/flashcard.ts';
import { addDaysToDate, getTodayLocalDate } from '../core/dateUtils.ts';

/**
 * Generates 5 fictional educational sample flashcards with representative scheduling states:
 * 1. Due today
 * 2. Overdue
 * 3. Scheduled in the future (standard progress)
 * 4. Brand-new / unreviewed
 * 5. Scheduled in the future (accelerated EASY progress)
 *
 * @param referenceDateStr - Reference calendar date (defaults to today in 'YYYY-MM-DD')
 * @returns Array of 5 valid Flashcard instances
 */
export function getSampleFlashcards(referenceDateStr: string = getTodayLocalDate()): Flashcard[] {
  return [
    {
      id: 'sample-card-1-sol',
      word: 'sol',
      sourceLanguage: 'Spanish',
      targetLanguage: 'English',
      meaning: 'sun',
      exampleSentence: 'El sol brilla en el cielo despejado.',
      createdAt: '2026-10-01T08:00:00.000Z',
      repetitionCount: 1,
      intervalDays: 1,
      nextReviewDate: referenceDateStr, // Due today
      lastReviewedAt: addDaysToDate(referenceDateStr, -1),
      lastRecallLevel: 'GOOD',
    },
    {
      id: 'sample-card-2-luna',
      word: 'luna',
      sourceLanguage: 'Spanish',
      targetLanguage: 'English',
      meaning: 'moon',
      exampleSentence: 'La luna ilumina la noche tranquila.',
      createdAt: '2026-09-20T08:00:00.000Z',
      repetitionCount: 2,
      intervalDays: 3,
      nextReviewDate: addDaysToDate(referenceDateStr, -2), // 2 days overdue
      lastReviewedAt: addDaysToDate(referenceDateStr, -5),
      lastRecallLevel: 'GOOD',
    },
    {
      id: 'sample-card-3-agua',
      word: 'agua',
      sourceLanguage: 'Spanish',
      targetLanguage: 'English',
      meaning: 'water',
      exampleSentence: 'Bebo un vaso de agua fresca cada mañana.',
      createdAt: '2026-10-10T08:00:00.000Z',
      repetitionCount: 3,
      intervalDays: 7,
      nextReviewDate: addDaysToDate(referenceDateStr, 4), // Due in 4 days (future)
      lastReviewedAt: addDaysToDate(referenceDateStr, -3),
      lastRecallLevel: 'GOOD',
    },
    {
      id: 'sample-card-4-libro',
      word: 'libro',
      sourceLanguage: 'Spanish',
      targetLanguage: 'English',
      meaning: 'book',
      exampleSentence: 'Leo un libro interesante en la biblioteca.',
      createdAt: '2026-10-25T08:00:00.000Z',
      repetitionCount: 0,
      intervalDays: 0,
      nextReviewDate: referenceDateStr, // Unreviewed card due today
      lastReviewedAt: null,
      lastRecallLevel: null,
    },
    {
      id: 'sample-card-5-casa',
      word: 'casa',
      sourceLanguage: 'Spanish',
      targetLanguage: 'English',
      meaning: 'house',
      exampleSentence: 'Mi casa tiene un jardín pequeño.',
      createdAt: '2026-10-05T08:00:00.000Z',
      repetitionCount: 2,
      intervalDays: 7,
      nextReviewDate: addDaysToDate(referenceDateStr, 5), // Due in 5 days (future)
      lastReviewedAt: addDaysToDate(referenceDateStr, -2),
      lastRecallLevel: 'EASY',
    },
  ];
}
