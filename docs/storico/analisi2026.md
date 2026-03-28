# ANALISI COMPLETA: "IL RELITTO SILENTE"
## Audit di Codice, Documentazione e Repository
**Data:** 2026-03-20
**Versione analizzata:** 1.0.1 (Gold Master)
**Obiettivo:** Identificare tutti i problemi del progetto in preparazione alla revisione completa, al miglioramento estetico e alla nuova redistribuzione.

---

## PANORAMICA GENERALE

| Aspetto | Valutazione |
|---|---|
| Stack tecnologico | Moderno e coerente (React 19 + Vite 8 + TS 5.9 + Electron 41) |
| Architettura | Modulare, ben strutturata in layers |
| Qualità narrativa | Alta, coerente con l'obiettivo |
| Sincronizzazione doc↔codice | **Mediocre** — divergenze sostanziali in walkthrough e comandi |
| Ordine repository | **Sufficiente** — presenza di file morti, placeholder e codice debug |
| Completezza feature | **Incompleta** — feature documentate ma non implementate (Sintonizzatore come "comando autonomo", Gemini Service) |

---

## CRITICITÀ GRAVISSIME

### G1 — `game/rooms/index.ts` è codice morto e incompleto

**File:** `game/rooms/index.ts`
**Impatto:** Confusione architetturale + bug latente

Il file `index.ts` esporta `allRooms` (barrel export), ma **non viene importato da nessuna parte** del progetto. `gameData.ts` importa ogni stanza direttamente. Il file è quindi completamente **morto**.

Peggio: manca l'import di `laboratoriRisonanzaRoom`, quindi l'oggetto `allRooms` che esporta ha solo 13 stanze su 14, senza "Laboratori di Risonanza". Se qualcuno usasse `index.ts` come entry per il mondo di gioco, il gioco sarebbe rotto.

```typescript
// game/rooms/index.ts — NON importa laboratoriRisonanza
// NON importato da nessun file del progetto
export const allRooms = { ... /* 13 stanze */ };
```

**Azione correttiva:** Eliminare il file oppure correggerlo e fare in modo che `gameData.ts` lo usi come unica fonte di verità.

---

### G2 — MANUALE.md walkthrough (Sezione 4) completamente errato

**File:** `MANUALE.md:50–58`
**Impatto:** Il file distribuito con il gioco fornisce istruzioni sbagliate ai giocatori

La "Fase 1" del walkthrough dice:

```
2.  **Stiva:**
    - USA TUTA (Indossala)
    - VAI EST (E) -> Plancia.
    - VAI SUD (S) -> Corridoio.    ← SBAGLIATO
```

**Plancia non ha uscita a SUD.** Il comando `VAI SUD` da Plancia restituisce "Non puoi andare in quella direzione" (confermato in `plancia.ts:39`). Il percorso reale dell'Atto I richiede:

> Stiva → **Scafo Esterno** (VAI SUD) → analizza scafo, usa taglierina → **Camera di Compensazione** → usa batteria, apri porta → **Corridoio Principale**

Il MANUALE.md salta completamente 2 stanze e 3 puzzle dell'Atto I. Il giocatore che segue queste istruzioni si blocca immediatamente.

*(Contrasto: SOLUZIONE.md è corretto e descrive il percorso reale)*

**Azione correttiva:** Riscrivere la Sezione 4 del MANUALE.md allineandola a SOLUZIONE.md.

---

### G3 — `index.html` (e `dist/index.html`) contiene importmap verso CDN di terze parti

**File:** `index.html:12–22`, `dist/index.html:13–23`
**Impatto:** Dipendenza da CDN esterno, problema di sicurezza, presente anche nel build distribuito

```html
<script type="importmap">
{
  "imports": {
    "react": "https://aistudiocdn.com/react@^19.2.0",
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.2.0/",
    "@google/genai": "https://aistudiocdn.com/@google/genai@^1.28.0",
    "lodash.clonedeep": "https://aistudiocdn.com/lodash.clonedeep@^4.5.0"
  }
}
</script>
```

Questo importmap è un residuo di **Google AI Studio** (dove il progetto sembra essere stato prototipato). È presente anche nel **build di produzione** (`dist/index.html`). Conseguenze:

