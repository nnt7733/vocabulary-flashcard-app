import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

interface Settings {
  openAtLogin: boolean;
  reminder: ReminderSettings;
}

interface SettingsFormProps {
  onClose: () => void;
}

declare global {
  interface Window {
    electronAPI?: {
      getSettings: () => Promise<Settings>;
      setOpenAtLogin: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      setReminder: (settings: ReminderSettings) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

const DEFAULT_SETTINGS: Settings = {
  openAtLogin: false,
  reminder: {
    enabled: false,
    hour: 8,
    minute: 0
  }
};

const SettingsForm: React.FC<SettingsFormProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isElectronAvailable, setIsElectronAvailable] = useState(() => Boolean(window.electronAPI));

  useEffect(() => {
    let isMounted = true;

    if (!window.electronAPI) {
      if (isMounted) {
        setError('Tính năng cài đặt chỉ khả dụng khi chạy ứng dụng trên desktop.');
        setIsLoading(false);
      }
      return () => {
        isMounted = false;
      };
    }

    window.electronAPI
      .getSettings()
      .then(loadedSettings => {
        if (isMounted) {
          setSettings(loadedSettings);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error('Lỗi khi tải cài đặt:', err);
          setError('Không thể tải cài đặt.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setIsElectronAvailable(Boolean(window.electronAPI));
  }, [isLoading]);

  const handleOpenAtLoginChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.target.checked;
      setError(null);
      setSuccessMessage(null);
      setSettings(prev => ({ ...prev, openAtLogin: isChecked }));

      if (!window.electronAPI) {
        setError('Không thể thay đổi cài đặt khởi động khi chạy trong trình duyệt.');
        setSettings(prev => ({ ...prev, openAtLogin: !isChecked }));
        return;
      }

      try {
        const result = await window.electronAPI.setOpenAtLogin(isChecked);
        if (!result.success) {
          setError(`Lỗi lưu cài đặt khởi động: ${result.error || 'Không rõ nguyên nhân'}`);
          setSettings(prev => ({ ...prev, openAtLogin: !isChecked }));
        } else {
          setError(null);
          setSuccessMessage('Đã lưu cài đặt khởi động.');
        }
      } catch (err: any) {
        setError(`Lỗi lưu cài đặt khởi động: ${err?.message || err}`);
        setSettings(prev => ({ ...prev, openAtLogin: !isChecked }));
      }
    },
    []
  );

  const handleReminderEnabledChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setError(null);
    setSuccessMessage(null);
    setSettings(prev => ({
      ...prev,
      reminder: { ...prev.reminder, enabled: isChecked }
    }));
  }, []);

  const handleTimeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const [hour, minute] = event.target.value.split(':').map(Number);
    setError(null);
    setSuccessMessage(null);
    setSettings(prev => ({
      ...prev,
      reminder: {
        ...prev.reminder,
        hour: Number.isNaN(hour) ? prev.reminder.hour : hour,
        minute: Number.isNaN(minute) ? prev.reminder.minute : minute
      }
    }));
  }, []);

  const handleApplyReminder = useCallback(async () => {
    if (!window.electronAPI) {
      setError('Không thể lưu cài đặt nhắc nhở khi chạy trong trình duyệt.');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      const result = await window.electronAPI.setReminder(settings.reminder);
      if (!result.success) {
        setError(`Lỗi lưu cài đặt nhắc nhở: ${result.error || 'Không rõ nguyên nhân'}`);
      } else {
        setSuccessMessage('Đã lưu cài đặt nhắc nhở!');
      }
    } catch (err: any) {
      setError(`Lỗi lưu cài đặt nhắc nhở: ${err?.message || err}`);
    }
  }, [settings.reminder]);

  const formattedReminderTime = useMemo(
    () => `${String(settings.reminder.hour).padStart(2, '0')}:${String(settings.reminder.minute).padStart(2, '0')}`,
    [settings.reminder.hour, settings.reminder.minute]
  );

  if (isLoading) {
    return <div className="card">Đang tải cài đặt...</div>;
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1f2937' }}>Cài đặt</h2>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}
          aria-label="Đóng cài đặt"
        >
          ×
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '16px' }} role="alert">
          {error}
        </div>
      )}

      {successMessage && (
        <div style={{ color: '#047857', marginBottom: '16px' }}>
          {successMessage}
        </div>
      )}

      {!isElectronAvailable && (
        <div style={{ color: '#6b7280', marginBottom: '16px' }}>
          Một số tùy chọn sẽ bị vô hiệu hóa khi chạy trong môi trường trình duyệt.
        </div>
      )}

      <div className="input-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.openAtLogin}
            onChange={handleOpenAtLoginChange}
            style={{ width: 'auto' }}
            disabled={!isElectronAvailable}
          />
          Mở ứng dụng khi khởi động máy tính
        </label>
        <div style={{ fontSize: '12px', color: '#6b7280', marginLeft: '24px', marginTop: '4px' }}>
          Lưu ý: Tính năng này chỉ hoạt động trên bản cài đặt (không hoạt động khi chạy dev).
        </div>
      </div>

      <hr style={{ margin: '24px 0', borderColor: '#e5e7eb' }} />

      <div className="input-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.reminder.enabled}
            onChange={handleReminderEnabledChange}
            style={{ width: 'auto' }}
          />
          Bật nhắc nhở ôn bài hàng ngày
        </label>
      </div>

      {settings.reminder.enabled && (
        <div className="input-group" style={{ marginLeft: '24px' }}>
          <label htmlFor="reminderTime">Thời gian nhắc nhở:</label>
          <input
            type="time"
            id="reminderTime"
            value={formattedReminderTime}
            onChange={handleTimeChange}
            style={{ width: 'auto', padding: '8px 12px' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button onClick={handleApplyReminder} className="btn btn-primary" disabled={!isElectronAvailable}>
          Lưu cài đặt nhắc nhở
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '24px',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '16px'
        }}
      >
        <button onClick={onClose} className="btn btn-secondary">
          Đóng
        </button>
      </div>
    </div>
  );
};

export default SettingsForm;
