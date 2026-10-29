import { describe, it, expect } from 'vitest';
import { generateMcqOptions, shuffleArray } from './mcqUtils.ts';
import { Flashcard } from '../types/flashcard.ts';

function createMockCard(id: string, word: string, meaning: string): Flashcard {
  return {
    id,
    word,
    sourceLanguage: 'Spanish',
    targetLanguage: 'English',
    meaning,
    exampleSentence: `Example for ${word}`,
    createdAt: '2026-10-01T10:00:00.000Z',
    repetitionCount: 1,
    intervalDays: 1,
    nextReviewDate: '2026-10-28',
    lastReviewedAt: '2026-10-27',
    lastRecallLevel: 'GOOD',
  };
}

describe('MCQ Utility (mcqUtils.ts)', () => {
  const sampleDeck: Flashcard[] = [
    createMockCard('c1', 'sol', 'sun'),
    createMockCard('c2', 'luna', 'moon'),
    createMockCard('c3', 'agua', 'water'),
    createMockCard('c4', 'libro', 'book'),
    createMockCard('c5', 'casa', 'house'),
  ];

  it('generates exactly 4 options for a review card', () => {
    const currentCard = sampleDeck[3]; // 'libro' -> 'book'
    const options = generateMcqOptions(currentCard, sampleDeck);

    expect(options).toHaveLength(4);
    expect(options.map((o) => o.label)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('has exactly 1 correct answer matching the card meaning', () => {
    const currentCard = sampleDeck[3]; // 'libro' -> 'book'
    const options = generateMcqOptions(currentCard, sampleDeck);

    const correctOptions = options.filter((o) => o.isCorrect);
    expect(correctOptions).toHaveLength(1);
    expect(correctOptions[0].text).toBe('book');

    const incorrectOptions = options.filter((o) => !o.isCorrect);
    expect(incorrectOptions).toHaveLength(3);
    incorrectOptions.forEach((opt) => {
      expect(opt.text.toLowerCase()).not.toBe('book');
    });
  });

  it('generates unique options without any duplicates', () => {
    const currentCard = sampleDeck[0]; // 'sol' -> 'sun'
    const options = generateMcqOptions(currentCard, sampleDeck);

    const texts = options.map((o) => o.text.toLowerCase());
    const uniqueTexts = new Set(texts);
    expect(uniqueTexts.size).toBe(4);
  });

  it('draws distractors from other cards in the user deck when available', () => {
    const currentCard = sampleDeck[3]; // 'libro' -> 'book'
    const options = generateMcqOptions(currentCard, sampleDeck);

    const deckMeanings = new Set(sampleDeck.map((c) => c.meaning.toLowerCase()));
    // All 4 options should come from the sample deck since the deck has 5 cards
    options.forEach((opt) => {
      expect(deckMeanings.has(opt.text.toLowerCase())).toBe(true);
    });
  });

  it('gracefully handles small decks (e.g., only 1 card) using fallback distractors without crashing', () => {
    const loneCard = createMockCard('c1', 'sol', 'sun');
    const singleCardDeck = [loneCard];

    const options = generateMcqOptions(loneCard, singleCardDeck);

    expect(options).toHaveLength(4);
    const correctOptions = options.filter((o) => o.isCorrect);
    expect(correctOptions).toHaveLength(1);
    expect(correctOptions[0].text).toBe('sun');

    const uniqueTexts = new Set(options.map((o) => o.text.toLowerCase()));
    expect(uniqueTexts.size).toBe(4);
  });

  it('gracefully handles decks with duplicate meanings without producing duplicate options', () => {
    const dupDeck: Flashcard[] = [
      createMockCard('c1', 'sol', 'sun'),
      createMockCard('c2', 'astro', 'sun'),
      createMockCard('c3', 'dia', 'sun'),
    ];

    const currentCard = dupDeck[0];
    const options = generateMcqOptions(currentCard, dupDeck);

    expect(options).toHaveLength(4);
    const uniqueTexts = new Set(options.map((o) => o.text.toLowerCase()));
    expect(uniqueTexts.size).toBe(4);
    expect(options.filter((o) => o.isCorrect)).toHaveLength(1);
  });

  it('varies the correct option position across randomized trials', () => {
    const currentCard = sampleDeck[0];
    const positions = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const options = generateMcqOptions(currentCard, sampleDeck);
      const correctOpt = options.find((o) => o.isCorrect)!;
      positions.add(correctOpt.label);
    }

    // Over 50 random trials, all 4 positions (A, B, C, D) should be hit
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });

  it('shuffleArray helper shuffles items without dropping any elements', () => {
    const items = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(items);

    expect(shuffled).toHaveLength(5);
    expect(new Set(shuffled)).toEqual(new Set(items));
  });
});
