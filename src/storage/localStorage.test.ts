import { describe, it, expect, beforeEach } from 'vitest';
import {
  STORAGE_KEY,
  getFlashcards,
  saveFlashcards,
  addFlashcard,
  updateFlashcard,
  deleteFlashcard,
  resetToSampleData,
  isValidFlashcard,
  validateFlashcards,
  setStorageProvider,
  MemoryStorage,
  getStorage,
  isStorageInitialized,
} from './localStorage.ts';
import { getSampleFlashcards } from './sampleData.ts';
import { Flashcard } from '../types/flashcard.ts';

const TEST_KEY = 'lingualoop_test_flashcards';

function createValidCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'card-1',
    word: 'sol',
    sourceLanguage: 'Spanish',
    targetLanguage: 'English',
    meaning: 'sun',
    exampleSentence: 'El sol brilla.',
    createdAt: '2026-10-01T10:00:00.000Z',
    repetitionCount: 1,
    intervalDays: 1,
    nextReviewDate: '2026-10-27',
    lastReviewedAt: '2026-10-26',
    lastRecallLevel: 'GOOD',
    ...overrides,
  };
}

describe('Storage Layer (localStorage.ts)', () => {
  beforeEach(() => {
    // Provide a fresh in-memory storage instance for clean test isolation
    setStorageProvider(new MemoryStorage());
  });

  describe('Validation (isValidFlashcard & validateFlashcards)', () => {
    it('validates a complete, correctly formed flashcard', () => {
      const card = createValidCard();
      expect(isValidFlashcard(card)).toBe(true);
    });

    it('accepts cards with optional exampleSentence omitted or undefined', () => {
      const card = createValidCard();
      delete card.exampleSentence;
      expect(isValidFlashcard(card)).toBe(true);
    });

    it('rejects objects missing required text fields or with empty strings', () => {
      expect(isValidFlashcard(createValidCard({ id: '' }))).toBe(false);
      expect(isValidFlashcard(createValidCard({ word: '   ' }))).toBe(false);
      expect(isValidFlashcard(createValidCard({ sourceLanguage: '' }))).toBe(false);
      expect(isValidFlashcard(createValidCard({ targetLanguage: '' }))).toBe(false);
      expect(isValidFlashcard(createValidCard({ meaning: '' }))).toBe(false);
      expect(isValidFlashcard(createValidCard({ createdAt: '' }))).toBe(false);
    });

    it('rejects invalid numbers for repetitionCount and intervalDays', () => {
      expect(isValidFlashcard(createValidCard({ repetitionCount: -1 }))).toBe(false);
      expect(isValidFlashcard(createValidCard({ repetitionCount: 1.5 }))).toBe(false);
      // @ts-expect-error test invalid string type
      expect(isValidFlashcard(createValidCard({ repetitionCount: '2' }))).toBe(false);
      expect(isValidFlashcard(createValidCard({ intervalDays: -5 }))).toBe(false);
      expect(isValidFlashcard(createValidCard({ intervalDays: 3.14 }))).toBe(false);
    });

    it('rejects invalid or malformed dates (J: Invalid/malformed dates)', () => {
      expect(isValidFlashcard(createValidCard({ nextReviewDate: '2026/10/27' }))).toBe(false);
      expect(isValidFlashcard(createValidCard({ nextReviewDate: '27-10-2026' }))).toBe(false);
      expect(isValidFlashcard(createValidCard({ nextReviewDate: 'invalid-date' }))).toBe(false);
      expect(isValidFlashcard(createValidCard({ lastReviewedAt: 'bad-date' }))).toBe(false);
    });

    it('accepts null for lastReviewedAt on new cards', () => {
      expect(isValidFlashcard(createValidCard({ lastReviewedAt: null, lastRecallLevel: null }))).toBe(true);
    });

    it('rejects invalid RecallLevel literals (I: Invalid RecallLevel)', () => {
      // @ts-expect-error test illegal recall string
      expect(isValidFlashcard(createValidCard({ lastRecallLevel: 'PERFECT' }))).toBe(false);
      // @ts-expect-error test lowercase level
      expect(isValidFlashcard(createValidCard({ lastRecallLevel: 'good' }))).toBe(false);
      // @ts-expect-error test arbitrary string
      expect(isValidFlashcard(createValidCard({ lastRecallLevel: 'SOME_VALUE' }))).toBe(false);
    });

    it('filters out invalid objects in validateFlashcards (H: Invalid flashcard data)', () => {
      const mixedData = [
        createValidCard({ id: 'valid-1' }),
        { id: 'bad-1', word: '' },
        null,
        'string-data',
        createValidCard({ id: 'valid-2' }),
        { id: 'bad-2', nextReviewDate: 'malformed' },
      ];

      const validated = validateFlashcards(mixedData);
      expect(validated).toHaveLength(2);
      expect(validated.map((c) => c.id)).toEqual(['valid-1', 'valid-2']);
    });
  });

  describe('A: Saving and retrieving cards', () => {
    it('uses lingualoop_flashcards as the default storage key', () => {
      expect(STORAGE_KEY).toBe('lingualoop_flashcards');
      const cards = [createValidCard({ id: 'c1' })];
      saveFlashcards(cards); // Uses default STORAGE_KEY
      expect(getFlashcards()).toEqual(cards);
    });

    it('persists cards to storage and reads them back accurately', () => {
      const cards = [createValidCard({ id: 'c1' }), createValidCard({ id: 'c2', word: 'luna' })];
      saveFlashcards(cards, TEST_KEY);

      const retrieved = getFlashcards(TEST_KEY);
      expect(retrieved).toHaveLength(2);
      expect(retrieved).toEqual(cards);
    });
  });

  describe('B: Adding a card', () => {
    it('adds a card to an existing list and persists the updated array', () => {
      const initialCard = createValidCard({ id: 'c1' });
      saveFlashcards([initialCard], TEST_KEY);

      const newCard = createValidCard({ id: 'c2', word: 'agua' });
      const updated = addFlashcard(newCard, TEST_KEY);

      expect(updated).toHaveLength(2);
      expect(getFlashcards(TEST_KEY)).toEqual(updated);
    });

    it('throws when attempting to add a card with duplicate id', () => {
      const card = createValidCard({ id: 'c1' });
      saveFlashcards([card], TEST_KEY);

      expect(() => addFlashcard(card, TEST_KEY)).toThrow(/already exists/);
    });

    it('throws when adding an invalid flashcard', () => {
      // @ts-expect-error test invalid object
      expect(() => addFlashcard({ id: 'invalid' }, TEST_KEY)).toThrow(/Invalid flashcard object/);
    });
  });

  describe('C: Updating a card', () => {
    it('updates an existing card in place and saves changes', () => {
      const card = createValidCard({ id: 'c1', intervalDays: 1 });
      saveFlashcards([card], TEST_KEY);

      const modifiedCard: Flashcard = { ...card, intervalDays: 3, repetitionCount: 2 };
      const updated = updateFlashcard(modifiedCard, TEST_KEY);

      expect(updated[0].intervalDays).toBe(3);
      expect(updated[0].repetitionCount).toBe(2);
      expect(getFlashcards(TEST_KEY)[0].intervalDays).toBe(3);
    });

    it('throws when updating a non-existent card', () => {
      const card = createValidCard({ id: 'missing' });
      expect(() => updateFlashcard(card, TEST_KEY)).toThrow(/not found/);
    });
  });

  describe('D: Deleting a card', () => {
    it('removes the specified card by id', () => {
      const c1 = createValidCard({ id: 'c1' });
      const c2 = createValidCard({ id: 'c2' });
      saveFlashcards([c1, c2], TEST_KEY);

      const updated = deleteFlashcard('c1', TEST_KEY);
      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBe('c2');
      expect(getFlashcards(TEST_KEY)).toHaveLength(1);
    });

    it('safely handles deleting an id that does not exist', () => {
      const c1 = createValidCard({ id: 'c1' });
      saveFlashcards([c1], TEST_KEY);

      const updated = deleteFlashcard('nonexistent', TEST_KEY);
      expect(updated).toHaveLength(1);
    });
  });

  describe('E: Resetting to sample data', () => {
    it('populates storage with 5 sample flashcards and returns them', () => {
      const sampleCards = resetToSampleData(TEST_KEY, '2026-10-27');

      expect(sampleCards).toHaveLength(5);
      expect(getFlashcards(TEST_KEY)).toHaveLength(5);

      const words = sampleCards.map((c) => c.word);
      expect(words).toEqual(['sol', 'luna', 'agua', 'libro', 'casa']);
    });
  });

  describe('F: Empty storage & initialization checks', () => {
    it('returns empty array when storage key is absent (null)', () => {
      getStorage().removeItem(TEST_KEY);
      expect(getFlashcards(TEST_KEY)).toEqual([]);
    });

    it('returns empty array when storage contains empty array string "[]"', () => {
      getStorage().setItem(TEST_KEY, '[]');
      expect(getFlashcards(TEST_KEY)).toEqual([]);
    });

    it('returns empty array when storage item is whitespace only', () => {
      getStorage().setItem(TEST_KEY, '   ');
      expect(getFlashcards(TEST_KEY)).toEqual([]);
    });

    it('reports isStorageInitialized as false when storage key is absent', () => {
      getStorage().removeItem(TEST_KEY);
      expect(isStorageInitialized(TEST_KEY)).toBe(false);
    });

    it('reports isStorageInitialized as true when cards are saved', () => {
      saveFlashcards([createValidCard()], TEST_KEY);
      expect(isStorageInitialized(TEST_KEY)).toBe(true);
    });

    it('reports isStorageInitialized as true when all cards are deleted and deck is empty', () => {
      saveFlashcards([createValidCard({ id: 'c1' })], TEST_KEY);
      deleteFlashcard('c1', TEST_KEY);

      expect(isStorageInitialized(TEST_KEY)).toBe(true);
      expect(getFlashcards(TEST_KEY)).toEqual([]);
    });
  });

  describe('G: Corrupted JSON', () => {
    it('catches invalid JSON gracefully and returns an empty array without throwing', () => {
      getStorage().setItem(TEST_KEY, '{ invalid json syntax !!!');
      expect(getFlashcards(TEST_KEY)).toEqual([]);
    });
  });

  describe('K: Persistence across repeated reads', () => {
    it('consistently returns identical data across sequential calls without side effects', () => {
      const sampleCards = resetToSampleData(TEST_KEY, '2026-10-27');

      const read1 = getFlashcards(TEST_KEY);
      const read2 = getFlashcards(TEST_KEY);
      const read3 = getFlashcards(TEST_KEY);

      expect(read1).toEqual(sampleCards);
      expect(read2).toEqual(sampleCards);
      expect(read3).toEqual(sampleCards);
    });
  });
});

