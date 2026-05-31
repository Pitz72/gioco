import { app, BrowserWindow, ipcMain, screen } from 'electron';
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

/* Valida l'id slot e ricava un nome file sicuro. Senza questo controllo un id
   non intero o fuori range permetterebbe path traversal (es. "../config")
   sul filesystem dell'utente (BUG B5). */
function slotFilename(id: unknown): string | null {
    if (typeof id !== 'number' || !Number.isInteger(id) || id < -1 || id > 4) return null;
    return id === -1 ? 'autosave.json' : `slot-${id}.json`;
}

ipcMain.handle('storage:writeSlot', (_event, id: number, data: string) => {
    const filename = slotFilename(id);
    if (!filename || typeof data !== 'string') throw new Error('Parametri di salvataggio non validi.');
    try {
        fs.writeFileSync(path.join(getSavesDir(), filename), data, 'utf-8');
    } catch (err) {
        // Propaga al renderer (la Promise IPC verrà rigettata e gestita lì) ma logga
        // nel main così un errore di scrittura non resta silenzioso (BUG B4).
        console.error('[storage] writeSlot fallito:', err);
        throw err;
    }
});

ipcMain.handle('storage:readSlot', (_event, id: number): string | null => {
    const filename = slotFilename(id);
    if (!filename) return null;
    try {
        const filepath = path.join(getSavesDir(), filename);
        return fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : null;
    } catch (err) {
        console.error('[storage] readSlot fallito:', err);
        return null;
    }
});

ipcMain.handle('storage:writeSettings', (_event, data: string) => {
    if (typeof data !== 'string') throw new Error('Impostazioni non valide.');
    try {
        fs.writeFileSync(getSettingsPath(), data, 'utf-8');
    } catch (err) {
        console.error('[storage] writeSettings fallito:', err);
        throw err;
    }
});

ipcMain.handle('storage:readSettings', (): string | null => {
    try {
        const filepath = getSettingsPath();
        return fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : null;
    } catch (err) {
        console.error('[storage] readSettings fallito:', err);
        return null;
    }
});

/* ─── Finestra principale ──────────────────────────────────────────────── */
function createWindow() {
    const isDev = !app.isPackaged;

    // Su Linux, senza specificare il display, Electron apre in fullscreen
    // sul monitor con il focus attivo (spesso il secondario in setup multi-monitor).
    // getPrimaryDisplay() garantisce l'apertura sempre sul monitor principale.
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y } = primaryDisplay.bounds;

    const win = new BrowserWindow({
        width: 1920,
        height: 1080,
        x,
        y,
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
