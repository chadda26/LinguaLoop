/**
 * Academic prototype: LinguaLoop
 * Local persistence layer using browser localStorage with in-memory fallback.
 *
 * DESIGN PRINCIPLES:
 * 1. Single source of truth under a dedicated storage key.
 * 2. Robust validation before admitting any object into memory.
 * 3. Graceful handling of missing or corrupted data.
 * 4. Strict separation of concerns (no scheduling logic inside storage).
 */

import { Flashcard, RecallLevel } from '../types/flashcard.ts';
import { isValidDateFormat } from '../core/dateUtils.ts';
import { getSampleFlashcards } from './sampleData.ts';

/** Dedicated primary storage key */
export const STORAGE_KEY = 'lingualoop_flashcards';

/** Allowed recall levels */
const VALID_RECALL_LEVELS: readonly RecallLevel[] = ['AGAIN', 'HARD', 'GOOD', 'EASY'] as const;

/**
 * Standard Storage interface implementation for in-memory fallback and test environments.
 */
export class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

let activeStorageProvider: Storage | null = null;
const defaultFallbackStorage = new MemoryStorage();

/**
 * Allows explicitly setting the underlying storage provider (useful for testing or custom mocks).
 */
export function setStorageProvider(storage: Storage | null): void {
  activeStorageProvider = storage;
}

/**
 * Safely resolves the storage provider:
 * 1. Explicitly configured provider (if set)
 * 2. window.localStorage (standard browser environment)
 * 3. globalThis.localStorage (if functional)
 * 4. In-memory fallback (if storage is unavailable or disabled)
 */
export function getStorage(): Storage {
  if (activeStorageProvider) {
    return activeStorageProvider;
  }

  try {
    if (
      typeof window !== 'undefined' &&
      window.localStorage &&
      typeof window.localStorage.getItem === 'function' &&
      typeof window.localStorage.setItem === 'function'
    ) {
      return window.localStorage;
    }

    if (
      typeof globalThis !== 'undefined' &&
      globalThis.localStorage &&
      typeof globalThis.localStorage.getItem === 'function' &&
      typeof globalThis.localStorage.setItem === 'function'
    ) {
      return globalThis.localStorage;
    }
  } catch {
    // Restricted environment (e.g. sandbox or security policies)
  }

  return defaultFallbackStorage;
}

/**
 * Validates whether an unknown value is a valid Flashcard conforming to domain rules.
 *
 * @param obj - Unknown object to validate
 * @returns True if obj is a valid Flashcard, false otherwise
 */
