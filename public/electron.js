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

  // Fetch Quizlet set data
  ipcMain.handle('quizlet:fetch', async (_event, quizletUrl) => {
    try {
      const https = require('https');
      const { URL } = require('url');

      // Parse Quizlet URL
      const url = new URL(quizletUrl);
      
      if (!url.hostname.includes('quizlet.com')) {
        return { success: false, error: 'Invalid Quizlet URL' };
      }

      return new Promise((resolve) => {
        const options = {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const terms = [];
              
              // Method 1: Extract from multiple JSON patterns
              const jsonPatterns = [
                /window\.Quizlet\["setPageData"\]\s*=\s*({.*?});/s,
                /window\.__INITIAL_STATE__\s*=\s*({.*?});/s,
                /"termIdToTermsMap":\s*({.*?}),/s,
                /"terms":\s*\[(.*?)\]/s
              ];

              for (const pattern of jsonPatterns) {
                const match = data.match(pattern);
                if (match) {
                  try {
                    const jsonStr = match[1];
                    const jsonData = JSON.parse(jsonStr);
                    
                    // Try different data structures
                    let termsList = jsonData?.studyModelsById?.termModels ||
                                   jsonData?.termIdToTermsMap ||
                                   jsonData?.terms;
                    
                    if (termsList && typeof termsList === 'object') {
                      for (const id in termsList) {
                        const item = termsList[id];
                        const term = item?.word || item?.term || item?.plainText || '';
                        const definition = item?.definition || item?._definition || '';
                        if (term && definition) {
                          terms.push({ 
                            term: term.toString().trim().replace(/[\n\r]+/g, ' '), 
                            definition: definition.toString().trim().replace(/[\n\r]+/g, ' ')
                          });
                        }
                      }
                    }
                    
                    if (terms.length > 0) break;
                  } catch (e) {
                    // Continue to next pattern
                  }
                }
              }

              // Method 2: HTML parsing with multiple patterns
              if (terms.length === 0) {
                const htmlPatterns = [
                  /<span[^>]*class="[^"]*TermText[^"]*"[^>]*>(.*?)<\/span>/gs,
                  /<div[^>]*class="[^"]*SetPageTerm-[^"]*"[^>]*>(.*?)<\/div>/gs,
                  /data-term="([^"]+)"[^>]*data-definition="([^"]+)"/g
                ];

                for (const pattern of htmlPatterns) {
                  const matches = [...data.matchAll(pattern)];
                  
                  if (pattern.source.includes('data-term')) {
                    // Direct attribute extraction
                    matches.forEach(match => {
                      const term = match[1]?.trim();
                      const definition = match[2]?.trim();
                      if (term && definition) {
                        terms.push({ term, definition });
                      }
                    });
                  } else {
                    // Pair-wise extraction
                    for (let i = 0; i < matches.length - 1; i += 2) {
                      const term = matches[i][1]?.replace(/<[^>]+>/g, '').trim();
                      const definition = matches[i + 1]?.[1]?.replace(/<[^>]+>/g, '').trim();
                      if (term && definition) {
                        terms.push({ term, definition });
                      }
                    }
                  }
                  
                  if (terms.length > 0) break;
                }
              }

              // Method 3: API endpoint fallback (if available)
              if (terms.length === 0) {
                const apiMatch = data.match(/"studyableItemId":"(\d+)"/);
                if (apiMatch) {
                  console.log('Found studyable ID:', apiMatch[1]);
                  // Could potentially call Quizlet API here
                }
              }

              if (terms.length === 0) {
                console.log('HTML preview:', data.substring(0, 1000));
                resolve({ 
                  success: false, 
                  error: 'Không tìm thấy từ vựng. Set có thể bị private hoặc Quizlet đã thay đổi cấu trúc. Thử Manual Import thay thế.' 
                });
              } else {
                console.log(`✅ Extracted ${terms.length} terms from Quizlet`);
                resolve({ 
                  success: true, 
                  terms,
                  count: terms.length 
                });
              }
            } catch (error) {
              console.error('Parse error:', error);
              resolve({ 
                success: false, 
                error: 'Lỗi khi parse dữ liệu: ' + error.message 
              });
            }
          });
        });

        req.on('error', (error) => {
          resolve({ 
            success: false, 
            error: 'Không thể kết nối tới Quizlet: ' + error.message 
          });
        });

        req.setTimeout(10000, () => {
          req.destroy();
          resolve({ 
            success: false, 
            error: 'Timeout - Quizlet không phản hồi' 
          });
        });

        req.end();
      });
    } catch (error) {
      return { 
        success: false, 
        error: 'Lỗi: ' + error.message 
      };
    }
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

