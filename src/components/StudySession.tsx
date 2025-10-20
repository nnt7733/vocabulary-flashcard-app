import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { updateCardAfterReview } from '../utils/spacedRepetition';

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

  useEffect(() => {
    setStartTime(Date.now());
    
    // Load voices on component mount
    if ('speechSynthesis' in window) {
      // Some browsers need this to load voices
      window.speechSynthesis.getVoices();
      
      // Listen for voices loaded event
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
          const voices = window.speechSynthesis.getVoices();
          console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        };
      }
    }
  }, []);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.92; // Tốc độ gốc tự nhiên
      utterance.pitch = 1.0; // Cao độ tự nhiên
      utterance.volume = 1.0; // Âm lượng tối đa
      
      // Prioritize the best quality US English voices
      const voices = window.speechSynthesis.getVoices();
      
      // Priority order: US English (per user preference), then UK
      const voicePriority = [
        // US English voices
        'Google US English',
        'Microsoft Aria Online (Natural) - English (United States)',
        'Microsoft Mark - English (United States)',
        'Microsoft Zira - English (United States)',
        // UK English fallback (Cambridge-like)
        'Google UK English Female',
        'Google UK English Male',
        'Microsoft Libby Online (Natural) - English (United Kingdom)',
        'Microsoft Ryan Online (Natural) - English (United Kingdom)',
        'Microsoft Susan - English (United Kingdom)',
        'Microsoft Hazel - English (United Kingdom)',
        'Microsoft George - English (United Kingdom)'
      ];
      
      let selectedVoice = null;
      
      // Try to find voice by exact name
      for (const voiceName of voicePriority) {
        selectedVoice = voices.find(v => v.name === voiceName);
        if (selectedVoice) break;
      }
      
      // Fallback: Find any high-quality en-US voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang === 'en-US' && 
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
        );
      }
      
      // Fallback 2: Any en-US voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang === 'en-US');
      }
      
      // Fallback 3: Any high-quality en-GB voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang === 'en-GB' && 
          (v.name.includes('Google') || v.name.includes('Natural'))
        );
      }
      
      // Last resort: Any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('en-'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Using voice:', selectedVoice.name); // Debug log
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAnswer = (correct: boolean) => {
    const responseTime = Date.now() - startTime;
    const updatedCard = updateCardAfterReview(currentCard, correct, responseTime);
    // Save history snapshot for undo
    setActionHistory(prev => [...prev, { cardId: currentCard.id, prevCard: currentCard, wasCorrect: correct }]);
    
    // Update the cards map
    const newUpdatedCardsMap = new Map(updatedCardsMap);
    newUpdatedCardsMap.set(updatedCard.id, updatedCard);
    setUpdatedCardsMap(newUpdatedCardsMap);

    // Add to incorrect cards list if answer is wrong
    if (!correct) {
      setIncorrectCards(prev => [...prev, updatedCard]);
    }

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
        newUpdatedCardsMap.get(card.id) || card
      );

      const finalIncorrect = correct
        ? incorrectCards
        : [...incorrectCards, newUpdatedCardsMap.get(currentCard.id) as Flashcard];

      onComplete(finalCards, finalIncorrect);
    }
  };

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
