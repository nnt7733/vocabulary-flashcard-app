import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Flashcard } from '../types';
import { updateCardAfterReview } from '../utils/spacedRepetition';
import { useAppContext } from '../context/AppContext';

interface StudySessionProps {
  cards: Flashcard[];
  onComplete: (updatedCards: Flashcard[], incorrectCards: Flashcard[]) => void;
  onExit: () => void;
}

const StudySession: React.FC<StudySessionProps> = ({ cards, onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [incorrectCards, setIncorrectCards] = useState<Flashcard[]>([]);
  const [updatedCardsMap, setUpdatedCardsMap] = useState<Map<string, Flashcard>>(new Map());
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    total: cards.length
  });
  // Keep action history to support Undo
  const [actionHistory, setActionHistory] = useState<Array<{ cardId: string; prevCard: Flashcard; wasCorrect: boolean }>>([]);

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;
  const { voices } = useAppContext();

  useEffect(() => {
    setStartTime(Date.now());
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const preferredVoice = useMemo<SpeechSynthesisVoice | null>(() => {
    const availableVoices = voices.length
      ? voices
      : (typeof window !== 'undefined' && 'speechSynthesis' in window)
        ? window.speechSynthesis.getVoices()
        : [];

    const voicePriority = [
      'Google US English',
      'Microsoft Aria Online (Natural) - English (United States)',
      'Microsoft Mark - English (United States)',
      'Microsoft Zira - English (United States)',
      'Google UK English Female',
      'Google UK English Male',
      'Microsoft Libby Online (Natural) - English (United Kingdom)',
      'Microsoft Ryan Online (Natural) - English (United Kingdom)',
      'Microsoft Susan - English (United Kingdom)',
      'Microsoft Hazel - English (United Kingdom)',
      'Microsoft George - English (United Kingdom)'
    ];

    let selectedVoice = voicePriority
      .map(name => availableVoices.find(voice => voice.name === name))
      .find(Boolean) || null;

    if (!selectedVoice) {
      selectedVoice =
        availableVoices.find(voice =>
          voice.lang === 'en-US' &&
          (voice.name.includes('Google') || voice.name.includes('Natural') || voice.name.includes('Premium'))
        ) || null;
    }

    if (!selectedVoice) {
      selectedVoice = availableVoices.find(voice => voice.lang === 'en-US') || null;
    }

    if (!selectedVoice) {
      selectedVoice =
        availableVoices.find(voice => voice.lang === 'en-GB' && (voice.name.includes('Google') || voice.name.includes('Natural')))
        || null;
    }

    if (!selectedVoice) {
      selectedVoice = availableVoices.find(voice => voice.lang.startsWith('en-')) || null;
    }

    return selectedVoice || null;
  }, [voices]);

  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.92; // Tốc độ gốc tự nhiên
      utterance.pitch = 1.0; // Cao độ tự nhiên
      utterance.volume = 1.0; // Âm lượng tối đa

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  }, [preferredVoice]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleAnswer = useCallback((correct: boolean) => {
    const responseTime = Date.now() - startTime;
    const updatedCard = updateCardAfterReview(currentCard, correct, responseTime);
    // Save history snapshot for undo
    setActionHistory(prev => [...prev, { cardId: currentCard.id, prevCard: currentCard, wasCorrect: correct }]);

    // Update the cards map
    const nextUpdatedMap = new Map(updatedCardsMap);
    nextUpdatedMap.set(updatedCard.id, updatedCard);
    setUpdatedCardsMap(nextUpdatedMap);

    // Add to incorrect cards list if answer is wrong
    const nextIncorrectCards = correct ? incorrectCards : [...incorrectCards, updatedCard];
    setIncorrectCards(nextIncorrectCards);

    setSessionStats(prev => ({
      ...prev,
      correct: correct ? prev.correct + 1 : prev.correct,
      incorrect: correct ? prev.incorrect : prev.incorrect + 1
    }));

    // Move to next card
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setStartTime(Date.now());
    } else {
      // Session finished - include the last answered card state and incorrect list
      const finalCards = cards.map(card =>
        nextUpdatedMap.get(card.id) || card
      );

      const finalIncorrect = nextIncorrectCards;

      onComplete(finalCards, finalIncorrect);
    }
  }, [cards, currentCard, currentIndex, incorrectCards, onComplete, startTime, updatedCardsMap]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        return;
      }

      if (!isFlipped && (event.code === 'Space' || event.code === 'Enter')) {
        event.preventDefault();
        handleFlip();
        return;
      }

      if (isFlipped && event.code === 'ArrowLeft') {
        event.preventDefault();
        handleAnswer(false);
        return;
      }

      if (isFlipped && event.code === 'ArrowRight') {
        event.preventDefault();
        handleAnswer(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleAnswer, handleFlip, isFlipped]);

  const handleUndo = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (currentIndex === 0 || actionHistory.length === 0) return;
    const lastAction = actionHistory[actionHistory.length - 1];
    const restoredCard = lastAction.prevCard;

    // Restore card state in map
    const newMap = new Map(updatedCardsMap);
    newMap.set(restoredCard.id, restoredCard);
    setUpdatedCardsMap(newMap);

    // Adjust incorrect cards list
    if (!lastAction.wasCorrect) {
      // Remove the last occurrence of this card id in incorrectCards
      const idx = [...incorrectCards].reverse().findIndex(c => c.id === restoredCard.id);
      if (idx !== -1) {
        const realIndex = incorrectCards.length - 1 - idx;
        const newIncorrect = incorrectCards.slice();
        newIncorrect.splice(realIndex, 1);
        setIncorrectCards(newIncorrect);
      }
    }

    // Update stats
    setSessionStats(prev => ({
      ...prev,
      correct: lastAction.wasCorrect ? Math.max(prev.correct - 1, 0) : prev.correct,
      incorrect: lastAction.wasCorrect ? prev.incorrect : Math.max(prev.incorrect - 1, 0)
    }));

    // Move back one card
    setCurrentIndex(currentIndex - 1);
    setIsFlipped(false);
    setStartTime(Date.now());

    // Pop history
    setActionHistory(prev => prev.slice(0, -1));
  };

  const handleSpeak = () => {
    speakText(currentCard.term);
  };

  if (!currentCard) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>Không có thẻ nào để học</h3>
          <p>Hãy thêm một số thẻ mới để bắt đầu học tập.</p>
          <button onClick={onExit} className="btn btn-primary">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1f2937' }}>
          Học từ vựng ({currentIndex + 1}/{cards.length})
        </h2>
        <button onClick={onExit} className="btn btn-secondary">
          Thoát
        </button>
      </div>

      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flashcard" onClick={handleFlip}>
        <div className="term" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          {isFlipped ? currentCard.definition : (
            <>
              {currentCard.term}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#4f46e5',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                title="Phát âm (en-US)"
              >
                🔊
              </button>
            </>
          )}
        </div>
        <div style={{ 
          position: 'absolute', 
          bottom: '16px', 
          right: '16px', 
          color: '#9ca3af',
          fontSize: '14px'
        }}>
          {isFlipped ? 'Nhấn để xem thuật ngữ' : 'Nhấn để xem định nghĩa'}
        </div>
      </div>

      {isFlipped && (
        <div className="controls">
          <button 
            onClick={() => handleAnswer(false)}
            className="btn btn-danger"
          >
            Sai ❌
          </button>
          <button 
            onClick={() => handleAnswer(true)}
            className="btn btn-success"
          >
            Đúng ✅
          </button>
          <button 
            onClick={handleUndo}
            className="btn btn-secondary"
            disabled={currentIndex === 0 || actionHistory.length === 0}
            title={currentIndex === 0 ? 'Không thể quay lại' : 'Hoàn tác bước vừa rồi'}
          >
            ↩️ Undo
          </button>
        </div>
      )}

      <div className="stats" style={{ marginTop: '24px' }}>
        <div className="stat-card">
          <div className="stat-number">{sessionStats.correct}</div>
          <div className="stat-label">Đúng</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{sessionStats.incorrect}</div>
          <div className="stat-label">Sai</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100) || 0}%
          </div>
          <div className="stat-label">Tỷ lệ đúng</div>
        </div>
      </div>
    </div>
  );
};

export default StudySession;
