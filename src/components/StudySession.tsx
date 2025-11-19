import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flashcard } from '../types';
import { updateCardAfterReview } from '../utils/spacedRepetition';
import { useAppContext } from '../context/AppContext';

interface StudySessionProps {
  cards: Flashcard[];
  onComplete: (result: StudySessionResult) => void;
  onExit: () => void;
}

export interface StudySessionResult {
  updatedCards: Flashcard[];
  incorrectCards: Flashcard[];
  stats: {
    correct: number;
    incorrect: number;
    total: number;
  };
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  overdueReviewed: number;
}

const StudySession: React.FC<StudySessionProps> = ({ cards, onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  const [incorrectCards, setIncorrectCards] = useState<Flashcard[]>([]);
  const [updatedCardsMap, setUpdatedCardsMap] = useState<Map<string, Flashcard>>(new Map());
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    total: cards.length
  });
  const [overdueCount, setOverdueCount] = useState(0);
  const [speechRate, setSpeechRate] = useState(0.92);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [speechVolume, setSpeechVolume] = useState(1);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState('');
  // Keep action history to support Undo
  const [actionHistory, setActionHistory] = useState<Array<{
    cardId: string;
    prevCard: Flashcard;
    wasCorrect: boolean;
    incorrectIndex: number | null;
    hadExistingUpdate: boolean;
    wasOverdue: boolean;
  }>>([]);

  const totalCards = cards.length;
  const currentCard = cards[currentIndex];
  const progress = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;
  const { voices } = useAppContext();

  useEffect(() => {
    sessionStartRef.current = Date.now();
    setStartTime(Date.now());
    setCurrentIndex(0);
    setIsFlipped(false);
    setIncorrectCards([]);
    setUpdatedCardsMap(new Map());
    setActionHistory([]);
    setSessionStats({
      correct: 0,
      incorrect: 0,
      total: cards.length
    });
    setOverdueCount(0);
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cards.length]);

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

  const resolvedVoice = useMemo<SpeechSynthesisVoice | null>(() => {
    if (selectedVoiceUri) {
      const matched = voices.find(voice => voice.voiceURI === selectedVoiceUri);
      if (matched) {
        return matched;
      }
    }
    return preferredVoice;
  }, [preferredVoice, selectedVoiceUri, voices]);


  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = resolvedVoice?.lang ?? 'en-US';
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      utterance.volume = speechVolume;

      if (resolvedVoice) {
        utterance.voice = resolvedVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  }, [resolvedVoice, speechPitch, speechRate, speechVolume]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleAnswer = useCallback((correct: boolean) => {
    const responseTime = Date.now() - startTime;
    const previousCardState = updatedCardsMap.get(currentCard.id) || currentCard;
    const hadExistingUpdate = updatedCardsMap.has(currentCard.id);
    const now = new Date();
    const wasOverdue = previousCardState.nextReviewDate < now;
    const nextOverdueCount = wasOverdue ? overdueCount + 1 : overdueCount;
    const updatedCard = updateCardAfterReview(previousCardState, correct, responseTime);

    // Save history snapshot for undo
    const nextIncorrectIndex = correct ? null : incorrectCards.length;
    setActionHistory(prev => [
      ...prev,
      {
        cardId: currentCard.id,
        prevCard: previousCardState,
        wasCorrect: correct,
        incorrectIndex: nextIncorrectIndex,
        hadExistingUpdate,
        wasOverdue
      }
    ]);

    // Update the cards map
    const nextUpdatedMap = new Map(updatedCardsMap);
    nextUpdatedMap.set(updatedCard.id, updatedCard);
    setUpdatedCardsMap(nextUpdatedMap);

    // Add to incorrect cards list if answer is wrong
    const nextIncorrectCards = correct ? incorrectCards : [...incorrectCards, updatedCard];
    setIncorrectCards(nextIncorrectCards);

    if (wasOverdue) {
      setOverdueCount(prev => prev + 1);
    }

    const nextStats = {
      ...sessionStats,
      correct: correct ? sessionStats.correct + 1 : sessionStats.correct,
      incorrect: correct ? sessionStats.incorrect : sessionStats.incorrect + 1
    };
    setSessionStats(nextStats);

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
      const finishedAt = new Date();
      const startedAt = new Date(sessionStartRef.current);

      onComplete({
        updatedCards: finalCards,
        incorrectCards: finalIncorrect,
        stats: nextStats,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - sessionStartRef.current,
        overdueReviewed: nextOverdueCount
      });
    }
  }, [cards, currentCard, currentIndex, incorrectCards, onComplete, overdueCount, sessionStats, startTime, updatedCardsMap]);

  const handleSpeak = useCallback(() => {
    if (currentCard) {
      speakText(currentCard.term);
    }
  }, [currentCard, speakText]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        return;
      }

      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        handleFlip();
        return;
      }

      if (event.key === 'Control') {
        event.preventDefault();
        if (!event.repeat) {
          handleSpeak();
        }
        return;
      }

      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        handleAnswer(false);
        return;
      }

      if (event.code === 'ArrowRight') {
        event.preventDefault();
        handleAnswer(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleAnswer, handleFlip, handleSpeak, isFlipped]);

  const handleUndo = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (currentIndex === 0 || actionHistory.length === 0) return;
    const lastAction = actionHistory[actionHistory.length - 1];
    const restoredCard = lastAction.prevCard;

    // Restore card state in map
    const newMap = new Map(updatedCardsMap);
    if (lastAction.hadExistingUpdate) {
      newMap.set(restoredCard.id, restoredCard);
    } else {
      newMap.delete(restoredCard.id);
    }
    setUpdatedCardsMap(newMap);

    // Adjust incorrect cards list
    if (lastAction.incorrectIndex !== null) {
      const incorrectIdx = lastAction.incorrectIndex;
      if (incorrectIdx >= 0 && incorrectIdx < incorrectCards.length) {
        const newIncorrect = incorrectCards.slice();
        newIncorrect.splice(incorrectIdx, 1);
        setIncorrectCards(newIncorrect);
      }
    }

    if (lastAction.wasOverdue) {
      setOverdueCount(prev => Math.max(prev - 1, 0));
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
          {isFlipped
            ? 'Nhấn hoặc phím Space để xem thuật ngữ'
            : 'Nhấn hoặc phím Space để xem định nghĩa'}
       </div>
      </div>

      <div className="speech-settings" role="group" aria-label="Tùy chỉnh phát âm">
        <div className="speech-settings__row">
          <label htmlFor="voice-select">Giọng đọc</label>
          <select
            id="voice-select"
            value={selectedVoiceUri}
            onChange={event => setSelectedVoiceUri(event.target.value)}
          >
            <option value="">
              Tự động {resolvedVoice ? `(${resolvedVoice.name})` : '(theo trình duyệt)'}
            </option>
            {voices.map(voice => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} - {voice.lang}
              </option>
            ))}
          </select>
        </div>
        <div className="speech-settings__inline">
          <div className="speech-settings__row speech-settings__range">
            <label htmlFor="speech-rate">Tốc độ: {speechRate.toFixed(2)}x</label>
            <input
              id="speech-rate"
              type="range"
              min="0.6"
              max="1.4"
              step="0.02"
              value={speechRate}
              onChange={event => setSpeechRate(Number(event.target.value))}
            />
          </div>
          <div className="speech-settings__row speech-settings__range">
            <label htmlFor="speech-pitch">Cao độ: {speechPitch.toFixed(2)}</label>
            <input
              id="speech-pitch"
              type="range"
              min="0.5"
              max="1.5"
              step="0.02"
              value={speechPitch}
              onChange={event => setSpeechPitch(Number(event.target.value))}
            />
          </div>
          <div className="speech-settings__row speech-settings__range">
            <label htmlFor="speech-volume">Âm lượng: {(speechVolume * 100).toFixed(0)}%</label>
            <input
              id="speech-volume"
              type="range"
              min="0.3"
              max="1"
              step="0.01"
              value={speechVolume}
              onChange={event => setSpeechVolume(Number(event.target.value))}
            />
          </div>
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
