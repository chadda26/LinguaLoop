import React from 'react';
import { Flashcard } from '../types/flashcard.ts';
import { compareCalendarDates, getTodayLocalDate } from '../core/dateUtils.ts';

interface FlashcardItemProps {
  card: Flashcard;
  onEdit: (card: Flashcard) => void;
  onDelete: (id: string) => void;
}

export type CardStatus = 'NEW' | 'OVERDUE' | 'DUE TODAY' | 'UPCOMING';

export function getCardStatus(card: Flashcard, referenceDateStr: string = getTodayLocalDate()): CardStatus {
  if (card.lastReviewedAt === null && card.repetitionCount === 0) {
    return 'NEW';
  }
  const cmp = compareCalendarDates(card.nextReviewDate, referenceDateStr);
  if (cmp < 0) {
    return 'OVERDUE';
  }
  if (cmp === 0) {
    return 'DUE TODAY';
  }
  return 'UPCOMING';
}

export const FlashcardItem: React.FC<FlashcardItemProps> = ({
  card,
  onEdit,
  onDelete,
}) => {
  const status = getCardStatus(card);

  const getStatusClass = (st: CardStatus) => {
    switch (st) {
      case 'NEW':
        return 'new';
      case 'OVERDUE':
        return 'overdue';
      case 'DUE TODAY':
        return 'due-today';
      case 'UPCOMING':
        return 'upcoming';
    }
  };

  const handleDeleteClick = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the flashcard "${card.word}"?\nThis action cannot be undone.`
    );
    if (confirmed) {
      onDelete(card.id);
    }
  };

  return (
    <article className="flashcard-card" aria-label={`Flashcard: ${card.word}`}>
      <div>
        <div className="card-header-row">
          <span className="language-pill" title="Language Direction">
            {card.sourceLanguage} → {card.targetLanguage}
          </span>
          <span className={`status-badge ${getStatusClass(status)}`}>
            {status}
          </span>
        </div>

        <h3 className="card-word">{card.word}</h3>
        <p className="card-meaning">{card.meaning}</p>

        {card.exampleSentence && (
          <blockquote className="card-example">
            <span className="quote-icon" aria-hidden="true">“</span>
            {card.exampleSentence}
            <span className="quote-icon" aria-hidden="true">”</span>
          </blockquote>
        )}
      </div>

      <div className="card-footer-section">
        <div className="card-meta-row">
          <div className="scheduling-metrics">
            <span className="meta-item">
              Due: <strong>{card.nextReviewDate}</strong>
            </span>
            <span className="meta-separator">•</span>
            <span className="meta-item" title="Current scheduled interval">
              Interval: <strong>{card.intervalDays}d</strong>
            </span>
            <span className="meta-separator">•</span>
            <span className="meta-item" title="Consecutive successful repetitions">
              Rep: <strong>{card.repetitionCount}</strong>
            </span>
          </div>

          <div className="card-actions" role="group" aria-label="Card actions">
            <button
              type="button"
              className="btn-icon edit"
              onClick={() => onEdit(card)}
              title={`Edit flashcard "${card.word}"`}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn-icon delete"
              onClick={handleDeleteClick}
              title={`Delete flashcard "${card.word}"`}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