export function isValidFlashcard(obj: unknown): obj is Flashcard {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  // Required non-empty string fields
  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) return false;
  if (typeof candidate.word !== 'string' || candidate.word.trim().length === 0) return false;
  if (typeof candidate.sourceLanguage !== 'string' || candidate.sourceLanguage.trim().length === 0) return false;
  if (typeof candidate.targetLanguage !== 'string' || candidate.targetLanguage.trim().length === 0) return false;
  if (typeof candidate.meaning !== 'string' || candidate.meaning.trim().length === 0) return false;
  if (typeof candidate.createdAt !== 'string' || candidate.createdAt.trim().length === 0) return false;

  // Optional exampleSentence
  if (candidate.exampleSentence !== undefined && typeof candidate.exampleSentence !== 'string') {
    return false;
  }

  // Scheduling counts (must be non-negative integers)
  if (
    typeof candidate.repetitionCount !== 'number' ||
    !Number.isInteger(candidate.repetitionCount) ||
    candidate.repetitionCount < 0
  ) {
    return false;
  }

  if (
    typeof candidate.intervalDays !== 'number' ||
    !Number.isInteger(candidate.intervalDays) ||
    candidate.intervalDays < 0
  ) {
    return false;
  }

  // nextReviewDate (must be valid 'YYYY-MM-DD')
  if (typeof candidate.nextReviewDate !== 'string' || !isValidDateFormat(candidate.nextReviewDate)) {
    return false;
  }

  // lastReviewedAt (must be null or valid 'YYYY-MM-DD')
  if (candidate.lastReviewedAt !== null) {
    if (typeof candidate.lastReviewedAt !== 'string' || !isValidDateFormat(candidate.lastReviewedAt)) {
      return false;
    }
  }

  // lastRecallLevel (must be null or one of the 4 valid RecallLevel literals)
  if (candidate.lastRecallLevel !== null) {
    if (
      typeof candidate.lastRecallLevel !== 'string' ||
      !VALID_RECALL_LEVELS.includes(candidate.lastRecallLevel as RecallLevel)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Validates an array of potential flashcard candidates.
 * Discards malformed objects to ensure corrupted records cannot corrupt application state.
 *
 * @param rawData - Unknown parsed data
 * @returns Array of valid Flashcard objects
 */
export function validateFlashcards(rawData: unknown): Flashcard[] {
  if (!Array.isArray(rawData)) {
    return [];
  }

  return rawData.filter((item): item is Flashcard => isValidFlashcard(item));
}

/**
 * Checks whether the storage key has been initialized.
 * Returns true if the key exists in storage (even if set to an empty array "[]"),
 * and false if the key is completely absent (null).
 *
 * @param storageKey - Key to inspect (defaults to STORAGE_KEY)
 * @returns True if storage contains an initialized entry for the key
 */
export function isStorageInitialized(storageKey: string = STORAGE_KEY): boolean {
  const storage = getStorage();
  return storage.getItem(storageKey) !== null;
}

/**
 * Retrieves all stored flashcards from storage.
 * Handles missing keys, empty storage, and malformed JSON gracefully by returning an empty array.
 *
 * @param storageKey - Key to read from (defaults to STORAGE_KEY)
 * @returns Validated Flashcard array
 */
export function getFlashcards(storageKey: string = STORAGE_KEY): Flashcard[] {
  const storage = getStorage();
  const rawJson = storage.getItem(storageKey);

  if (!rawJson || rawJson.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(rawJson);
    return validateFlashcards(parsed);
  } catch (error) {
    console.warn(
      `[LinguaLoop Storage] Corrupted JSON detected in storage key "${storageKey}". Returning empty array.`,
      error
    );
    return [];
  }
}

/**
 * Saves a list of flashcards to storage after validating them.
 *
 * @param cards - Array of cards to save
 * @param storageKey - Key to save to (defaults to STORAGE_KEY)
 */
export function saveFlashcards(cards: Flashcard[], storageKey: string = STORAGE_KEY): void {
  const storage = getStorage();
  const validCards = validateFlashcards(cards);
  storage.setItem(storageKey, JSON.stringify(validCards));
}

/**
 * Adds a new flashcard to storage.
 *
 * @param card - Valid Flashcard to add
 * @param storageKey - Key to write to (defaults to STORAGE_KEY)
 * @returns Updated array of flashcards
 */
export function addFlashcard(card: Flashcard, storageKey: string = STORAGE_KEY): Flashcard[] {
  if (!isValidFlashcard(card)) {
    throw new Error(`Invalid flashcard object. Cannot persist card: ${JSON.stringify(card)}`);
  }

  const existingCards = getFlashcards(storageKey);
  if (existingCards.some((c) => c.id === card.id)) {
    throw new Error(`Flashcard with ID "${card.id}" already exists.`);
  }

  const updatedCards = [...existingCards, card];
  saveFlashcards(updatedCards, storageKey);
  return updatedCards;
}

/**
 * Updates an existing flashcard in storage matching card.id.
 *
 * @param card - Flashcard with updated attributes
 * @param storageKey - Key to write to (defaults to STORAGE_KEY)
 * @returns Updated array of flashcards
 */
export function updateFlashcard(card: Flashcard, storageKey: string = STORAGE_KEY): Flashcard[] {
  if (!isValidFlashcard(card)) {
    throw new Error(`Invalid flashcard object. Cannot update card: ${JSON.stringify(card)}`);
  }

  const existingCards = getFlashcards(storageKey);
  const targetIndex = existingCards.findIndex((c) => c.id === card.id);

  if (targetIndex === -1) {
    throw new Error(`Flashcard with ID "${card.id}" not found.`);
  }

  const updatedCards = [...existingCards];
  updatedCards[targetIndex] = card;
  saveFlashcards(updatedCards, storageKey);
  return updatedCards;
}

/**
 * Deletes a flashcard by id from storage.
 *
 * @param id - Unique card id to remove
 * @param storageKey - Key to write to (defaults to STORAGE_KEY)
 * @returns Updated array of flashcards
 */
export function deleteFlashcard(id: string, storageKey: string = STORAGE_KEY): Flashcard[] {
  const existingCards = getFlashcards(storageKey);
  const updatedCards = existingCards.filter((card) => card.id !== id);
  saveFlashcards(updatedCards, storageKey);
  return updatedCards;
}

/**
 * Resets storage to the default 5 fictional sample flashcards.
 *
 * @param storageKey - Key to write to (defaults to STORAGE_KEY)
 * @param referenceDateStr - Optional base date for scheduling states
 * @returns Array of sample flashcards saved to storage
 */
export function resetToSampleData(
  storageKey: string = STORAGE_KEY,
  referenceDateStr?: string
): Flashcard[] {
  const sampleCards = getSampleFlashcards(referenceDateStr);
  saveFlashcards(sampleCards, storageKey);
  return sampleCards;
}
