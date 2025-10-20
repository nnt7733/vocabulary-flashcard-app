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
      utterance.rate = 1.0; // Tốc độ gốc tự nhiên
      utterance.pitch = 1.0; // Cao độ tự nhiên
      utterance.volume = 1.0; // Âm lượng tối đa
      
      // Prioritize the best quality US English voices
      const voices = window.speechSynthesis.getVoices();
      
      // Priority order: Google US > Microsoft Natural > Microsoft > any en-US
      const voicePriority = [
        'Google US English',
        'Microsoft Aria Online (Natural) - English (United States)',
        'Microsoft Mark - English (United States)',
        'Microsoft Zira - English (United States)',
        'Google UK English Female',
        'Google UK English Male',
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
      
      // Last resort: Any en-US voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang === 'en-US' || v.lang.startsWith('en-'));
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
      // Session finished - show summary
      const finalCards = cards.map(card => 
        newUpdatedCardsMap.get(card.id) || card
      );
      onComplete(finalCards, incorrectCards);
    }
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
