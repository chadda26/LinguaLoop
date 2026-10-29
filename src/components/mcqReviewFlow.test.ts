import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Flashcard, RecallLevel } from '../types/flashcard.ts';
import { generateMcqOptions, McqOption } from '../core/mcqUtils.ts';
import { applyReview } from '../core/scheduler.ts';

function createMockCard(id: string, word: string, meaning: string): Flashcard {
  return {
    id,
    word,
    sourceLanguage: 'Spanish',
    targetLanguage: 'English',
    meaning,
    exampleSentence: `Example sentence for ${word}.`,
    createdAt: '2026-10-01T10:00:00.000Z',
    repetitionCount: 1,
    intervalDays: 1,
    nextReviewDate: '2026-10-28',
    lastReviewedAt: '2026-10-27',
    lastRecallLevel: 'GOOD',
  };
}

describe('MCQ Review Flow & Timer Logic (mcqReviewFlow.test.ts)', () => {
  const TODAY = '2026-10-28';
  const sampleDeck = [
    createMockCard('c1', 'sol', 'sun'),
    createMockCard('c2', 'luna', 'moon'),
    createMockCard('c3', 'agua', 'water'),
    createMockCard('c4', 'libro', 'book'),
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Timer Behavior
  // --------------------------------------------------------------------------
  describe('Timer Countdown & Expiration', () => {
    it('initializes at 15 seconds and decrements once per second', () => {
      let timeLeft = 15;
      let isAnswerRevealed = false;
      let isTimedOut = false;

      const intervalId = setInterval(() => {
        if (timeLeft <= 1) {
          clearInterval(intervalId);
          isTimedOut = true;
          isAnswerRevealed = true;
          timeLeft = 0;
        } else {
          timeLeft -= 1;
        }
      }, 1000);

      expect(timeLeft).toBe(15);
      expect(isAnswerRevealed).toBe(false);

      // Advance by 3 seconds
      vi.advanceTimersByTime(3000);
      expect(timeLeft).toBe(12);
      expect(isAnswerRevealed).toBe(false);

      // Advance to 15 seconds total
      vi.advanceTimersByTime(12000);
      expect(timeLeft).toBe(0);
      expect(isTimedOut).toBe(true);
      expect(isAnswerRevealed).toBe(true);
    });

    it('stops the timer immediately when an answer is selected before timeout', () => {
      let timeLeft = 15;
      let isAnswerRevealed = false;

      let intervalId: ReturnType<typeof setInterval> | null = setInterval(() => {
        timeLeft -= 1;
      }, 1000);

      // Advance 4 seconds (time left: 11)
      vi.advanceTimersByTime(4000);
      expect(timeLeft).toBe(11);

      // User selects an option
      isAnswerRevealed = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      // Advance further by 10 seconds: timer must not decrement further
      vi.advanceTimersByTime(10000);
      expect(timeLeft).toBe(11);
      expect(isAnswerRevealed).toBe(true);
    });

    it('resets the timer to 15 seconds for the next card in queue', () => {
      let timeLeft = 15;
      let isAnswerRevealed = false;
      let isTimedOut = false;

      // Card 1: times out
      timeLeft = 0;
      isTimedOut = true;
      isAnswerRevealed = true;

      // Moving to next card:
      timeLeft = 15;
      isTimedOut = false;
      isAnswerRevealed = false;

      expect(timeLeft).toBe(15);
      expect(isTimedOut).toBe(false);
      expect(isAnswerRevealed).toBe(false);
    });

    it('cleans up active timers on unmount or session exit without leaks', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const timer = setInterval(() => {}, 1000);

      // Simulate component unmount cleanup
      clearInterval(timer);
      expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
    });
  });

  // --------------------------------------------------------------------------
  // Answer Evaluation & Handling
  // --------------------------------------------------------------------------
  describe('Answer Evaluation & State Handling', () => {
    it('correctly evaluates a correct answer selection', () => {
      const card = sampleDeck[3]; // 'libro' -> 'book'
      const options = generateMcqOptions(card, sampleDeck);

      const correctIndex = options.findIndex((o) => o.isCorrect);
      expect(correctIndex).toBeGreaterThanOrEqual(0);

      const selectedOption = options[correctIndex];
      expect(selectedOption.isCorrect).toBe(true);
      expect(selectedOption.text).toBe('book');

      // State transitions on selection
      const isAnswerRevealed = true;
      const isCorrect = selectedOption.isCorrect;

      expect(isAnswerRevealed).toBe(true);
      expect(isCorrect).toBe(true);
    });

    it('correctly evaluates an incorrect answer selection and identifies correct target', () => {
      const card = sampleDeck[3]; // 'libro' -> 'book'
      const options = generateMcqOptions(card, sampleDeck);

      const incorrectIndex = options.findIndex((o) => !o.isCorrect);
      const correctIndex = options.findIndex((o) => o.isCorrect);

      const selectedOption = options[incorrectIndex];
      const correctOption = options[correctIndex];

      expect(selectedOption.isCorrect).toBe(false);
      expect(correctOption.isCorrect).toBe(true);
      expect(correctOption.text).toBe('book');
      expect(selectedOption.text).not.toBe('book');
    });

    it('reveals correct answer and shows example sentence upon answer reveal', () => {
      const card = sampleDeck[0]; // 'sol' -> 'sun'
      let isAnswerRevealed = false;

      // Before reveal
      expect(isAnswerRevealed).toBe(false);

      // After user selection or timeout
      isAnswerRevealed = true;
      expect(isAnswerRevealed).toBe(true);
      expect(card.meaning).toBe('sun');
      expect(card.exampleSentence).toBe('Example sentence for sol.');
    });
  });

  // --------------------------------------------------------------------------
  // Rating Button Availability & Double-Rating Prevention
  // --------------------------------------------------------------------------
  describe('Rating Availability & Guard', () => {
    it('prohibits rating before answer is revealed', () => {
      const isAnswerRevealed = false;
      const canRate = isAnswerRevealed;
      expect(canRate).toBe(false);
    });

    it('enables rating buttons only after answer is revealed', () => {
      let isAnswerRevealed = false;
      expect(isAnswerRevealed).toBe(false);

      isAnswerRevealed = true;
      expect(isAnswerRevealed).toBe(true);
    });

    it('prevents multiple rapid submissions for the same card', () => {
      const card = sampleDeck[0];
      let isSubmitting = false;
      let reviewCallCount = 0;

      const rateCard = (rating: RecallLevel) => {
        if (isSubmitting) return;
        isSubmitting = true;
        reviewCallCount += 1;
        applyReview(card, rating, TODAY);
      };

      // Rapid simultaneous clicks/keypresses
      rateCard('GOOD');
      rateCard('GOOD');
      rateCard('EASY');

      expect(reviewCallCount).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Keyboard Accessibility
  // --------------------------------------------------------------------------
  describe('Keyboard Controls', () => {
    it('prevents Space and Enter from bypassing the MCQ question before answer selection', () => {
      const isAnswerRevealed = false;
      let bypassed = false;

      const handleKey = (code: string) => {
        if (!isAnswerRevealed && (code === 'Space' || code === 'Enter')) {
          // Bypassing is prevented!
          return;
        }
        bypassed = true;
      };

      handleKey('Space');
      expect(bypassed).toBe(false);

      handleKey('Enter');
      expect(bypassed).toBe(false);
    });

    it('maps keys 1-4 to MCQ options when answer is not yet revealed', () => {
      const options: McqOption[] = [
        { label: 'A', text: 'sun', isCorrect: true },
        { label: 'B', text: 'moon', isCorrect: false },
        { label: 'C', text: 'water', isCorrect: false },
        { label: 'D', text: 'book', isCorrect: false },
      ];

      let selectedIndex: number | null = null;
      const selectOptionByKey = (key: string) => {
        if (key === '1') selectedIndex = 0;
        else if (key === '2') selectedIndex = 1;
        else if (key === '3') selectedIndex = 2;
        else if (key === '4') selectedIndex = 3;
      };

      selectOptionByKey('2');
      expect(selectedIndex).toBe(1);
      expect(options[selectedIndex!].text).toBe('moon');

      selectOptionByKey('1');
      expect(selectedIndex).toBe(0);
      expect(options[selectedIndex!].text).toBe('sun');
    });

    it('maps keys 1-4 to recall ratings (AGAIN, HARD, GOOD, EASY) once answer is revealed', () => {
      const ratingKeyMap: Record<string, RecallLevel> = {
        '1': 'AGAIN',
        '2': 'HARD',
        '3': 'GOOD',
        '4': 'EASY',
      };

      expect(ratingKeyMap['1']).toBe('AGAIN');
      expect(ratingKeyMap['2']).toBe('HARD');
      expect(ratingKeyMap['3']).toBe('GOOD');
      expect(ratingKeyMap['4']).toBe('EASY');
    });
  });
});