describe('Sample Data (sampleData.ts)', () => {
  const BASE_DATE = '2026-10-27';

  it('produces exactly 5 valid Flashcard instances', () => {
    const samples = getSampleFlashcards(BASE_DATE);
    expect(samples).toHaveLength(5);
    samples.forEach((card) => {
      expect(isValidFlashcard(card)).toBe(true);
    });
  });

  it('includes at least one card due today', () => {
    const samples = getSampleFlashcards(BASE_DATE);
    const dueToday = samples.filter((c) => c.nextReviewDate === BASE_DATE);
    expect(dueToday.length).toBeGreaterThanOrEqual(1);
  });

  it('includes at least one overdue card', () => {
    const samples = getSampleFlashcards(BASE_DATE);
    const overdue = samples.filter((c) => c.nextReviewDate < BASE_DATE);
    expect(overdue.length).toBeGreaterThanOrEqual(1);
    expect(overdue[0].word).toBe('luna');
  });

  it('includes at least one card scheduled for a future date', () => {
    const samples = getSampleFlashcards(BASE_DATE);
    const future = samples.filter((c) => c.nextReviewDate > BASE_DATE);
    expect(future.length).toBeGreaterThanOrEqual(1);
  });

  it('includes at least one brand-new / unreviewed card', () => {
    const samples = getSampleFlashcards(BASE_DATE);
    const unreviewed = samples.filter((c) => c.lastReviewedAt === null && c.repetitionCount === 0);
    expect(unreviewed.length).toBeGreaterThanOrEqual(1);
    expect(unreviewed[0].word).toBe('libro');
  });
});