- Il bundle Vite è self-contained, quindi l'importmap non impatta il funzionamento normale nella maggior parte dei casi
- Ma **Electron usa Chromium** che supporta nativamente gli importmap: se il bundle avesse una singola `import 'react'` non inlineata, tenterebbe di scaricarla da `aistudiocdn.com`
- La presenza di un CDN esterno nel codice distribuito è un **vettore di supply chain attack**
- L'app non è veramente offline-first come dichiarato nel README ("base: './'")

**Azione correttiva:** Rimuovere l'intero blocco `<script type="importmap">` da `index.html`. Il build Vite bundla tutto in autonomia.

---

## CRITICITÀ GRAVI

### GR1 — Sinonimi ambigui nel Corridoio Principale: `ESAMINA PORTA` è sempre la porta Nord

**File:** `game/rooms/corridoioPrincipale.ts:85–129`
**Impatto:** Bug di gameplay — 5 porte hanno lo stesso sinonimo `"porta"`

```typescript
{ id: 'porta_nord',     synonyms: ['porta'], ... }      // Trovata sempre per prima
{ id: 'porta_sud',      synonyms: ['porta'], ... }
{ id: 'porta_ovest',    synonyms: ['porta', 'grande porta'], ... }
{ id: 'porta_est',      synonyms: ['porta', 'entrata'], ... }
{ id: 'porta_laterale', synonyms: ['porta', 'alloggi', ...], ... }
```

`gameLogic.ts:147` usa `Array.find()` che ritorna il **primo match**. Digitando `ESAMINA PORTA` si ottiene sempre la descrizione della porta nord, rendendo impossibile esaminare le altre porte tramite il termine generico.

**Azione correttiva:** Rimuovere il sinonimo generico `'porta'` dagli item individuali e aggiungere un comando specifico per `ESAMINA PORTA` che restituisca una descrizione aggregata di tutte le uscite, oppure rinominare i sinonimi in modo univoco (`'porta nord'`, `'porta sud'`, ecc.).

---

### GR2 — Sistema `USA X SU Y` cerca la sorgente solo nella stanza corrente, mai nell'inventario

**File:** `game/gameLogic.ts:195–224`
**Impatto:** Feature documentata ma implementata a metà

```typescript
// Cerchiamo la sorgente (per ora solo nella stanza, in futuro nel registro globale)
const sourceItem = currentRoomData.items.find(i => ...);
```

Il commento inline conferma che è incompleto. Tutti i puzzle critici (`USA TAGLIERINA SU CREPA`, `USA BATTERIA SU PANNELLO`, ecc.) funzionano solo perché sono gestiti da **room-specific commands** nella lista `commands[]`, non dall'item system. Se un puzzle futuro venisse aggiunto solo all'item system, fallirebbe silenziosamente.

**Azione correttiva:** Estendere la ricerca della sorgente anche all'inventario del giocatore (`newState.inventory`) usando una lookup per nome/sinonimi.

---

### GR3 — `@google/genai` come dipendenza di produzione, `geminiService.ts` completamente vuoto

**File:** `package.json:13`, `services/geminiService.ts`
**Impatto:** Bundle size gonfiato inutilmente, feature fantasma

`geminiService.ts` contiene solo una riga vuota. `@google/genai ^1.28.0` è listata in `dependencies` (non `devDependencies`), quindi viene bundlata in produzione. È una libreria AI pesante inclusa senza mai essere usata.

**Azione correttiva:** Rimuovere `@google/genai` da `package.json` oppure implementare il servizio se si vuole usare Gemini. Nel frattempo, eliminare il file `geminiService.ts` o sostituirlo con un placeholder documentato.

---

### GR4 — Commenti di debug ("Maledizione") nel codice di produzione Gold Master

**File:** `game/rooms/ponteDiComando.ts:52–64`
**Impatto:** Qualità del codebase, segnala design incompiuto

```typescript
onUse: (state) => {
    // Hack per gestire "ESAMINA MAPPA" che triggera la conoscenza
    // Item.details è string.
    // Maledizione.
    // Allora devo usare un comando custom per ESAMINA MAPPA se voglio settare il flag.
    return { description: "Non puoi usarla, è un ologramma.", eventType: 'error' };
}
```

Commenti di frustrazione e ragionamento in-progress lasciati nel codice. Indicano anche un **limite di design non risolto**: il tipo `Item.details` è `string` e non può avere side-effects su `state`, costringendo a usare room commands custom anche per interazioni che logicamente apparterebbero all'item system.

