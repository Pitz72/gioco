/* ─── Storage Service ──────────────────────────────────────────────────────
   Livello di astrazione unico per tutta la persistenza del gioco.

   Quando disponibile (Electron), usa il filesystem tramite IPC:
   - Salvataggi: <userData>/saves/slot-{id}.json  |  autosave.json
   - Impostazioni: <userData>/settings.json

   Fallback per la modalità web pura (npm run dev senza Electron):
   usa localStorage con le stesse chiavi dell'API precedente.

   Le preferenze audio sono caricate in memoria una volta sola all'avvio
   (initStorageSettings) e poi lette sincronamente — questo permette
   all'audioService di rimanere interamente sincrono.                     */

declare global {
    interface Window {
        electronAPI?: {
            writeSlot:     (id: number, data: string) => Promise<void>;
            readSlot:      (id: number) => Promise<string | null>;
            writeSettings: (data: string) => Promise<void>;
            readSettings:  () => Promise<string | null>;
        };
    }
}

const isElectron = (): boolean =>
    typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';

/* ─── Settings (preferenze audio) ─────────────────────────────────────────
   Cache in-memoria: initStorageSettings va chiamato una volta al boot
   prima che qualsiasi suono possa essere riprodotto.                     */
let settingsCache: Record<string, string> = {};

export async function initStorageSettings(): Promise<void> {
    if (isElectron()) {
        try {
            const raw = await window.electronAPI!.readSettings();
            settingsCache = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        } catch {
            settingsCache = {};
        }
    } else {
        // Dev mode: specchia le chiavi rilevanti da localStorage nella cache
        const keys = [
            'relitto_sfx_on', 'relitto_sfx_vol',
            'relitto_ambience_on', 'relitto_ambience_vol',
        ];
        for (const k of keys) {
            const v = localStorage.getItem(k);
            if (v !== null) settingsCache[k] = v;
        }
    }
}

/** Lettura sincrona dalla cache in-memoria. */
export function getSettingSync(key: string): string | null {
    return settingsCache[key] ?? null;
}

/** Scrittura sincrona nella cache + write-through asincrono su disco. */
export function setSetting(key: string, value: string): void {
    settingsCache[key] = value;
    if (isElectron()) {
        // fire-and-forget: le preferenze audio non richiedono conferma
        window.electronAPI!.writeSettings(JSON.stringify(settingsCache)).catch(() => {});
    } else {
        try { localStorage.setItem(key, value); } catch { /* quota exceeded, ignorabile */ }
    }
}

/* ─── Save slots ───────────────────────────────────────────────────────────
   id 0–4 = slot manuali  |  id -1 = autosave                            */

export async function writeSlotData(id: number, data: string): Promise<void> {
    if (isElectron()) {
        await window.electronAPI!.writeSlot(id, data);
    } else {
        const key = id === -1 ? 'relitto-autosave' : `relitto-slot-${id}`;
        try { localStorage.setItem(key, data); } catch { /* quota exceeded */ }
    }
}

export async function readSlotData(id: number): Promise<string | null> {
    if (isElectron()) {
        return window.electronAPI!.readSlot(id);
    } else {
        const key = id === -1 ? 'relitto-autosave' : `relitto-slot-${id}`;
        return localStorage.getItem(key);
    }
}
