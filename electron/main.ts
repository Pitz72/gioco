import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

/* ─── Cartella salvataggi ──────────────────────────────────────────────────
   Crea la directory <userData>/saves la prima volta che viene richiesta.
   Su Windows: %APPDATA%\Il Relitto Silente\saves\                        */
function getSavesDir(): string {
    const dir = path.join(app.getPath('userData'), 'saves');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function getSettingsPath(): string {
    return path.join(app.getPath('userData'), 'settings.json');
}

/* ─── IPC handlers — storage ───────────────────────────────────────────────
   Il renderer non tocca mai il filesystem direttamente.
   slot id: 0-4 = salvataggi manuali, -1 = autosave.                     */
ipcMain.handle('storage:writeSlot', (_event, id: number, data: string) => {
    const filename = id === -1 ? 'autosave.json' : `slot-${id}.json`;
    fs.writeFileSync(path.join(getSavesDir(), filename), data, 'utf-8');
});

ipcMain.handle('storage:readSlot', (_event, id: number): string | null => {
    const filename = id === -1 ? 'autosave.json' : `slot-${id}.json`;
    const filepath = path.join(getSavesDir(), filename);
    return fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : null;
});

ipcMain.handle('storage:writeSettings', (_event, data: string) => {
    fs.writeFileSync(getSettingsPath(), data, 'utf-8');
});

ipcMain.handle('storage:readSettings', (): string | null => {
    const filepath = getSettingsPath();
    return fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : null;
});

/* ─── Finestra principale ──────────────────────────────────────────────── */
function createWindow() {
    const isDev = !app.isPackaged;

    const win = new BrowserWindow({
        width: 1920,
        height: 1080,
        fullscreen: !isDev,
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../public/app-icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    if (isDev) {
        win.maximize();
        win.loadURL('http://localhost:3000');
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