**Azione correttiva:** Pulire i commenti. Valutare se estendere il tipo `Item` con `onAnalyze?: (state: PlayerState) => CommandHandlerResult` per gestire side-effects su ANALIZZA.

---

### GR5 — `normalizedCommand === 'i'` è dead code irraggiungibile

**File:** `game/gameLogic.ts:93`
**Impatto:** Logica mai eseguita, potenzialmente fuorviante

```typescript
if (normalizedCommand === 'inventario' || normalizedCommand === 'i') {
```

`normalizeCommand()` converte `'i'` in `'inventario'` a riga 42. Quando si arriva alla riga 93, `normalizedCommand` non può mai essere `'i'`. Il check `=== 'i'` non viene mai eseguito.

**Azione correttiva:** Rimuovere la condizione `|| normalizedCommand === 'i'`.

---

### GR6 — Regex di room commands ricompilata ad ogni comando digitato

**File:** `game/gameLogic.ts:108`
**Impatto:** Performance degradata ad ogni input

```typescript
for (const cmd of currentRoomData.commands) {
    const match = normalizedCommand.match(new RegExp(cmd.regex, 'i')); // nuovo RegExp ogni chiamata
```

Ogni pressione di Invio ricompila tutte le regex della stanza corrente. Le regex andrebbero precompilate una sola volta.

**Azione correttiva:** Precompilare le regex al momento della definizione di ogni `Command`, o cachearle in una `Map<string, RegExp>` inizializzata all'avvio.

---

### GR7 — Placeholder non sostituiti nel prodotto distribuito

**File:** `LEGGIMI.txt:21`, `package.json:45`

- `LEGGIMI.txt` (file distribuito agli utenti finali) riporta: `"Tuo Nome/Studio"`
- `package.json` ha `appId: "com.tuonome.relittosilente"` — visibile nell'installer Windows (.exe) generato con NSIS

Questi placeholder sono presenti nel prodotto finito e distribuito agli utenti.

**Azione correttiva:** Sostituire con nome/studio reale e un appId appropriato.

---

## CRITICITÀ MEDIE

### M1 — `INDOSSA TUTA` non funziona, produce errore confuso

**File:** `game/gameLogic.ts:141`, `game/rooms/stiva.ts:42`
**Impatto:** Comando documentato nel MANUALE non funziona come atteso

Il verbo `indossa` **non è** nel verb set del sistema items (`esamina|guarda|analizza|prendi|raccogli|usa|attiva`). Digitando `INDOSSA TUTA` si cade nel generic fallback (riga 267) che risponde: *"Cosa vuoi indossare con 'tuta spaziale'? Devi essere più specifico (es. USA TUTA SPAZIALE SU ...)"* — messaggio fuorviante. Si deve digitare `USA TUTA`.

Il MANUALE documenta `INDOSSA [oggetto]` nella tabella comandi senza specificare questa limitazione.

**Azione correttiva:** Aggiungere `indossa` al verb set del sistema items in `gameLogic.ts`, oppure gestirlo come alias di `usa` nel `normalizeCommand()`.

---

### M2 — MANUALE.md descrive `SINTONIZZATORE` come "comando autonomo", funziona solo come `USA SINTONIZZATORE`

**File:** `MANUALE.md:30`, `laboratoriRisonanza.ts:38`

Il MANUALE dice: *"SINTONIZZATORE: Un comando speciale disponibile solo dopo aver trovato l'oggetto specifico."* — implica che digitare `SINTONIZZATORE` da solo sia un comando. In realtà è un oggetto `Item` con `onUse`, quindi funziona solo con `USA SINTONIZZATORE`. Il comando `SINTONIZZATORE` da solo non viene riconosciuto dal parser.

**Azione correttiva:** Aggiornare il MANUALE, oppure aggiungere `sintonizzatore` come alias in `normalizeCommand()` che lo espande in `usa sintonizzatore`.

---

### M3 — `USA MONTACARICHI` documentato nel MANUALE non funziona

**File:** `MANUALE.md:86`, `corridoioPrincipale.ts:163`

