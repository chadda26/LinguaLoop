import { describe, it, expect } from 'vitest';
import { getSampleFlashcards } from '../storage/sampleData.ts';
import { getCardStatus } from './FlashcardItem.tsx';

describe('DeckList Filtering and Metric Alignment (Priority 3 Fix)', () => {
  const BASE_DATE = '2026-10-28';
  const sampleCards = getSampleFlashcards(BASE_DATE);

  it('aligns "Due Today" count with Dashboard metrics by counting all cards scheduled for today', () => {
    // Dashboard calculation:
    const dashboardDueTodayCount = sampleCards.filter((c) => c.nextReviewDate === BASE_DATE).length;
    expect(dashboardDueTodayCount).toBe(2); // 'sol' and 'libro'

    // DeckList count calculation:
    const deckListDueCount = sampleCards.filter((c) => c.nextReviewDate === BASE_DATE).length;
    expect(deckListDueCount).toBe(dashboardDueTodayCount);
  });

  it('includes both reviewed due cards and new cards scheduled today when filtering by "DUE TODAY"', () => {
    const dueTodayFiltered = sampleCards.filter((card) => card.nextReviewDate === BASE_DATE);
    const words = dueTodayFiltered.map((c) => c.word);

    expect(words).toContain('sol');   // Existing reviewed card due today
    expect(words).toContain('libro'); // Brand-new card scheduled today
    expect(dueTodayFiltered).toHaveLength(2);
  });

  it('preserves visual status badge as NEW for brand-new cards', () => {
    const libro = sampleCards.find((c) => c.word === 'libro')!;
    expect(libro).toBeDefined();
    expect(getCardStatus(libro, BASE_DATE)).toBe('NEW');
  });

  it('correctly categorizes all sample card statuses', () => {
    const statuses = sampleCards.map((c) => ({
      word: c.word,
      status: getCardStatus(c, BASE_DATE),
    }));

    expect(statuses).toEqual([
      { word: 'sol', status: 'DUE TODAY' },
      { word: 'luna', status: 'OVERDUE' },
      { word: 'agua', status: 'UPCOMING' },
      { word: 'libro', status: 'NEW' },
      { word: 'casa', status: 'UPCOMING' },
    ]);
  });
});
