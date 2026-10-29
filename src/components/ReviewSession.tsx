import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Flashcard, RecallLevel } from '../types/flashcard.ts';
import { getDueCards, calculateNextReview, applyReview } from '../core/scheduler.ts';
import { getTodayLocalDate } from '../core/dateUtils.ts';
import { updateFlashcard } from '../storage/localStorage.ts';
import { generateMcqOptions, McqOption } from '../core/mcqUtils.ts';
import { StudySummary, ReviewLogEntry } from './StudySummary.tsx';

interface ReviewSessionProps {
  cards: Flashcard[];
  onCardUpdated: (updatedCard: Flashcard) => void;
  onExit: () => void;
}

export const ReviewSession: React.FC<ReviewSessionProps> = ({
  cards,
  onCardUpdated,
  onExit,
}) => {
  const todayStr = getTodayLocalDate();

  // Freeze the daily review queue for the entire lifetime of the active session.
  // This prevents queue shrinking and subsequent card skipping when card ratings
  // advance nextReviewDate into the future and trigger parent state updates.
  const [sessionQueue] = useState<Flashcard[]>(() => getDueCards(cards, todayStr));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [sessionLogs, setSessionLogs] = useState<ReviewLogEntry[]>([]);

  // Guard to prevent accidental double rating on fast repeated key presses or clicks
  const isSubmittingRating = useRef(false);

  const isComplete = currentIndex >= sessionQueue.length;
  const currentCard = !isComplete ? sessionQueue[currentIndex] : null;

  // Generate 4 MCQ options once per card (1 correct + 3 unique distractors)
  const mcqOptions: McqOption[] = useMemo(() => {
    if (!currentCard) return [];
    return generateMcqOptions(currentCard, cards);
  }, [currentCard?.id]);

  // 15-second countdown timer for the active card
  useEffect(() => {
    // Stop / do not start timer if answer is revealed, session completed, or no card
    if (isAnswerRevealed || !currentCard || isComplete) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          setIsTimedOut(true);
          setIsAnswerRevealed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentIndex, isAnswerRevealed, currentCard, isComplete]);

  // Handle MCQ option selection by user
  const handleSelectOption = (index: number) => {
    if (isAnswerRevealed || !mcqOptions[index]) {
      return;
    }
    setSelectedOptionIndex(index);
    setIsAnswerRevealed(true);
  };

  // Keyboard accessibility:
  // Before reveal: 1-4 selects MCQ options (Enter/Space does not bypass MCQ)
  // After reveal: 1 = AGAIN, 2 = HARD, 3 = GOOD, 4 = EASY
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (!isAnswerRevealed) {
        // Prevent Space / Enter from bypassing the MCQ question
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          return;
        }

        // Keys 1, 2, 3, 4 select options A, B, C, D
        if (e.key === '1') {
          e.preventDefault();
          handleSelectOption(0);
        } else if (e.key === '2') {
          e.preventDefault();
          handleSelectOption(1);
        } else if (e.key === '3') {
          e.preventDefault();
          handleSelectOption(2);
        } else if (e.key === '4') {
          e.preventDefault();
          handleSelectOption(3);
        }
      } else if (currentCard) {
        // After answer is revealed, keys 1-4 trigger spaced-repetition ratings
        if (e.key === '1') {
          e.preventDefault();
          handleRatingSelect('AGAIN');
        } else if (e.key === '2') {
          e.preventDefault();
          handleRatingSelect('HARD');
        } else if (e.key === '3') {
          e.preventDefault();
          handleRatingSelect('GOOD');
        } else if (e.key === '4') {
          e.preventDefault();
          handleRatingSelect('EASY');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerRevealed, currentCard, mcqOptions]);

  // 1. Empty Review Queue
  if (sessionQueue.length === 0) {
    return (
      <div className="empty-state review-empty-state">
        <div className="empty-state-icon" aria-hidden="true">
          🎉
        </div>
        <h2>You're all caught up!</h2>
        <p>
          No cards are due for review today. Check back tomorrow for your next spaced repetition
          milestone or add new vocabulary cards to your collection.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={onExit}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // 2. Session Complete (All cards reviewed)
  if (isComplete) {
    return (
      <StudySummary
        logs={sessionLogs}
        onBackToDashboard={onExit}
      />
    );
  }

  if (!currentCard) return null;

  const totalCards = sessionQueue.length;
  const remainingCount = totalCards - currentIndex;
  const progressPercent = Math.round((currentIndex / totalCards) * 100);

  // Dynamically calculate intervals for all 4 buttons using the scheduler
  const againPrediction = calculateNextReview(currentCard, 'AGAIN', todayStr);
  const hardPrediction = calculateNextReview(currentCard, 'HARD', todayStr);
  const goodPrediction = calculateNextReview(currentCard, 'GOOD', todayStr);
  const easyPrediction = calculateNextReview(currentCard, 'EASY', todayStr);

  const formatIntervalLabel = (days: number): string => {
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  };

  const handleRatingSelect = (rating: RecallLevel) => {
    if (isSubmittingRating.current || !currentCard) {
      return;
    }
    isSubmittingRating.current = true;

    // 1. Calculate updated scheduling state using scheduler.applyReview
    const updatedCard = applyReview(currentCard, rating, todayStr);

    // 2. Persist updated card through storage adapter
    updateFlashcard(updatedCard);

    // 3. Inform parent component to keep global state in sync
    onCardUpdated(updatedCard);

    // 4. Record to session logs
    const entry: ReviewLogEntry = {
      card: updatedCard,
      rating,
      nextInterval: updatedCard.intervalDays,
    };
    setSessionLogs((prev) => [...prev, entry]);

    // 5. Provide brief feedback and advance to next card
    const feedbackText = `Recorded ${rating}: next review in ${formatIntervalLabel(updatedCard.intervalDays)}`;
    setFeedbackMessage(feedbackText);

    // 6. Reset card-level MCQ and timer states for the fresh card
    setIsAnswerRevealed(false);
    setSelectedOptionIndex(null);
    setIsTimedOut(false);
    setTimeLeft(15);
    setCurrentIndex((prev) => prev + 1);

    setTimeout(() => {
      isSubmittingRating.current = false;
    }, 50);
  };

  const selectedOption = selectedOptionIndex !== null ? mcqOptions[selectedOptionIndex] : null;

  return (
    <div className="review-container" aria-live="polite">
      {/* Top Header & Progress Indicators */}
      <div className="review-top-bar">
        <div className="review-counter-group">
          <span className="review-counter">
            Card {currentIndex + 1} of {totalCards}
          </span>
          <span className="review-remaining-tag">
            {remainingCount} {remainingCount === 1 ? 'card' : 'cards'} remaining
          </span>
        </div>

        <button
          type="button"
          className="review-exit-btn"
          onClick={onExit}
          title="Exit review session and return to Dashboard"
        >
          ✕ Exit Session
        </button>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Daily review session progress"
      >
        <div
          className="progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {feedbackMessage && (
        <div className="rating-feedback-badge" role="status">
          ✓ {feedbackMessage}
        </div>
      )}

      {/* Main Flashcard Card */}
      <div className="review-card">
        {/* FRONT: Prompt Area (Word & Languages) */}
        <div className="review-prompt-area">
          <div className="review-lang-wrapper">
            <span className="review-lang-pill">
              {currentCard.sourceLanguage} → {currentCard.targetLanguage}
            </span>
          </div>

          <h2 className="review-word">{currentCard.word}</h2>
          <p className="review-prompt-instruction">
            What does "{currentCard.word}" mean?
          </p>
        </div>

        {/* 15-Second Timer Bar */}
        <div className="mcq-timer-container">
          <div className="mcq-timer-header">
            <div className={`mcq-timer-badge ${timeLeft <= 5 && !isAnswerRevealed ? 'urgent' : ''}`}>
              <span className="mcq-timer-icon" aria-hidden="true">⏱</span>
              <span className="mcq-timer-text">
                {isAnswerRevealed
                  ? isTimedOut
                    ? "Time's up!"
                    : `Answered in ${15 - timeLeft}s`
                  : `Time remaining: ${timeLeft}s`}
              </span>
            </div>
          </div>
          <div
            className="mcq-timer-track"
            role="progressbar"
            aria-valuenow={timeLeft}
            aria-valuemin={0}
            aria-valuemax={15}
            aria-label="Question timer"
          >
            <div
              className={`mcq-timer-fill ${timeLeft <= 5 && !isAnswerRevealed ? 'urgent' : ''}`}
              style={{ width: `${(timeLeft / 15) * 100}%` }}
            />
          </div>
        </div>

        {/* MCQ 4-Option Grid */}
        <div className="mcq-options-grid" role="group" aria-label="Multiple choice answer options">
          {mcqOptions.map((opt, idx) => {
            let optionClass = 'mcq-option-btn';
            if (isAnswerRevealed) {
              if (opt.isCorrect) {
                optionClass += ' option-correct';
              } else if (idx === selectedOptionIndex) {
                optionClass += ' option-incorrect';
              } else {
                optionClass += ' option-dimmed';
              }
            }

            return (
              <button
                key={`${currentCard.id}-opt-${idx}`}
                type="button"
                className={optionClass}
                onClick={() => handleSelectOption(idx)}
                disabled={isAnswerRevealed}
                aria-label={`Option ${opt.label}: ${opt.text}`}
              >
                <span className="mcq-option-label">{opt.label}</span>
                <span className="mcq-option-text">{opt.text}</span>
                {!isAnswerRevealed && (
                  <span className="mcq-option-shortcut" title={`Press ${idx + 1}`}>
                    {idx + 1}
                  </span>
                )}
                {isAnswerRevealed && opt.isCorrect && (
                  <span className="mcq-option-result-icon correct" aria-hidden="true">✓</span>
                )}
                {isAnswerRevealed && !opt.isCorrect && idx === selectedOptionIndex && (
                  <span className="mcq-option-result-icon incorrect" aria-hidden="true">✗</span>
                )}
              </button>
            );
          })}
        </div>

        {/* REVEALED CONTENT: Answer feedback, example sentence, and recall rating buttons */}
        {isAnswerRevealed ? (
          <div className="review-answer-section">
            {/* Visual indication: Correct, Incorrect, or Time's up */}
            {selectedOption && selectedOption.isCorrect && (
              <div className="mcq-result-banner correct" role="status">
                <span className="result-icon">✓</span>
                <div>
                  <strong>Correct!</strong>
                  <div className="result-details">
                    {currentCard.word} → {currentCard.meaning}
                  </div>
                </div>
              </div>
            )}

            {selectedOption && !selectedOption.isCorrect && (
              <div className="mcq-result-banner incorrect" role="status">
                <span className="result-icon">✗</span>
                <div>
                  <strong>Incorrect</strong>
                  <div className="result-details">
                    Your answer: <em>{selectedOption.text}</em> • Correct answer: <strong>{currentCard.meaning}</strong>
                  </div>
                </div>
              </div>
            )}

            {isTimedOut && selectedOptionIndex === null && (
              <div className="mcq-result-banner timeout" role="status">
                <span className="result-icon">⏳</span>
                <div>
                  <strong>Time's up!</strong>
                  <div className="result-details">
                    Correct answer: <strong>{currentCard.meaning}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="review-meaning-label">Meaning / Translation</div>
            <div className="review-meaning">{currentCard.meaning}</div>

            {currentCard.exampleSentence && (
              <div className="review-example-box">
                <span className="quote-mark">“</span>
                {currentCard.exampleSentence}
                <span className="quote-mark">”</span>
              </div>
            )}

            <div className="review-card-meta">
              <span>
                Current Interval: <strong>{currentCard.intervalDays}d</strong>
              </span>
              <span>•</span>
              <span>
                Consecutive Repetitions: <strong>{currentCard.repetitionCount}</strong>
              </span>
            </div>

            {/* Accidental Rating Prevention: Buttons ONLY rendered after answer reveal */}
            <div className="ratings-container">
              <div className="ratings-legend">How well did you recall it?</div>
              <div className="ratings-grid" aria-label="Recall rating options">
                <button
                  type="button"
                  className="rating-btn again"
                  onClick={() => handleRatingSelect('AGAIN')}
                  title="Complete lapse or incorrect recall (Shortcut: 1)"
                >
                  <span className="rating-shortcut">1</span>
                  <span className="rating-label">AGAIN</span>
                  <span className="rating-desc">Forgot / Reset</span>
                  <span className="rating-interval">
                    +{formatIntervalLabel(againPrediction.intervalDays)}
                  </span>
                </button>

                <button
                  type="button"
                  className="rating-btn hard"
                  onClick={() => handleRatingSelect('HARD')}
                  title="Correct recall achieved with significant effort (Shortcut: 2)"
                >
                  <span className="rating-shortcut">2</span>
                  <span className="rating-label">HARD</span>
                  <span className="rating-desc">Struggled</span>
                  <span className="rating-interval">
                    +{formatIntervalLabel(hardPrediction.intervalDays)}
                  </span>
                </button>

                <button
                  type="button"
                  className="rating-btn good"
                  onClick={() => handleRatingSelect('GOOD')}
                  title="Successful recall with expected effort (Shortcut: 3)"
                >
                  <span className="rating-shortcut">3</span>
                  <span className="rating-label">GOOD</span>
                  <span className="rating-desc">Recalled</span>
                  <span className="rating-interval">
                    +{formatIntervalLabel(goodPrediction.intervalDays)}
                  </span>
                </button>

                <button
                  type="button"
                  className="rating-btn easy"
                  onClick={() => handleRatingSelect('EASY')}
                  title="Immediate, effortless recall (Shortcut: 4)"
                >
                  <span className="rating-shortcut">4</span>
                  <span className="rating-label">EASY</span>
                  <span className="rating-desc">Effortless</span>
                  <span className="rating-interval">
                    +{formatIntervalLabel(easyPrediction.intervalDays)}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mcq-prompt-hint">
            <span>Select an answer above or press <strong>1–4</strong> on your keyboard</span>
          </div>
        )}
      </div>
    </div>
  );
};