Il MANUALE dice: *"Dal Corridoio, vai GIU (o USA MONTACARICHI)"*.
Il regex del movimento verso il basso è `^((vai|va) )?(basso|giu|montacarichi)$` — quindi `MONTACARICHI` funziona, ma `USA MONTACARICHI` finisce nel sistema items che trova l'item `montacarichi` (isFixed=true, nessun onUse) e non risponde con il movimento.

**Azione correttiva:** Aggiornare il MANUALE con il comando corretto (`MONTACARICHI` o `GIU`), oppure aggiungere `onUse` all'item montacarichi per reindirizzare al movimento.

---

### M4 — La meccanica "Echi Temporali" (`echoes: string[]`) è implementata ma non consultabile

**File:** `types.ts:17`, `laboratoriRisonanza.ts:38–68`
**Impatto:** Feature narrativa dichiarata nel README incompleta

Il Sintonizzatore registra eco-id in `state.echoes`, ma non esiste alcun comando `ECHI`, `MOSTRA ECHI`, o simile per riascoltarli. Il campo `echoes` viene popolato ma mai letto per mostrare contenuto al giocatore. La meccanica esiste per metà.

**Azione correttiva:** Aggiungere un comando `ECHI` o `MOSTRA ECHI` in `processCommand()` che legga `state.echoes` e mostri i testi registrati.

---

### M5 — `vite.config.ts` espone variabili d'ambiente API nel bundle

**File:** `vite.config.ts:15–16`

```typescript
define: {
    'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

Se un file `.env` venisse aggiunto con una chiave API reale, Vite la inlinerebbe nel bundle JS distribuito **in chiaro**. Non esiste `.env.example` né documentazione del rischio.

**Azione correttiva:** Se Gemini non viene usato, rimuovere queste righe. Se viene usato, aggiungere `.env` a `.gitignore` (già presente) e documentare il rischio di includere la chiave nel bundle desktop.

---

### M6 — `tailwind.config.js` non scannerizza i file di stanza

**File:** `tailwind.config.js:3`

```javascript
content: ["./index.html", "./App.tsx", "./components/**/*.{js,ts,jsx,tsx}"]
```

I file in `game/rooms/*.ts` e `game/*.ts` **non sono inclusi**. Se i file di stanza aggiungessero classi Tailwind in stringhe HTML, verrebbero purgati in produzione.

**Azione correttiva:** Aggiungere `"./game/**/*.ts"` alla lista `content`.

---

### M7 — `dangerouslySetInnerHTML` usato con contenuto semi-dinamico

**File:** `App.tsx:149`, `App.tsx:192`, `App.tsx:212`

```tsx
<div dangerouslySetInnerHTML={{ __html: displayedText }} />
// e
setOutput(prev => [...prev, `\n<div class="whitespace-pre-wrap">${visible}</div>`]);
```

