import React, { useEffect, useMemo, useState } from 'react';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [openAtLogin, setOpenAtLoginState] = useState(false);
  const [reminder, setReminderState] = useState<ReminderSettings>(DEFAULT_REMINDER);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      if (!window.electronAPI) {
        if (isMounted) {
          setError('Tính năng cài đặt chỉ khả dụng trong ứng dụng desktop.');
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

  if (isLoading) {
    return <div className="card">Đang tải cài đặt...</div>;
  }

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}
      >
        <h2 style={{ margin: 0, color: '#1f2937' }}>Cài đặt</h2>
        <button
          type="button"
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

      {statusMessage && (
        <div style={{ color: '#047857', marginBottom: '16px' }}>
          {statusMessage}
        </div>
      )}

      <div className="input-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={openAtLogin} onChange={handleOpenAtLoginChange} style={{ width: 'auto' }} />
          Mở ứng dụng khi khởi động máy tính
        </label>
        <div style={{ fontSize: '12px', color: '#6b7280', marginLeft: '24px', marginTop: '4px' }}>
          Lưu ý: Tùy chọn này chỉ hoạt động khi ứng dụng được đóng gói (!isDev).
        </div>
      </div>

      <hr style={{ margin: '24px 0', borderColor: '#e5e7eb' }} />

      <div className="input-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={reminder.enabled}
            onChange={handleReminderToggle}
            style={{ width: 'auto' }}
          />
          Bật nhắc nhở ôn tập hằng ngày
        </label>
      </div>

      {reminder.enabled && (
        <div className="input-group" style={{ marginLeft: '24px' }}>
          <label htmlFor="reminderTime">Thời gian nhắc nhở</label>
          <input
            id="reminderTime"
            type="time"
            value={formattedTime}
            onChange={handleTimeChange}
            style={{ width: 'auto', padding: '8px 12px' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
        <button type="button" className="btn btn-primary" onClick={handleSaveReminder}>
          Lưu nhắc nhở
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  );
};

export default SettingsForm;
