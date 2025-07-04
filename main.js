const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const dailyNotesDir = path.join(app.getPath('documents'), 'DailyNotes');
function getTodayNoteFilePath() {
  const today = new Date().toISOString().slice(0, 10); // "2025-07-13"
  return path.join(dailyNotesDir, `${today}.txt`);
}


// 🔹 Auto-launch support
const AutoLaunch = require('auto-launch');

const appAutoLauncher = new AutoLaunch({
  name: 'StickyNotepad', // Change to your app's name
  path: app.getPath('exe'),
});

// Ensure auto-launch is enabled by default (can be toggled later)
appAutoLauncher.isEnabled().then((isEnabled) => {
  if (!isEnabled) {
    appAutoLauncher.enable().catch((err) => {
      console.error('Auto-launch enable failed:', err);
    });
  }
});

let mainWindow;
let isLocked = true;
let windowBounds = { x: 100, y: 100 }; // Default position

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    alwaysOnTop: true,
    skipTaskbar: true,
    x: windowBounds.x,
    y: windowBounds.y,
    show: false // Don't show until ready
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setFocusable(true);
  });

  mainWindow.on('moved', () => {
    windowBounds = mainWindow.getBounds();
  });

  mainWindow.webContents.on('context-menu', (event, params) => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: isLocked ? 'Unlock Position' : 'Lock Position',
        click: () => {
          isLocked = !isLocked;
          mainWindow.webContents.send('toggle-drag', !isLocked);
        }
      },
      { type: 'separator' },
      {
        label: 'Always on Top',
        type: 'checkbox',
        checked: mainWindow.isAlwaysOnTop(),
        click: () => {
          const currentState = mainWindow.isAlwaysOnTop();
          mainWindow.setAlwaysOnTop(!currentState, 'floating');
        }
      },
      { type: 'separator' },
      { 
        label: 'Quit',
        click: () => app.quit()
      }
    ]);
    
    contextMenu.popup({ window: mainWindow });
  });
}

// 📁 File operations — unchanged
// ...

// 🔌 IPC handlers for auto-start toggle
ipcMain.handle('auto-launch:get-status', async () => {
  return await appAutoLauncher.isEnabled();
});

ipcMain.handle('auto-launch:enable', async () => {
  try {
    await appAutoLauncher.enable();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('auto-launch:disable', async () => {
  try {
    await appAutoLauncher.disable();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
// 🔧 File Open Handler
ipcMain.handle('open-file', async () => {
  try {
    // Ensure the folder exists
    if (!fs.existsSync(dailyNotesDir)) {
      fs.mkdirSync(dailyNotesDir, { recursive: true });
    }

    const filePath = getTodayNoteFilePath();

    // If the file doesn't exist yet, create an empty one
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '', 'utf-8');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 🔧 File Save Handler
ipcMain.handle('save-file', async (event, content, filePath) => {
  let targetPath = filePath;

  if (!targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'Markdown Files', extensions: ['md'] }
      ],
      defaultPath: 'notepad-notes.txt'
    });

    if (result.canceled) return { success: false, canceled: true };
    targetPath = result.filePath;
  }

  try {
    fs.writeFileSync(targetPath, content, 'utf-8');
    return { success: true, filePath: targetPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

