import React, { useState, useMemo } from 'react';
import { Flashcard } from '../types/flashcard.ts';
import { FlashcardItem, getCardStatus, CardStatus } from './FlashcardItem.tsx';
import { getTodayLocalDate } from '../core/dateUtils.ts';

interface DeckListProps {
  cards: Flashcard[];
  onEditCard: (card: Flashcard) => void;
  onDeleteCard: (id: string) => void;
  onCreateCardClick: () => void;
}

export const DeckList: React.FC<DeckListProps> = ({
  cards,
  onEditCard,
  onDeleteCard,
  onCreateCardClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | CardStatus>('ALL');
  const todayStr = getTodayLocalDate();

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // 1. Text search across word, meaning, source language, target language, and example sentence
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        card.word.toLowerCase().includes(q) ||
        card.meaning.toLowerCase().includes(q) ||
        card.sourceLanguage.toLowerCase().includes(q) ||
        card.targetLanguage.toLowerCase().includes(q) ||
        (card.exampleSentence && card.exampleSentence.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Status filter
      if (selectedFilter === 'ALL') return true;
      // "DUE TODAY" includes all cards scheduled for review on today's calendar date,
      // matching the Dashboard "Due Today" metric (both existing cards and new cards).
      if (selectedFilter === 'DUE TODAY') {
        return card.nextReviewDate === todayStr;
      }
      const status = getCardStatus(card, todayStr);
      return status === selectedFilter;
    });
  }, [cards, searchQuery, selectedFilter, todayStr]);

  // Compute status counts for filter labels
  const counts = useMemo(() => {
    let overdueCount = 0;
    let upcomingCount = 0;
    let newCount = 0;

    cards.forEach((card) => {
      const s = getCardStatus(card, todayStr);
      if (s === 'OVERDUE') overdueCount++;
      else if (s === 'UPCOMING') upcomingCount++;
      else if (s === 'NEW') newCount++;
    });

    // Match Dashboard "Due Today" definition: any card whose nextReviewDate is today
    const dueCount = cards.filter((c) => c.nextReviewDate === todayStr).length;

    return { dueCount, overdueCount, upcomingCount, newCount };
  }, [cards, todayStr]);

  return (
    <div className="deck-container">
      <div className="deck-header-row">
        <div>
          <h2>My Flashcards</h2>
          <p className="deck-subtitle">
            Manage your vocabulary deck, inspect review scheduling, or search words.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={onCreateCardClick}
        >
          <span>+</span> Add Flashcard
        </button>
      </div>

      <div className="deck-toolbar">
        <div className="toolbar-search-filter">
          <div className="search-input-wrapper">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              className="search-input"
              placeholder="Search words, meanings, or languages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search flashcards"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search query"
              >
                ✕
              </button>
            )}
          </div>

          <select
            className="filter-select"
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as 'ALL' | CardStatus)}
            aria-label="Filter cards by status"
          >
            <option value="ALL">All Statuses ({cards.length})</option>
            <option value="DUE TODAY">Due Today ({counts.dueCount})</option>
            <option value="OVERDUE">Overdue ({counts.overdueCount})</option>
            <option value="UPCOMING">Upcoming ({counts.upcomingCount})</option>
            <option value="NEW">New ({counts.newCount})</option>
          </select>
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">📭</div>
          <h3>No flashcards found</h3>
          <p>
            {cards.length === 0
              ? 'Your vocabulary deck is currently empty. Add your first card or restore the sample cards.'
              : 'No cards match the active search query or status filter.'}
          </p>
          {cards.length === 0 ? (
            <button
              type="button"
              className="btn-primary"
              onClick={onCreateCardClick}
            >
              + Create First Flashcard
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedFilter('ALL');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="cards-grid">
          {filteredCards.map((card) => (
            <FlashcardItem
              key={card.id}
              card={card}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
            />
          ))}
        </div>
      )}
    </div>
  );
};
