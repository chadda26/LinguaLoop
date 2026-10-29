import React from 'react';
import { RecallLevel, Flashcard } from '../types/flashcard.ts';

export interface ReviewLogEntry {
  card: Flashcard;
  rating: RecallLevel;
  nextInterval: number;
}

interface StudySummaryProps {
  logs: ReviewLogEntry[];
  onBackToDashboard: () => void;
}

export const StudySummary: React.FC<StudySummaryProps> = ({
  logs,
  onBackToDashboard,
}) => {
  const totalReviewed = logs.length;

  const againCount = logs.filter((l) => l.rating === 'AGAIN').length;
  const hardCount = logs.filter((l) => l.rating === 'HARD').length;
  const goodCount = logs.filter((l) => l.rating === 'GOOD').length;
  const easyCount = logs.filter((l) => l.rating === 'EASY').length;

  const dueTomorrowCount = logs.filter((l) => l.nextInterval === 1).length;
  const scheduledLaterCount = logs.filter((l) => l.nextInterval > 1).length;

  return (
    <div className="summary-card" role="region" aria-label="Review Session Summary">
      <div className="summary-badge-icon" aria-hidden="true">
        🎉
      </div>

      <h2 className="summary-title">Session Complete!</h2>
      <p className="summary-subtitle">
        Great work! You reviewed {totalReviewed} vocabulary {totalReviewed === 1 ? 'card' : 'cards'}{' '}
        in today's study session.
      </p>

      {/* 4-Stat Recall Breakdown Grid */}
      <div className="summary-stats-grid" aria-label="Review Rating Breakdown">
        <div className="summary-stat-box again">
          <div className="summary-stat-num">{againCount}</div>
          <div className="summary-stat-label">AGAIN</div>
          <span className="summary-stat-sub">Reset to 1d</span>
        </div>

        <div className="summary-stat-box hard">
          <div className="summary-stat-num">{hardCount}</div>
          <div className="summary-stat-label">HARD</div>
          <span className="summary-stat-sub">+1d growth</span>
        </div>

        <div className="summary-stat-box good">
          <div className="summary-stat-num">{goodCount}</div>
          <div className="summary-stat-label">GOOD</div>
          <span className="summary-stat-sub">Standard</span>
        </div>

        <div className="summary-stat-box easy">
          <div className="summary-stat-num">{easyCount}</div>
          <div className="summary-stat-label">EASY</div>
          <span className="summary-stat-sub">Accelerated</span>
        </div>
      </div>

      {/* Spaced Scheduling Forecast */}
      <div className="summary-schedule-info">
        <div className="schedule-info-heading">📅 Spaced Scheduling Forecast</div>
        <p>
          <strong>{dueTomorrowCount}</strong> {dueTomorrowCount === 1 ? 'card' : 'cards'} will be ready for review tomorrow, and{' '}
          <strong>{scheduledLaterCount}</strong> {scheduledLaterCount === 1 ? 'card is' : 'cards are'} scheduled for future study dates.
        </p>
      </div>

      <button
        type="button"
        className="btn-primary summary-return-btn"
        onClick={onBackToDashboard}
        autoFocus
      >
        Return to Dashboard
      </button>
    </div>
  );
};
