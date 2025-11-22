import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAppContext } from '../context/AppContext';
import './SettingsForm.css';

type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

type Settings = {
  openAtLogin: boolean;
  reminder: ReminderSettings;
};

type SettingsFormProps = {
  onClose: () => void;
};

declare global {
  interface Window {
    electronAPI?: {
      getSettings: () => Promise<Settings>;
      setOpenAtLogin: (
        enabled: boolean
      ) => Promise<{ success: boolean; error?: string } | void>;
      setReminder: (
        settings: ReminderSettings
      ) => Promise<{ success: boolean; error?: string } | void>;
      fetchQuizlet: (url: string) => Promise<{
        success: boolean;
        terms?: { term: string; definition: string }[];
        count?: number;
        error?: string;
      }>;
    };
  }
}

const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  hour: 8,
  minute: 0
};

const formatTime = (hour: number, minute: number) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

const parseTime = (value: string): { hour: number; minute: number } => {
  const [rawHour, rawMinute] = value.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  return {
    hour: Number.isFinite(hour) ? hour : DEFAULT_REMINDER.hour,
    minute: Number.isFinite(minute) ? minute : DEFAULT_REMINDER.minute
  };
};

const SettingsForm: React.FC<SettingsFormProps> = ({ onClose }) => {
  const { toggleTheme, isDark } = useTheme();
  const { voices } = useAppContext();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [openAtLogin, setOpenAtLoginState] = useState(false);
  const [reminder, setReminderState] = useState<ReminderSettings>(DEFAULT_REMINDER);
  
  // TTS Settings
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      // Load TTS settings from localStorage
      const savedVoice = localStorage.getItem('tts_voice');
      const savedRate = localStorage.getItem('tts_rate');
      
      if (savedVoice) setSelectedVoice(savedVoice);
      if (savedRate) setSpeechRate(parseFloat(savedRate));

      if (!window.electronAPI) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const settings = await window.electronAPI.getSettings();
        if (isMounted) {
          setOpenAtLoginState(Boolean(settings.openAtLogin));
          setReminderState({
            enabled: Boolean(settings.reminder?.enabled),
            hour: Number(settings.reminder?.hour ?? DEFAULT_REMINDER.hour),
            minute: Number(settings.reminder?.minute ?? DEFAULT_REMINDER.minute)
          });
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Không thể tải cài đặt:', err);
          setError('Không thể tải cài đặt. Vui lòng thử lại sau.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const formattedTime = useMemo(
    () => formatTime(reminder.hour, reminder.minute),
    [reminder.hour, reminder.minute]
  );

  const handleOpenAtLoginChange: React.ChangeEventHandler<HTMLInputElement> = async event => {
    const nextValue = event.target.checked;
    setOpenAtLoginState(nextValue);
    setError(null);
    setStatusMessage(null);

    if (!window.electronAPI) {
      setError('Không thể thay đổi cài đặt này khi chạy trong trình duyệt.');
      setOpenAtLoginState(!nextValue);
      return;
    }

    try {
      const result = await window.electronAPI.setOpenAtLogin(nextValue);
      if (result && 'success' in result && !result.success) {
        throw new Error(result.error || 'Không rõ nguyên nhân');
      }
      setStatusMessage('Đã lưu cài đặt khởi động cùng hệ thống.');
    } catch (err: any) {
      console.error('Lỗi khi cập nhật openAtLogin:', err);
      setError(`Không thể lưu cài đặt khởi động: ${err?.message || err}`);
      setOpenAtLoginState(!nextValue);
    }
  };

  const handleReminderToggle: React.ChangeEventHandler<HTMLInputElement> = event => {
    setReminderState(prev => ({ ...prev, enabled: event.target.checked }));
    setError(null);
    setStatusMessage(null);
  };

  const handleTimeChange: React.ChangeEventHandler<HTMLInputElement> = event => {
    const { hour, minute } = parseTime(event.target.value);
    setReminderState(prev => ({ ...prev, hour, minute }));
    setError(null);
    setStatusMessage(null);
  };

  const handleSaveReminder = async () => {
    if (!window.electronAPI) {
      setError('Không thể lưu nhắc nhở khi chạy trong trình duyệt.');
      return;
    }

    try {
      const result = await window.electronAPI.setReminder(reminder);
      if (result && 'success' in result && !result.success) {
        throw new Error(result.error || 'Không rõ nguyên nhân');
      }
      setStatusMessage('Đã lưu cài đặt nhắc nhở.');
    } catch (err: any) {
      console.error('Không thể lưu nhắc nhở:', err);
      setError(`Không thể lưu nhắc nhở: ${err?.message || err}`);
    }
  };

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName);
    localStorage.setItem('tts_voice', voiceName);
    setStatusMessage('Voice preference saved');
  };

  const handleRateChange = (rate: number) => {
    setSpeechRate(rate);
    localStorage.setItem('tts_rate', rate.toString());
  };

  const handleTestSpeech = () => {
    if (!('speechSynthesis' in window)) {
      setError('Text-to-speech is not supported in your browser.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance('Hello, this is a test of the text to speech system.');
    
    if (selectedVoice) {
      const voice = voices.find(v => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
    }
    
    utterance.rate = speechRate;
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  if (isLoading) {
    return (
      <div className="settings-modal-overlay" onClick={onClose}>
        <div className="settings-modal glass-card" onClick={(e) => e.stopPropagation()}>
          <div className="settings-loading">Đang tải cài đặt...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="settings-close-btn"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="settings-content">
          {error && (
            <div className="settings-error" role="alert">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="settings-success">
              {statusMessage}
            </div>
          )}

          {/* Text-to-Speech Settings */}
          <div className="settings-section">
            <h3>🔊 Text-to-Speech</h3>
            
            <div className="settings-field">
              <label htmlFor="voice-select">Voice</label>
              <select
                id="voice-select"
                value={selectedVoice}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="settings-select"
              >
                <option value="">Default Voice</option>
                {voices
                  .filter(voice => voice.lang.startsWith('en'))
                  .map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
              </select>
            </div>

            <div className="settings-field">
              <label htmlFor="speed-slider">
                Reading Speed: {speechRate === 0.5 ? 'Slow' : speechRate === 1.0 ? 'Normal' : 'Fast'}
              </label>
              <div className="speed-control">
                <span className="speed-label">Slow</span>
                <input
                  id="speed-slider"
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.5"
                  value={speechRate}
                  onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                  className="settings-slider"
                />
                <span className="speed-label">Fast</span>
              </div>
            </div>

            <button type="button" className="test-speech-btn" onClick={handleTestSpeech}>
              🎵 Test Voice
            </button>
          </div>

          <hr className="settings-divider" />

          {/* Theme Settings */}
          <div className="settings-section">
            <h3>🎨 Appearance</h3>
            <div className="settings-field">
              <label>Theme</label>
              <button
                type="button"
                onClick={toggleTheme}
                className="theme-toggle-btn"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <span className="theme-icon">{isDark ? '☀️' : '🌙'}</span>
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
          </div>

          {window.electronAPI && (
            <>
              <hr className="settings-divider" />

              {/* System Settings */}
              <div className="settings-section">
                <h3>💻 System</h3>
                
                <div className="settings-field">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={openAtLogin} 
                      onChange={handleOpenAtLoginChange}
                    />
                    <span>Open at login</span>
                  </label>
                  <div className="settings-note">
                    Note: This feature only works in packaged app (!isDev).
                  </div>
                </div>
              </div>

              <hr className="settings-divider" />

              {/* Reminder Settings */}
              <div className="settings-section">
                <h3>⏰ Daily Reminder</h3>
                
                <div className="settings-field">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={reminder.enabled}
                      onChange={handleReminderToggle}
                    />
                    <span>Enable daily study reminder</span>
                  </label>
                </div>

                {reminder.enabled && (
                  <div className="settings-field">
                    <label htmlFor="reminderTime">Reminder time</label>
                    <input
                      id="reminderTime"
                      type="time"
                      value={formattedTime}
                      onChange={handleTimeChange}
                      className="time-input"
                    />
                  </div>
                )}

                <button type="button" className="save-reminder-btn" onClick={handleSaveReminder}>
                  💾 Save Reminder
                </button>
              </div>
            </>
          )}
        </div>

        <div className="settings-footer">
          <button type="button" className="close-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsForm;