L'`instructionsText` è hardcoded (sicuro), ma l'output del gioco include descrizioni delle stanze. Se una stanza avesse un testo con caratteri `<`, `>`, o `&` non escaped, potrebbe causare rendering HTML anomalo. Non è XSS critico (non c'è input utente nelle descrizioni), ma è un anti-pattern architetturale che diventa rischioso se il progetto viene espanso.

**Azione correttiva:** Usare un componente React che gestisce il rendering in modo sicuro, o sanitizzare esplicitamente l'output con una libreria come `dompurify`.

---

## CRITICITÀ LEGGERE

### L1 — `electron/main.ts` usa icona diversa da quella del build-builder

**File:** `electron/main.ts:11`, `package.json:39`

`main.ts` riferisce `'../public/favicon.png'` come icona della finestra Electron, mentre `electron-builder` usa `"public/app-icon.png"` per l'installer. Due file di icona diversi, potenziale inconsistenza visiva tra finestra e icona nel sistema operativo.

**Azione correttiva:** Allineare i riferimenti a un unico file icona.

---

### L2 — `boot_screen.png` non processata da Vite (nessun hash nel filename)

**File:** `BootScreen.tsx:53`, `dist/boot_screen.png`

```tsx
src="./boot_screen.png"  // path hardcoded, non importato come asset Vite
```

Il file viene copiato as-is in `dist/` senza fingerprinting. Nessuna invalidazione cache automatica tra versioni del build.

**Azione correttiva:** Importare l'immagine con `import bootScreenImg from '../public/boot_screen.png'` per farla processare da Vite con hash nel nome.

---

### L3 — Google Fonts caricato da CDN esterno → non funziona offline

**File:** `index.html:11`

```html
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```

Senza connessione internet, il font non carica e il fallback è `monospace` generico. L'intera estetica retro viene compromessa. Non documentato in nessun file.

**Azione correttiva:** Scaricare il font `Press Start 2P` localmente nella cartella `public/fonts/` e referenziarlo con `@font-face` in `index.css`.

---

### L4 — `MANUALE.md` header versione non aggiornata

**File:** `MANUALE.md:1`, `package.json:3`

Il MANUALE riporta `v1.0.0 (Gold Master)` mentre il progetto è alla `v1.0.1`.

**Azione correttiva:** Aggiornare l'header del MANUALE a `v1.0.1` e mantenere la versione sincronizzata con `package.json`.

---

### L5 — `game/rooms/index.ts`: manca import di `laboratoriRisonanzaRoom`

**File:** `game/rooms/index.ts`
*(Vedi anche G1 — questo file è già dead code)*

Il file barrel, oltre ad essere inutilizzato, non importa `laboratoriRisonanzaRoom`. L'`allRooms` che esporta è strutturalmente incompleto rispetto al mondo reale di gioco.

**Azione correttiva:** Eliminare il file (soluzione raccomandata in G1).

---

## TABELLA RIEPILOGATIVA COMPLETA

| ID | Gravità | Titolo | File principale | Impatto diretto | Stato |
|---|---|---|---|---|---|
| G1 | 🔴 GRAVISSIMA | `index.ts` barrel morto e incompleto | `game/rooms/index.ts` | Architettura confusa, bug latente | ✅ RISOLTO |
| G2 | 🔴 GRAVISSIMA | Walkthrough MANUALE.md errato | `MANUALE.md:50–58` | Giocatori bloccati | ✅ RISOLTO |
| G3 | 🔴 GRAVISSIMA | importmap CDN esterno nel dist | `index.html`, `dist/index.html` | Sicurezza, dipendenza remota | ✅ RISOLTO |
| GR1 | 🟠 GRAVE | Sinonimi duplicati "porta" in Corridoio | `corridoioPrincipale.ts` | Bug gameplay: sempre porta nord | ✅ RISOLTO |
| GR2 | 🟠 GRAVE | `USA X SU Y` cerca source solo in stanza | `gameLogic.ts:207` | Feature incompleta | ✅ RISOLTO |
| GR3 | 🟠 GRAVE | `geminiService.ts` vuoto, lib in produzione | `package.json`, `geminiService.ts` | Bundle gonfiato, feature fantasma | ✅ RISOLTO |
| GR4 | 🟠 GRAVE | Commenti debug nel Gold Master | `ponteDiComando.ts:52–64` | Qualità codice, design incompiuto | ✅ RISOLTO |
| GR5 | 🟠 GRAVE | `=== 'i'` è dead code irraggiungibile | `gameLogic.ts:93` | Logica falsa | ✅ RISOLTO |
| GR6 | 🟠 GRAVE | Regex ricompilata ad ogni comando | `gameLogic.ts:108` | Performance | ✅ RISOLTO |
| GR7 | 🟠 GRAVE | Placeholder non sostituiti nel distribuito | `LEGGIMI.txt`, `package.json` | Credibilità prodotto | ✅ RISOLTO |
| M1 | 🟡 MEDIA | `INDOSSA` non funziona, errore confuso | `gameLogic.ts:141` | UX degradata | ✅ RISOLTO |
| M2 | 🟡 MEDIA | SINTONIZZATORE mal documentato | `MANUALE.md:30` | Giocatore disorientato | ✅ RISOLTO |
| M3 | 🟡 MEDIA | `USA MONTACARICHI` non funziona | `MANUALE.md:86` | Doc/codice divergono | ✅ RISOLTO |
| M4 | 🟡 MEDIA | Echi Temporali: `echoes` mai letto | `types.ts:17` | Feature a metà | ✅ RISOLTO |
| M5 | 🟡 MEDIA | API key potenzialmente inlineabile | `vite.config.ts:15` | Sicurezza potenziale | ✅ RISOLTO |
| M6 | 🟡 MEDIA | Tailwind non scannerizza `game/rooms/` | `tailwind.config.js` | Purge fragile | ✅ RISOLTO |
| M7 | 🟡 MEDIA | `dangerouslySetInnerHTML` su output semi-dinamico | `App.tsx:149,192` | Anti-pattern sicurezza | ✅ RISOLTO |
| L1 | 🟢 LIEVE | Icone Electron discordanti | `main.ts:11`, `package.json` | Inconsistenza visiva | ✅ RISOLTO |
| L2 | 🟢 LIEVE | `boot_screen.png` senza hash Vite | `BootScreen.tsx:53` | Nessuna cache invalidation | ✅ RISOLTO |
| L3 | 🟢 LIEVE | Font da CDN, non funziona offline | `index.html:11` | UX offline compromessa | ✅ RISOLTO |
| L4 | 🟢 LIEVE | MANUALE.md versione non aggiornata | `MANUALE.md:1` | Confusione versioning | ✅ RISOLTO |
| L5 | 🟢 LIEVE | `index.ts` manca import Laboratori | `game/rooms/index.ts` | File già morto (vedi G1) | ✅ RISOLTO |

---

## SINCRONIZZAZIONE DOCUMENTAZIONE ↔ CODICE

| Documento | Accuratezza | Note |
|---|---|---|
| `README.md` | ✅ Buona | Descrive correttamente stack, feature e istruzioni di build |
| `SOLUZIONE.md` | ✅ Buona | Walkthrough corretto e verificato contro il codice |
| `MANUALE.md` | ⚠️ Parziale | Walkthrough Fase 1 errato (G2), comandi avanzati mal descritti (M2, M3) |
| `LEGGIMI.txt` | ⚠️ Parziale | Placeholder "Tuo Nome/Studio" non sostituito (GR7) |
| `log/*.md` | ✅ Buona | Changelog dettagliato e affidabile, riflette la storia reale del progetto |

---

## PRIORITÀ DI INTERVENTO SUGGERITA

### Fase 1 — Correzioni critiche (da fare prima di qualsiasi altra cosa)
1. ~~**G2** — Riscrivere il walkthrough di `MANUALE.md`~~ ✅ **v1.0.4**
2. ~~**G1 + L5** — Eliminare `game/rooms/index.ts`~~ ✅ **v1.0.3**
3. ~~**G3** — Rimuovere l'importmap CDN da `index.html`~~ ✅ **v1.0.2**
4. ~~**GR7** — Sostituire i placeholder in `LEGGIMI.txt` e `package.json`~~ ✅ **v1.0.6**
5. ~~**GR5** — Rimuovere il dead code `=== 'i'`~~ ✅ **v1.0.5**

### Fase 2 — Fix di gameplay e qualità codice
6. ~~**GR1** — Disambiguare i sinonimi delle porte nel Corridoio Principale~~ ✅ **v1.0.9**
7. ~~**M1** — Aggiungere `indossa` come alias di `usa` nel normalizer~~ ✅ **v1.0.11**
8. ~~**M2 + M3** — Correggere le descrizioni dei comandi nel MANUALE~~ ✅ **v1.0.4**
9. ~~**GR4** — Pulire i commenti debug in `ponteDiComando.ts`~~ ✅ **v1.0.7**
10. ~~**GR6** — Precompilare le regex dei comandi~~ ✅ **v1.0.8**

### Fase 3 — Completamento feature
11. ~~**GR2** — Estendere `USA X SU Y` per cercare nell'inventario~~ ✅ **v1.0.10**
12. ~~**M4** — Implementare comando `ECHI` per consultare gli echi registrati~~ ✅ **v1.0.12**
13. ~~**GR3** — Rimuovere `@google/genai` o implementare `geminiService.ts`~~ ✅ **v1.0.2**

### Fase 4 — Hardening e qualità
14. ~~**G3 (follow-up)** — Verificare che il build Electron sia completamente offline~~ ✅ **v1.0.2**
15. ~~**L3** — Font locale invece di Google CDN~~ ✅ **v1.0.16** (`@fontsource/press-start-2p`)
16. ~~**L1** — Unificare le icone Electron~~ ✅ **v1.0.14** + fullscreen desktop
17. ~~**L2** — Importare `boot_screen.png` come asset Vite~~ ✅ **v1.0.15**
18. ~~**M5** — Rimuovere le `define` per l'API key da `vite.config.ts`~~ ✅ **v1.0.2**
19. ~~**M6** — Aggiungere `game/**/*.ts` a `tailwind.config.js`~~ ✅ **v1.0.2** (Tailwind 4 auto-scan)
20. ~~**M7** — Valutare sanitizzazione output con `dompurify`~~ ✅ **v1.0.13** (tipo `OutputLine`)
21. ~~**L4** — Sincronizzare versione in `MANUALE.md`~~ ✅ **v1.0.4**

---

## STORICO VERSIONI

| Versione | Data | Criticità risolte |
|---|---|---|
| v1.0.2 | 2026-03-20 | G3, GR3, M5, M6 (+ aggiornamento intero stack, 0 vulnerabilità npm) |
| v1.0.3 | 2026-03-20 | G1, L5 |
| v1.0.4 | 2026-03-20 | G2, M2, M3, L4 |
| v1.0.5 | 2026-03-20 | GR5 — dead code `=== 'i'` rimosso da `gameLogic.ts` |
| v1.0.6 | 2026-03-20 | GR7 — placeholder sostituiti in `LEGGIMI.txt` e `package.json` |
| v1.0.7 | 2026-03-20 | GR4 — commenti debug rimossi da `ponteDiComando.ts` |
| v1.0.8 | 2026-03-20 | GR6 — regex precompilate con cache a livello di modulo in `gameLogic.ts` |
| v1.0.9 | 2026-03-20 | GR1 — sinonimi `'porta'` disambiguati in `corridoioPrincipale.ts` |
| v1.0.10 | 2026-03-20 | GR2 — `USA X SU Y` esteso a cercare la sorgente nell'inventario |
| v1.0.11 | 2026-03-20 | M1 — `INDOSSA` → `USA` alias in `normalizeCommand()` |
| v1.0.12 | 2026-03-20 | M4 — Comando `ECHI` per consultare gli echi temporali registrati |
| v1.0.13 | 2026-03-20 | M7 — Tipo `OutputLine` discriminato; `dangerouslySetInnerHTML` rimosso dal percorso critico |
| v1.0.14 | 2026-03-20 | L1 — Icone Electron allineate a `app-icon.png`; fullscreen nativo in produzione; titolo ripulito |
| v1.0.15 | 2026-03-20 | L2 — `boot_screen.png` spostato in `assets/` e importato come modulo Vite con hash |
| v1.0.16 | 2026-03-20 | L3 — Font `Press Start 2P` self-hosted via `@fontsource`; rimossa dipendenza Google CDN |
| v1.0.17 | 2026-03-20 | Revisione estetica e documentazione: effetto CRT premium (fosforo P1, vignette, grana, persistenza cursore, sfarfallio); istruzioni in-game riscritte e ampliate (2 pagine complete); boot screen allineata cromaticamente al fosforo P1, fix layout "PRESS ANY KEY"; font ricalcolati proporzionalmente (1920×1080); sincronizzazione versione in tutti i file di documentazione |
| v1.0.18 | 2026-03-20 | UX: footer fisso F1–F5 stile DOS (Istruzioni/Gioca/Carica/Salva/Esci) sostituisce il vecchio menu testuale; layout bezel+schermo inset come vecchi monitor CRT; testo intro e testo di gioco uniformati alla stessa dimensione (1.35rem); fix disallineamento verticale cursore/testo nel parser |
| v1.0.19 | 2026-03-20 | Rifiniture CRT: boot screen allineata al fosforo P1 con grayscale+mix-blend-mode:multiply; sistema salvataggio in-game a 5 slot localStorage (sostituisce finestra OS); cursore parser posizionato a x=0 sovrapposto al placeholder |
| v1.1.0  | 2026-03-20 | Parser: distanza di Levenshtein per suggerimento fuzzy "intendi...?"; item system riscritto (percorsi USA X SU Y e VERBO X nettamente separati, lookup inventario globale); onAnalyze callback su Item (cilindro, stele, nucleo); puzzle tre punte: hint contestuali + regex espansa; ANALIZZA funziona da qualsiasi stanza per oggetti in inventario |

---

*Fine dell'analisi. Documento generato il 2026-03-20. Ultimo aggiornamento: v1.1.0 — **tutte le 21 criticità risolte**. Il gioco è ora nella fase di miglioramento estetico e tecnico verso la distribuzione pubblica.*
