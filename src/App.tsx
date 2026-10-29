import React, { useState, useEffect, useMemo } from 'react';
import { Flashcard } from './types/flashcard.ts';
import {
  getFlashcards,
  addFlashcard,
  updateFlashcard,
  deleteFlashcard,
  resetToSampleData,
  isStorageInitialized,
} from './storage/localStorage.ts';
import { getDueCards } from './core/scheduler.ts';
import { getTodayLocalDate } from './core/dateUtils.ts';
import { Header } from './components/Header.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { DeckList } from './components/DeckList.tsx';
import { FlashcardForm } from './components/FlashcardForm.tsx';
import { ReviewSession } from './components/ReviewSession.tsx';

export const App: React.FC = () => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deck' | 'review'>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'info' | 'success';
  } | null>(null);

  // Initialize data on mount
  useEffect(() => {
    if (!isStorageInitialized()) {
      // First launch with uninitialized storage: seed sample cards and display immediately
      const initialSamples = resetToSampleData();
      setCards(initialSamples);
    } else {
      setCards(getFlashcards());
    }
  }, []);

  // Compute active due count for the header indicator
  const todayStr = getTodayLocalDate();
  const dueCardsCount = useMemo(() => {
    return getDueCards(cards, todayStr).length;
  }, [cards, todayStr]);

  const showNotification = (message: string, type: 'info' | 'success' = 'info') => {
    setNotification({ message, type });
  };

  const handleStartReview = () => {
    setNotification(null);
    setActiveTab('review');
  };

  const handleCardUpdated = (_updatedCard: Flashcard) => {
    // Refresh cards directly from the storage adapter single source of truth
    const refreshed = getFlashcards();
    setCards(refreshed);
  };

  const handleOpenCreateForm = () => {
    setEditingCard(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (card: Flashcard) => {
    setEditingCard(card);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCard(null);
  };

  const handleSaveCard = (card: Flashcard) => {
    if (editingCard) {
      const updated = updateFlashcard(card);
      setCards(updated);
      showNotification(`Flashcard "${card.word}" updated successfully.`, 'success');
    } else {
      const updated = addFlashcard(card);
      setCards(updated);
      showNotification(`Flashcard "${card.word}" created successfully.`, 'success');
    }
  };

  const handleDeleteCard = (id: string) => {
    const cardToDelete = cards.find((c) => c.id === id);
    const updated = deleteFlashcard(id);
    setCards(updated);
    showNotification(
      `Flashcard "${cardToDelete ? cardToDelete.word : 'card'}" deleted.`,
      'info'
    );
  };

  const handleResetSampleData = () => {
    const confirmed = window.confirm(
      'Reset all flashcards to the default sample cards? Any custom cards will be replaced.'
    );
    if (confirmed) {
      const resetCards = resetToSampleData();
      setCards(resetCards);
      showNotification('Storage successfully reset to 5 sample flashcards.', 'success');
    }
  };

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab === 'review' ? 'dashboard' : activeTab}
        onSelectTab={(tab) => {
          setNotification(null);
          setActiveTab(tab);
        }}
        dueCount={dueCardsCount}
        onResetSampleData={handleResetSampleData}
      />

      <main className="main-content">
        {notification && (
          <div
            className={`notification-banner ${notification.type}`}
            role="alert"
          >
            <span>{notification.message}</span>
            <button
              type="button"
              className="banner-close-btn"
              onClick={() => setNotification(null)}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        )}

        {activeTab === 'review' ? (
          <ReviewSession
            cards={cards}
            onCardUpdated={handleCardUpdated}
            onExit={() => setActiveTab('dashboard')}
          />
        ) : activeTab === 'dashboard' ? (
          <Dashboard
            cards={cards}
            onStartReviewClick={handleStartReview}
            onNavigateToDeck={() => setActiveTab('deck')}
            onCreateCardClick={handleOpenCreateForm}
          />
        ) : (
          <DeckList
            cards={cards}
            onEditCard={handleOpenEditForm}
            onDeleteCard={handleDeleteCard}
            onCreateCardClick={handleOpenCreateForm}
          />
        )}
      </main>

      <FlashcardForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveCard}
        initialCard={editingCard}
      />
    </div>
  );
};
