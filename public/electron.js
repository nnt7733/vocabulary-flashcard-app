const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');
const schedule = require('node-schedule');

// Check if running in development mode
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';

let mainWindow;
const store = new Store({
  defaults: {
    openAtLogin: false,
    reminder: {
      enabled: false,
      hour: 8,
      minute: 0
    }
  }
});

let reminderJob = null;

function scheduleReminder() {
  if (reminderJob) {
    reminderJob.cancel();
    reminderJob = null;
  }

  const reminderSettings = store.get('reminder');

  if (reminderSettings?.enabled) {
    const { hour, minute } = reminderSettings;

    reminderJob = schedule.scheduleJob({ hour, minute, second: 0 }, () => {
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
    });

    if (reminderJob) {
      console.log(
        `Đã đặt lịch nhắc nhở hàng ngày vào ${hour.toString().padStart(2, '0')}:${minute
          .toString()
          .padStart(2, '0')}.`
      );
    }
  } else {
    console.log('Tính năng nhắc nhở đang tắt.');
  }
}

function setupIPCHandlers() {
  ipcMain.handle('settings:get', () => ({
    openAtLogin: store.get('openAtLogin'),
    reminder: store.get('reminder')
  }));

  ipcMain.handle('settings:set-open-at-login', async (_event, enabled) => {
    const openAtLogin = Boolean(enabled);
    store.set('openAtLogin', openAtLogin);

    if (!isDev) {
      try {
        app.setLoginItemSettings({
          openAtLogin,
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
    const normalizeNumber = (value, fallback, min, max) => {
      const parsed = Number(value);
      const safeValue = Number.isFinite(parsed) ? parsed : fallback;
      return Math.min(max, Math.max(min, safeValue));
    };

    const sanitizedReminder = {
      enabled: Boolean(reminderSettings?.enabled),
      hour: normalizeNumber(reminderSettings?.hour, 8, 0, 23),
      minute: normalizeNumber(reminderSettings?.minute, 0, 0, 59)
    };

    store.set('reminder', sanitizedReminder);
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
  createWindow();
  setupIPCHandlers();
  scheduleReminder();
});

app.on('before-quit', () => {
  if (reminderJob) {
    reminderJob.cancel();
    reminderJob = null;
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

