import React from 'react';
import { Flashcard } from '../types/flashcard.ts';
import { compareCalendarDates, getTodayLocalDate } from '../core/dateUtils.ts';
import { getDueCards } from '../core/scheduler.ts';

interface DashboardProps {
  cards: Flashcard[];
  onStartReviewClick: () => void;
  onNavigateToDeck: () => void;
  onCreateCardClick: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  cards,
  onStartReviewClick,
  onNavigateToDeck,
  onCreateCardClick,
}) => {
  const todayStr = getTodayLocalDate();

  // Metrics calculation using core date and scheduler utilities
  const totalCount = cards.length;
  const overdueCount = cards.filter(
    (c) => compareCalendarDates(c.nextReviewDate, todayStr) < 0
  ).length;
  const dueTodayExactCount = cards.filter((c) => c.nextReviewDate === todayStr).length;
  const futureCount = cards.filter(
    (c) => compareCalendarDates(c.nextReviewDate, todayStr) > 0
  ).length;

  // Active study queue (overdue + cards due today + unreviewed due today)
  const totalDueForStudy = getDueCards(cards, todayStr).length;

  return (
    <div className="dashboard-container">
      {/* Primary Hero Section with Prominent CTA */}
      <section className="dashboard-hero">
        <div className="hero-text">
          <div className="hero-badge">Spaced Repetition System</div>
          <h1>Ready for your daily study session?</h1>
          <p>
            {totalDueForStudy > 0
              ? `You have ${totalDueForStudy} vocabulary card${totalDueForStudy === 1 ? '' : 's'} waiting for spaced review today.`
              : 'You are completely caught up! No flashcards are due for review today.'}
          </p>
        </div>

        <div className="hero-cta-wrapper">
          <button
            type="button"
            className={`start-review-btn ${totalDueForStudy === 0 ? 'caught-up' : ''}`}
            onClick={onStartReviewClick}
            aria-label={`Start today's review session with ${totalDueForStudy} cards`}
          >
            <span>{totalDueForStudy > 0 ? "Start Today's Review" : "Practice Review Queue"}</span>
            <span className="cta-count-pill" aria-hidden="true">
              {totalDueForStudy}
            </span>
          </button>
          {overdueCount > 0 && (
            <div className="overdue-notice">
              ⚠️ Includes {overdueCount} overdue card{overdueCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </section>

      {/* Main Statistics Grid */}
      <section className="metrics-grid" aria-label="Deck Metrics Overview">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Flashcards</span>
            <span className="metric-icon" aria-hidden="true">📚</span>
          </div>
          <span className="metric-value">{totalCount}</span>
          <span className="metric-caption">All cards in your active collection</span>
        </div>

        <div className="metric-card due-today">
          <div className="metric-header">
            <span className="metric-title">Due Today</span>
            <span className="metric-icon" aria-hidden="true">⏳</span>
          </div>
          <span className="metric-value">{dueTodayExactCount}</span>
          <span className="metric-caption">Scheduled for calendar review today</span>
        </div>

        <div className="metric-card overdue">
          <div className="metric-header">
            <span className="metric-title">Overdue Cards</span>
            <span className="metric-icon" aria-hidden="true">🚨</span>
          </div>
          <span className="metric-value">{overdueCount}</span>
          <span className="metric-caption">Past review date (prioritized first)</span>
        </div>

        <div className="metric-card upcoming">
          <div className="metric-header">
            <span className="metric-title">Future Reviews</span>
            <span className="metric-icon" aria-hidden="true">🌱</span>
          </div>
          <span className="metric-value">{futureCount}</span>
          <span className="metric-caption">Safely spaced into future days</span>
        </div>
      </section>

      {/* Quick Action Navigation Bar */}
      <section className="quick-actions-bar">
        <div className="quick-actions-title">Deck Management</div>
        <div className="quick-actions-btns">
          <button
            type="button"
            className="btn-primary"
            onClick={onCreateCardClick}
          >
            <span>+</span> Add New Flashcard
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onNavigateToDeck}
          >
            Browse Full Deck ({totalCount})
          </button>
        </div>
      </section>
    </div>
  );
};
