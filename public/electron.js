const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Check if running in development mode
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';

const defaultSettings = {
  openAtLogin: false,
  reminder: {
    enabled: false,
    hour: 8,
    minute: 0
  }
};

let mainWindow;
let settings = { ...defaultSettings };
let reminderTimer = null;

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    const filePath = getSettingsFilePath();
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      settings = {
        ...defaultSettings,
        ...data,
        reminder: {
          ...defaultSettings.reminder,
          ...(data?.reminder ?? {})
        }
      };
    } else {
      settings = { ...defaultSettings };
    }
  } catch (error) {
    console.error('Không thể đọc cài đặt, sử dụng giá trị mặc định.', error);
    settings = { ...defaultSettings };
  }
}

function saveSettings() {
  try {
    const filePath = getSettingsFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('Không thể lưu cài đặt:', error);
  }
}

function scheduleReminder() {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }

  const reminderSettings = settings.reminder;

  if (reminderSettings?.enabled) {
    const now = new Date();
    const nextTrigger = new Date();
    nextTrigger.setHours(reminderSettings.hour, reminderSettings.minute, 0, 0);

    if (nextTrigger <= now) {
      nextTrigger.setDate(nextTrigger.getDate() + 1);
    }

    const delay = nextTrigger.getTime() - now.getTime();
    console.log(
      `Đã đặt lịch nhắc nhở vào ${nextTrigger.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${nextTrigger.toLocaleDateString()}).`
    );

    reminderTimer = setTimeout(() => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();

        if (typeof Notification === 'function' && Notification.isSupported?.()) {
          new Notification({
            title: 'Đến giờ ôn bài!',
            body: 'Hãy mở ứng dụng để ôn tập từ vựng nhé.'
          }).show();
        }

        mainWindow.webContents.send('show-reminder');
      }

      scheduleReminder();
    }, delay);
  } else {
    console.log('Tính năng nhắc nhở đang tắt.');
  }
}

function setupIPCHandlers() {
  ipcMain.handle('settings:get', () => ({
    openAtLogin: settings.openAtLogin,
    reminder: settings.reminder
  }));

  ipcMain.handle('settings:set-open-at-login', async (_event, enabled) => {
    settings.openAtLogin = Boolean(enabled);
    saveSettings();

    if (!isDev) {
      try {
        app.setLoginItemSettings({
          openAtLogin: enabled,
          path: app.getPath('exe')
        });
      } catch (error) {
        console.error('Không thể cài đặt mở khi khởi động:', error);
        return { success: false, error: error?.message || String(error) };
      }
    }

    return { success: true };
  });

  ipcMain.handle('settings:set-reminder', (_event, reminderSettings) => {
    const sanitizedReminder = {
      enabled: Boolean(reminderSettings?.enabled),
      hour: Math.min(23, Math.max(0, Number(reminderSettings?.hour ?? defaultSettings.reminder.hour))),
      minute: Math.min(59, Math.max(0, Number(reminderSettings?.minute ?? defaultSettings.reminder.minute)))
    };

    settings.reminder = {
      ...defaultSettings.reminder,
      ...sanitizedReminder
    };
    saveSettings();
    scheduleReminder();
    return { success: true };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    title: 'Vocabulary Flashcard App',
    backgroundColor: '#667eea'
  });

  // Load the app
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);
}

app.on('ready', () => {
  loadSettings();
  createWindow();
  setupIPCHandlers();
  scheduleReminder();
});

app.on('before-quit', () => {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

