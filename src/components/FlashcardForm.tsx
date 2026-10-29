import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types/flashcard.ts';
import { getTodayLocalDate } from '../core/dateUtils.ts';

interface FlashcardFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: Flashcard) => void;
  initialCard?: Flashcard | null;
}

export const FlashcardForm: React.FC<FlashcardFormProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCard,
}) => {
  const [word, setWord] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('Spanish');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [meaning, setMeaning] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialCard) {
      setWord(initialCard.word);
      setSourceLanguage(initialCard.sourceLanguage);
      setTargetLanguage(initialCard.targetLanguage);
      setMeaning(initialCard.meaning);
      setExampleSentence(initialCard.exampleSentence || '');
    } else {
      setWord('');
      setSourceLanguage('Spanish');
      setTargetLanguage('English');
      setMeaning('');
      setExampleSentence('');
    }
    setErrors({});
  }, [initialCard, isOpen]);

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!word.trim()) {
      newErrors.word = 'Vocabulary word or phrase is required.';
    }
    if (!sourceLanguage.trim()) {
      newErrors.sourceLanguage = 'Source language is required.';
    }
    if (!targetLanguage.trim()) {
      newErrors.targetLanguage = 'Target language is required.';
    }
    if (!meaning.trim()) {
      newErrors.meaning = 'Translation or meaning is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const trimmedWord = word.trim();
    const trimmedSource = sourceLanguage.trim();
    const trimmedTarget = targetLanguage.trim();
    const trimmedMeaning = meaning.trim();
    const trimmedExample = exampleSentence.trim();

    if (initialCard) {
      // Edit existing card: preserve existing scheduling state strictly
      const updatedCard: Flashcard = {
        ...initialCard,
        word: trimmedWord,
        sourceLanguage: trimmedSource,
        targetLanguage: trimmedTarget,
        meaning: trimmedMeaning,
        exampleSentence: trimmedExample || undefined,
      };
      onSave(updatedCard);
    } else {
      // Create brand-new card with default initial scheduling parameters
      const newCard: Flashcard = {
        id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        word: trimmedWord,
        sourceLanguage: trimmedSource,
        targetLanguage: trimmedTarget,
        meaning: trimmedMeaning,
        exampleSentence: trimmedExample || undefined,
        createdAt: new Date().toISOString(),
        repetitionCount: 0,
        intervalDays: 0,
        nextReviewDate: getTodayLocalDate(),
        lastReviewedAt: null,
        lastRecallLevel: null,
      };
      onSave(newCard);
    }

    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title">{initialCard ? 'Edit Flashcard' : 'Create New Flashcard'}</h2>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close dialog (Escape)"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="word-input">
              Vocabulary Word / Phrase <span className="required-star">*</span>
            </label>
            <input
              id="word-input"
              className={`form-input ${errors.word ? 'input-error' : ''}`}
              type="text"
              placeholder="e.g. estrella"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.word}
              autoFocus
            />
            {errors.word && <p className="form-error" role="alert">{errors.word}</p>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="source-lang-input">
                Source Language <span className="required-star">*</span>
              </label>
              <input
                id="source-lang-input"
                className={`form-input ${errors.sourceLanguage ? 'input-error' : ''}`}
                type="text"
                placeholder="e.g. Spanish"
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                aria-required="true"
              />
              {errors.sourceLanguage && (
                <p className="form-error" role="alert">{errors.sourceLanguage}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="target-lang-input">
                Target Language <span className="required-star">*</span>
              </label>
              <input
                id="target-lang-input"
                className={`form-input ${errors.targetLanguage ? 'input-error' : ''}`}
                type="text"
                placeholder="e.g. English"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                aria-required="true"
              />
              {errors.targetLanguage && (
                <p className="form-error" role="alert">{errors.targetLanguage}</p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="meaning-input">
              Translation / Meaning <span className="required-star">*</span>
            </label>
            <input
              id="meaning-input"
              className={`form-input ${errors.meaning ? 'input-error' : ''}`}
              type="text"
              placeholder="e.g. star"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.meaning}
            />
            {errors.meaning && <p className="form-error" role="alert">{errors.meaning}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="example-input">
              Example Sentence <span className="optional-tag">(Optional)</span>
            </label>
            <textarea
              id="example-input"
              className="form-textarea"
              placeholder="e.g. Las estrellas brillan en la noche."
              value={exampleSentence}
              onChange={(e) => setExampleSentence(e.target.value)}
              rows={3}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {initialCard ? 'Save Changes' : 'Create Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
