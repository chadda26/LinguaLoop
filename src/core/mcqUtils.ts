import { Flashcard } from '../types/flashcard.ts';

export interface McqOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
  isCorrect: boolean;
}

export const MCQ_LABELS = ['A', 'B', 'C', 'D'] as const;

/**
 * Curated fallback distractors for when the user's deck contains fewer than 3
 * other cards with unique meanings. Prevents crashing or duplicate options.
 */
export const DEFAULT_FALLBACK_DISTRACTORS: readonly string[] = [
  'friend',
  'city',
  'morning',
  'night',
  'family',
  'street',
  'school',
  'music',
  'food',
  'time',
  'sky',
  'door',
  'earth',
  'tree',
  'light',
  'water',
  'house',
  'book',
  'sun',
  'moon',
  'flower',
  'mountain',
  'river',
  'star',
  'road',
] as const;

/**
 * Standard Fisher-Yates array shuffle. Accepts an optional custom random function
 * for deterministic unit testing.
 */
export function shuffleArray<T>(items: readonly T[], randomFn: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Generates exactly 4 unique multiple-choice options for a given flashcard.
 *
 * Requirements:
 * - Exactly 1 correct answer (matches currentCard.meaning).
 * - Exactly 3 unique distractors (drawn from other cards in the user's deck if available,
 *   falling back to curated vocabulary words when deck size is insufficient).
 * - Correct answer position is randomized across A, B, C, and D.
 * - Current card's meaning is never duplicated in the options.
 *
 * @param currentCard - Flashcard being reviewed
 * @param allCards - All available cards in the user's deck
 * @param randomFn - Optional pseudo-random number generator for test reproducibility
 * @returns Array of exactly 4 McqOption objects
 */
export function generateMcqOptions(
  currentCard: Flashcard,
  allCards: Flashcard[],
  randomFn: () => number = Math.random
): McqOption[] {
  const targetMeaning = currentCard.meaning.trim();
  const targetLower = targetMeaning.toLowerCase();

  // 1. Gather unique candidate distractors from the user's deck
  const deckDistractorSet = new Set<string>();
  const seenLower = new Set<string>([targetLower]);

  for (const card of allCards) {
    const trimmed = card.meaning.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed.length > 0 && !seenLower.has(lower)) {
      seenLower.add(lower);
      deckDistractorSet.add(trimmed);
    }
  }

  const chosenDistractors: string[] = [];

  // 2. Sample from deck distractors first
  const deckCandidates = Array.from(deckDistractorSet);
  if (deckCandidates.length > 0) {
    const shuffledDeck = shuffleArray(deckCandidates, randomFn);
    for (const d of shuffledDeck) {
      if (chosenDistractors.length >= 3) break;
      chosenDistractors.push(d);
    }
  }

  // 3. If fewer than 3 distractors available, supplement with fallback distractors
  if (chosenDistractors.length < 3) {
    const shuffledFallbacks = shuffleArray(DEFAULT_FALLBACK_DISTRACTORS, randomFn);
    for (const fb of shuffledFallbacks) {
      if (chosenDistractors.length >= 3) break;
      const lower = fb.toLowerCase();
      if (!seenLower.has(lower)) {
        seenLower.add(lower);
        chosenDistractors.push(fb);
      }
    }
  }

  // 4. Assemble 1 correct answer + 3 unique incorrect distractors
  const rawChoices = [
    { text: targetMeaning, isCorrect: true },
    ...chosenDistractors.map((text) => ({ text, isCorrect: false })),
  ];

  // 5. Shuffle the 4 choices so the correct answer is not always at the same position
  const shuffledChoices = shuffleArray(rawChoices, randomFn);

  // 6. Assign final option labels (A, B, C, D)
  return shuffledChoices.map((choice, index) => ({
    label: MCQ_LABELS[index],
    text: choice.text,
    isCorrect: choice.isCorrect,
  }));
}
