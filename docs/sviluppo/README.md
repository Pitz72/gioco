# IL RELITTO SILENTE
**Versione:** 1.1.37
**Stato:** Pre-distribuzione · test umano in corso

Un'avventura testuale di fantascienza con parser di comandi in linguaggio naturale, ispirata ai classici degli anni '80. L'intera esperienza è progettata per emulare l'estetica di un monitor a fosfori verdi.

---

## Trama

Sei il solitario pilota di una nave da carico che si imbatte in un'antica nave stellare aliena, alla deriva e silenziosa. Dovrai abbordare il relitto, esplorarne le vaste ali decadenti e raccogliere tre artefatti simbolici — la vita, la cultura, la memoria dei suoi costruttori — per accedere al cuore della nave e svelare il legame tra quella civiltà e l'umanità.

---

## Caratteristiche

- **Parser in linguaggio naturale italiano** con normalizzazione (articoli, dimostrativi, accenti, abbreviazioni, preposizioni articolate)
- **15 stanze** esplorabili, ognuna con TOCCA, ESAMINA, ANALIZZA coperti
- **Sistema Echi Temporali**: il Sintonizzatore di Frequenza capta le ultime voci dell'equipaggio in 11/15 stanze
- **5 profili audio ambientali procedurali** (Web Audio API): nave umana, alieno quieto, alieno freddo, alieno elettrico, sacro — con fade-in/fade-out puliti
- **Impostazioni audio** persistenti: toggle e volume separati per effetti e ambience (`IMPOSTAZIONI` in-game)
- **Sistema di salvataggio** a 5 slot + autosave su filesystem nativo via IPC Electron
- **Schermata pausa** con F9/ESC: Continua / Salva / Carica / Ricomincia / Esci
- **Sistema HINT contestuale** (`AIUTO` / `SUGGERIMENTO`): suggerimenti adattivi alla situazione
- **Barra di progressione traduzione** con percentuale visualizzata dopo ogni `ANALIZZA`
- **Statistiche fine partita** con rating su 4 livelli
- **Mappa ASCII progressiva** (`MAPPA` / F7) che si rivela man mano si esplorano le stanze
- **Inventario formattato** con contatore (`INVENTARIO` / F6)
- **Display virtuale 1920×1080** con scaling adattivo a qualsiasi finestra
- **Animazione typewriter** per i momenti narrativi chiave

---

## Stack Tecnologico

| Componente | Versione |
|---|---|
| React | 19.x |
| TypeScript | 5.9.x |
| Vite | 8.x |
| Tailwind CSS | 4.x |
| Electron | 41.x |
| electron-builder | 26.x |
| lodash.clonedeep | 4.5.x |
| Web Audio API | nativa (browser/Electron) |

---

## Comandi di Sviluppo

```bash
# Sviluppo web (localhost:3000)
npm run dev

# Build web ottimizzata
npm run build

# Test Electron in sviluppo
npm run electron:dev

# Build installer Windows (.exe in /release)
npm run electron:build
```

---

## Struttura File Chiave

```
game/
  echoData.ts           — testi e mapping degli echi temporali (unica fonte di verità)
  gameLogic.ts          — parser normalizeCommand + processCommand + HINT + statistiche
  gameData.ts           — registro di tutte le stanze
  rooms/                — 15 file stanza (*.ts)
services/
  audioService.ts       — SFX, ambience, impostazioni, localStorage
components/
  AudioSettingsOverlay  — overlay impostazioni audio
  PauseOverlay          — overlay pausa F9/ESC
  SaveLoadOverlay       — overlay salvataggio/caricamento
  IntroScreen           — intro animata stile documento di bordo
App.tsx                 — orchestrazione stato, F-key, overlay
```

---

## Tasti Funzione

| Tasto | Attivo | Azione |
|---|---|---|
| F1 | Menu | Istruzioni |
| F2 | Menu | Inizia partita |
| F3 | Menu/Gioco | Carica |
| F4 | Gioco | Salva |
| F5 | Sempre | Esci |
| F6 | Gioco | Inventario |
| F7 | Gioco | Mappa |
| F8 | Menu | Crediti |
| F9 / ESC | Gioco | Pausa |

---

## Comandi In-Game Speciali

| Comando | Descrizione |
|---|---|
| `AIUTO` / `SUGGERIMENTO` | Hint contestuale adattivo |
| `NOTA` / `DIARIO` | Log scoperte con barre di progressione |
| `MAPPA` | Mappa ASCII delle stanze esplorate |
| `INVENTARIO` / `I` | Lista oggetti in possesso |
| `ASPETTA` / `Z` | Lascia passare il tempo |
| `AUDIO` / `MUSICA` | Toggle audio ambientale on/off |
| `IMPOSTAZIONI` | Overlay impostazioni audio (volume + toggle) |
| `SALVA` / `CARICA` | Apre overlay gestione slot |
| `PULISCI` / `CLEAR` | Pulisce lo schermo e ridescrive la stanza |

---

## Stato Qualità

- `npx tsc --noEmit`: **zero errori**
- `npm audit`: **zero vulnerabilità**
- Simulazione walkthrough integrale v1.1.37: **nessun blocco critico, percorso completo verificato**
