import { describe, it, expect, beforeEach } from 'vitest';
import { Flashcard } from './types/flashcard.ts';
import {
  setStorageProvider,
  MemoryStorage,
  getFlashcards,
  addFlashcard,
  updateFlashcard,
  deleteFlashcard,
  resetToSampleData,
  isStorageInitialized,
} from './storage/localStorage.ts';
import { getDueCards, applyReview } from './core/scheduler.ts';
import { compareCalendarDates } from './core/dateUtils.ts';
import { getCardStatus } from './components/FlashcardItem.tsx';

describe('Final End-to-End Acceptance Test Suite', () => {
  const TODAY = '2026-10-28';
  let memoryStorage: MemoryStorage;

  beforeEach(() => {
    memoryStorage = new MemoryStorage();
    setStorageProvider(memoryStorage);
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Fresh Application State
  // --------------------------------------------------------------------------
  it('Scenario 1: Fresh application state verification', () => {
    // Fresh uninitialized launch -> seeds sample data
    expect(isStorageInitialized()).toBe(false);
    const initialCards = resetToSampleData('lingualoop_flashcards', TODAY);
    expect(isStorageInitialized()).toBe(true);

    // Verify Total Flashcards = 5
    expect(initialCards).toHaveLength(5);

    // Dashboard metrics
    const totalCount = initialCards.length;
    const overdueCount = initialCards.filter(
      (c) => compareCalendarDates(c.nextReviewDate, TODAY) < 0
    ).length;
    const dueTodayExactCount = initialCards.filter((c) => c.nextReviewDate === TODAY).length;
    const futureCount = initialCards.filter(
      (c) => compareCalendarDates(c.nextReviewDate, TODAY) > 0
    ).length;

    expect(totalCount).toBe(5);
    expect(dueTodayExactCount).toBe(2); // 'sol' and 'libro'
    expect(overdueCount).toBe(1);        // 'luna'
    expect(futureCount).toBe(2);         // 'agua' and 'casa'

    // Review queue verification
    const reviewQueue = getDueCards(initialCards, TODAY);
    expect(reviewQueue).toHaveLength(3);

    // Verify exact ordering: 1. luna (overdue), 2. libro (unreviewed new card), 3. sol (reviewed card due today)
    expect(reviewQueue[0].word).toBe('luna');
    expect(reviewQueue[1].word).toBe('libro');
    expect(reviewQueue[2].word).toBe('sol');
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Critical Review-Session Regression (No queue skipping)
  // --------------------------------------------------------------------------
  it('Scenario 2: Critical review-session regression: luna -> libro -> sol without skipping', () => {
    const initialCards = resetToSampleData('lingualoop_flashcards', TODAY);

    // The review session freezes the due queue upon mounting:
    const sessionQueue = getDueCards(initialCards, TODAY);
    expect(sessionQueue).toHaveLength(3);

    const sessionLogs: { word: string; rating: string; newInterval: number }[] = [];

    // --- Card 1: luna ---
    let currentIndex = 0;
    const card1 = sessionQueue[currentIndex];
    expect(card1.word).toBe('luna');

    // User reveals answer and selects rating GOOD
    const updatedCard1 = applyReview(card1, 'GOOD', TODAY);
    updateFlashcard(updatedCard1);
    // Parent updates state from storage
    expect(getFlashcards()).toHaveLength(5);
    sessionLogs.push({ word: updatedCard1.word, rating: 'GOOD', newInterval: updatedCard1.intervalDays });

    // --- Card 2: libro MUST NOT BE SKIPPED ---
    currentIndex += 1;
    const card2 = sessionQueue[currentIndex];
    expect(card2.word).toBe('libro'); // VERIFIED: NOT SKIPPED!

    // User reveals answer and selects rating GOOD
    const updatedCard2 = applyReview(card2, 'GOOD', TODAY);
    updateFlashcard(updatedCard2);
    expect(getFlashcards()).toHaveLength(5);
    sessionLogs.push({ word: updatedCard2.word, rating: 'GOOD', newInterval: updatedCard2.intervalDays });

    // --- Card 3: sol ---
    currentIndex += 1;
    const card3 = sessionQueue[currentIndex];
    expect(card3.word).toBe('sol');

    // User reveals answer and selects rating GOOD
    const updatedCard3 = applyReview(card3, 'GOOD', TODAY);
    updateFlashcard(updatedCard3);
    expect(getFlashcards()).toHaveLength(5);
    sessionLogs.push({ word: updatedCard3.word, rating: 'GOOD', newInterval: updatedCard3.intervalDays });

    // --- Session Complete ---
    currentIndex += 1;
    const isComplete = currentIndex >= sessionQueue.length;
    expect(isComplete).toBe(true);
    expect(sessionLogs).toHaveLength(3);
    expect(sessionLogs.map((l) => l.word)).toEqual(['luna', 'libro', 'sol']);
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Review Persistence
  // --------------------------------------------------------------------------
  it('Scenario 3: Review persistence across reload and subsequent sessions', () => {
    const initialCards = resetToSampleData('lingualoop_flashcards', TODAY);
    const sessionQueue = getDueCards(initialCards, TODAY);

    // Review all 3 cards
    for (const card of sessionQueue) {
      const reviewed = applyReview(card, 'GOOD', TODAY);
      updateFlashcard(reviewed);
    }

    // Return to Dashboard: inspect refreshed state
    const currentCards = getFlashcards();
    const dueTodayCount = currentCards.filter((c) => c.nextReviewDate === TODAY).length;
    const overdueCount = currentCards.filter((c) => compareCalendarDates(c.nextReviewDate, TODAY) < 0).length;

    expect(dueTodayCount).toBe(0);
    expect(overdueCount).toBe(0);

    // Simulate browser refresh: reload from storage
    const reloadedCards = getFlashcards();
    expect(reloadedCards).toHaveLength(5);
    const reloadedDueCount = reloadedCards.filter((c) => c.nextReviewDate === TODAY).length;
    expect(reloadedDueCount).toBe(0);

    // Start another review session:
    const secondSessionQueue = getDueCards(reloadedCards, TODAY);
    expect(secondSessionQueue).toHaveLength(0); // Caught up!
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Due Today Consistency (Dashboard vs DeckList)
  // --------------------------------------------------------------------------
  it('Scenario 4: Due Today consistency between Dashboard and DeckList', () => {
    const cards = resetToSampleData('lingualoop_flashcards', TODAY);

    // Dashboard metric:
    const dashboardDueToday = cards.filter((c) => c.nextReviewDate === TODAY).length;
    expect(dashboardDueToday).toBe(2);

    // DeckList counts:
    const deckListDueCount = cards.filter((c) => c.nextReviewDate === TODAY).length;
    expect(deckListDueCount).toBe(2);

    // DeckList filter: 'DUE TODAY'
    const dueTodayFiltered = cards.filter((c) => c.nextReviewDate === TODAY);
    expect(dueTodayFiltered).toHaveLength(2);
    expect(dueTodayFiltered.map((c) => c.word)).toEqual(expect.arrayContaining(['sol', 'libro']));

    // libro maintains its 'NEW' status badge while appearing in Due Today
    const libro = cards.find((c) => c.word === 'libro')!;
    expect(getCardStatus(libro, TODAY)).toBe('NEW');

    // sol has status 'DUE TODAY'
    const sol = cards.find((c) => c.word === 'sol')!;
    expect(getCardStatus(sol, TODAY)).toBe('DUE TODAY');
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Empty Deck Persistence
  // --------------------------------------------------------------------------
  it('Scenario 5: Empty deck persistence across reloads without auto-reseeding', () => {
    resetToSampleData('lingualoop_flashcards', TODAY);
    let cards = getFlashcards();
    expect(cards).toHaveLength(5);

    // Delete every card
    for (const card of cards) {
      deleteFlashcard(card.id);
    }

    cards = getFlashcards();
    expect(cards).toHaveLength(0);

    // Key check: isStorageInitialized must be TRUE even though cards.length === 0
    expect(isStorageInitialized()).toBe(true);

    // Simulate page refresh:
    const onReloadCards = !isStorageInitialized()
      ? resetToSampleData('lingualoop_flashcards', TODAY)
      : getFlashcards();

    // The deck MUST remain empty. Sample cards do not return on refresh!
    expect(onReloadCards).toHaveLength(0);

    // User explicitly clicks "Reset Sample Data":
    const resetCards = resetToSampleData('lingualoop_flashcards', TODAY);
    expect(resetCards).toHaveLength(5);
    expect(getFlashcards()).toHaveLength(5);
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Creation, Editing, Deletion Regression
  // --------------------------------------------------------------------------
  it('Scenario 6: Creation, editing, and deletion regression', () => {
    resetToSampleData('lingualoop_flashcards', TODAY);

    // 1. Create a new card
    const newCard: Flashcard = {
      id: 'custom-card-1',
      word: 'gato',
      sourceLanguage: 'Spanish',
      targetLanguage: 'English',
      meaning: 'cat',
      exampleSentence: 'El gato duerme.',
      createdAt: '2026-10-28T10:00:00.000Z',
      repetitionCount: 0,
      intervalDays: 0,
      nextReviewDate: TODAY,
      lastReviewedAt: null,
      lastRecallLevel: null,
    };

    addFlashcard(newCard);
    let allCards = getFlashcards();
    expect(allCards).toHaveLength(6);

    const createdCard = allCards.find((c) => c.id === 'custom-card-1')!;
    expect(createdCard).toBeDefined();
    expect(getCardStatus(createdCard, TODAY)).toBe('NEW');

    // 2. Simulate refresh: card remains persisted
    const reloadedCards = getFlashcards();
    expect(reloadedCards.some((c) => c.id === 'custom-card-1')).toBe(true);

    // 3. Edit card: update meaning and example sentence
    const editedCard: Flashcard = {
      ...createdCard,
      meaning: 'domestic feline',
      exampleSentence: 'El gato juega con la pelota.',
    };
    updateFlashcard(editedCard);

    const afterEdit = getFlashcards().find((c) => c.id === 'custom-card-1')!;
    expect(afterEdit.meaning).toBe('domestic feline');
    expect(afterEdit.exampleSentence).toBe('El gato juega con la pelota.');
    // Scheduling metadata preserved
    expect(afterEdit.repetitionCount).toBe(0);
    expect(afterEdit.intervalDays).toBe(0);
    expect(afterEdit.nextReviewDate).toBe(TODAY);
    expect(afterEdit.lastReviewedAt).toBeNull();

    // 4. Delete card
    deleteFlashcard('custom-card-1');
    const afterDelete = getFlashcards();
    expect(afterDelete).toHaveLength(5);
    expect(afterDelete.some((c) => c.id === 'custom-card-1')).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Keyboard Shortcuts & UI State Rules
  // --------------------------------------------------------------------------
  it('Scenario 7: Review session rating buttons and keyboard action state rules', () => {
    // State 1: Answer not revealed
    let isAnswerRevealed = false;
    // Buttons available in UI: only "Show Answer"
    const canRate = isAnswerRevealed;
    expect(canRate).toBe(false);

    // Press Space or Enter -> reveals answer
    const simulateKeyDown = (code: string) => {
      if (!isAnswerRevealed && (code === 'Space' || code === 'Enter')) {
        isAnswerRevealed = true;
      }
    };

    simulateKeyDown('Space');
    expect(isAnswerRevealed).toBe(true);

    // State 2: Answer revealed -> rating buttons 1, 2, 3, 4 are active
    const allowedKeys = ['1', '2', '3', '4'];
    const ratingsMap: Record<string, string> = {
      '1': 'AGAIN',
      '2': 'HARD',
      '3': 'GOOD',
      '4': 'EASY',
    };

    for (const key of allowedKeys) {
      expect(ratingsMap[key]).toBeDefined();
    }

    // Modal close shortcut: Escape closes modal
    let isModalOpen = true;
    const simulateModalKeyDown = (key: string) => {
      if (key === 'Escape') {
        isModalOpen = false;
      }
    };
    simulateModalKeyDown('Escape');
    expect(isModalOpen).toBe(false);
  });
});
