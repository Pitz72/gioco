
import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { GameState, GameResponse, PlayerState, OutputLine } from './types';
import { processCommand, getStats, getInventarioHtml, getMappa } from './game/gameLogic';
import CommandLine from './components/CommandLine';
import TerminalOutput from './components/TerminalOutput';
import StartScreen from './components/StartScreen';
import GameOverScreen from './components/GameOverScreen';
import BootScreen from './components/BootScreen';
import SaveLoadOverlay, { loadSlotState, writeAutosave } from './components/SaveLoadOverlay';
import IntroScreen from './components/IntroScreen';
import { initStorageSettings } from './services/storageService';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  playSubmitSound,
  playItemSound,
  playMagicSound,
  playMoveSound,
  playErrorSound,
  playKeystrokeSound,
  startAmbience,
  toggleAmbience,
  isAmbienceEnabled,
} from './services/audioService';
import AudioSettingsOverlay from './components/AudioSettingsOverlay';
import PauseOverlay from './components/PauseOverlay';

const PAUSE_MARKER = "[PAUSE]";

const INITIAL_PLAYER_STATE: PlayerState = {
  location: 'Plancia della Santa Maria',
  inventory: [],
  flags: {},
  echoes: [],
  visitedRooms: ['Plancia della Santa Maria'],
};

const NATIVE_WIDTH  = 1920;
const NATIVE_HEIGHT = 1080;

const useGameScale = () => {
  const [scaleStyle, setScaleStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth  / NATIVE_WIDTH;
      const scaleY = window.innerHeight / NATIVE_HEIGHT;
      const scale  = Math.min(scaleX, scaleY);
      const scaledWidth  = NATIVE_WIDTH  * scale;
      const scaledHeight = NATIVE_HEIGHT * scale;
      setScaleStyle({
        position: 'absolute',
        transformOrigin: 'top left',
        transform: `scale(${scale})`,
        left: `${(window.innerWidth  - scaledWidth)  / 2}px`,
        top:  `${(window.innerHeight - scaledHeight) / 2}px`,
      });
    };
    window.addEventListener('resize', updateScale);
    updateScale();
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return scaleStyle;
};

const paginateText = (text: string | null): { visible: string; remaining: string | null } => {
  if (!text) return { visible: '', remaining: null };
  if (text.includes(PAUSE_MARKER)) {
    const parts = text.split(PAUSE_MARKER);
    return { visible: parts[0], remaining: parts.slice(1).join(PAUSE_MARKER) };
  }
  return { visible: text, remaining: null };
};

const BlinkingPrompt: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.5rem' }}>
    <span style={{ color: 'var(--p-main)' }}>{text}</span>
    <span
      className="animate-blink"
      style={{ display: 'inline-block', width: '0.65ch', height: '0.9em', background: 'var(--p-main)', marginLeft: '0.5em', flexShrink: 0 }}
    />
  </div>
);

/* ═══════════════════════════════════════════════
   FUNCTION KEY BAR — footer stile DOS/CP-M
   Sempre visibile dopo il boot, come nei vecchi
   sistemi operativi a terminale anni '80
   ═══════════════════════════════════════════════ */
interface FKeyBarProps {
  gameState: GameState;
  onF1: () => void;
  onF2: () => void;
  onF3: () => void;
  onF4: () => void;
  onF5: () => void;
  onF6: () => void;
  onF7: () => void;
  onF8: () => void;
  onF9: () => void;
}

const FunctionKeyBar: React.FC<FKeyBarProps> = ({ gameState, onF1, onF2, onF3, onF4, onF5, onF6, onF7, onF8, onF9 }) => {
  const isMenu    = gameState === GameState.StartMenu;
  const isInstr   = gameState === GameState.Instructions;
  const isPlaying = gameState === GameState.Playing;

  const keys: Array<{ id: string; label: string; active: boolean; fn: () => void }> = [
    { id: 'F1', label: 'ISTRUZIONI', active: isMenu,               fn: onF1 },
    { id: 'F2', label: 'GIOCA',      active: isMenu || isInstr,    fn: onF2 },
    { id: 'F3', label: 'CARICA',     active: isMenu || isPlaying,  fn: onF3 },
    { id: 'F4', label: 'SALVA',      active: isPlaying,            fn: onF4 },
    { id: 'F5', label: 'ESCI',       active: true,                 fn: onF5 },
    { id: 'F6', label: 'INVENTARIO', active: isPlaying,            fn: onF6 },
    { id: 'F7', label: 'MAPPA',      active: isPlaying,            fn: onF7 },
    { id: 'F8', label: 'CREDITI',    active: isMenu || isInstr,    fn: onF8 },
    { id: 'F9', label: 'PAUSA',      active: isPlaying,            fn: onF9 },
  ];

  return (
    <div className="fkey-bar" style={{ display: 'flex', height: '52px', flexShrink: 0 }}>
      {keys.map(({ id, label, active, fn }) => (
        <div
          key={id}
          className={`fkey-item ${active ? 'active' : ''}`}
          onClick={active ? fn : undefined}
          style={{ cursor: active ? 'pointer' : 'default', flex: 1 }}
        >
          <span className={`fkey-badge ${active ? '' : 'inactive'}`}>{id}</span>
          <span className="fkey-label" style={{ color: active ? 'var(--p-main)' : 'var(--p-dim)' }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   HEADER CRT — barra di stato superiore
   Mostra titolo + stanza corrente + décor status
   ═══════════════════════════════════════════════ */
interface CrtHeaderProps {
  gameState: GameState;
  location: string;
}

const CrtHeader: React.FC<CrtHeaderProps> = ({ gameState, location }) => {
  const isPlaying = gameState === GameState.Playing;
  return (
    <header className="crt-header" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 24px',
      flexShrink: 0,
    }}>
      {/* Sinistra: titolo sistema */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
        <span className="glow-text" style={{
          color: 'var(--p-main)',
          fontSize: '0.65rem',
          letterSpacing: '0.12em',
        }}>
          IL RELITTO SILENTE
        </span>
        <span className="header-divider" />
        <span style={{
          color: 'var(--p-bright)',
          fontSize: '0.55rem',
          letterSpacing: '0.08em',
          opacity: 0.8,
        }}>
          SISTEMA DI BORDO
        </span>
      </div>
      {/* Centro: stanza corrente (solo durante il gioco) */}
      {isPlaying && (
        <div style={{
          color: 'var(--p-dim)',
          fontSize: '0.5rem',
          letterSpacing: '0.1em',
          textAlign: 'center',
          opacity: 0.7,
        }}>
          POSIZIONE: <span style={{ color: 'var(--p-main)', opacity: 1 }}>{location.toUpperCase()}</span>
        </div>
      )}
      {/* Destra: stato sessione */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        color: 'var(--p-dim)',
        fontSize: '0.5rem',
        letterSpacing: '0.08em',
      }}>
        <span style={{ color: isPlaying ? 'var(--p-main)' : 'var(--p-dim)', opacity: isPlaying ? 0.9 : 0.4 }}>
          SESSIONE: {isPlaying ? 'ATTIVA' : 'INATTIVA'}
        </span>
        <span style={{ opacity: 0.3 }}>◈</span>
        <span style={{ opacity: 0.4 }}>SIG-ERR</span>
      </div>
    </header>
  );
};

/* ═══════════════════════════════════════════════
   MANUALE OPERATIVO — 2 pagine stile terminale
   ═══════════════════════════════════════════════ */
const instructionsText = `<div style="color:var(--p-main);height:100%;display:flex;flex-direction:column;justify-content:flex-start;gap:1.4rem;">

<div style="text-align:center;border-bottom:2px solid var(--p-dim);padding-bottom:1rem;">
  <div style="font-size:1.2rem;letter-spacing:0.15em;color:var(--p-bright);text-shadow:0 0 8px var(--p-glow-a);">╔══════════════════════════════════════════╗</div>
  <div style="font-size:1.3rem;letter-spacing:0.2em;color:var(--p-bright);text-shadow:0 0 10px var(--p-glow-a);padding:0.4rem 0;">MANUALE OPERATIVO  v1.1.38</div>
  <div style="font-size:1.2rem;letter-spacing:0.15em;color:var(--p-bright);text-shadow:0 0 8px var(--p-glow-a);">╚══════════════════════════════════════════╝</div>
  <div style="font-size:0.75rem;color:var(--p-dim);margin-top:0.5rem;">INTERFACCIA TERMINALE  ·  PROTOCOLLO DI INTERAZIONE  ·  PAGINA 1 / 2</div>
</div>

<div>
  <div style="font-size:0.85rem;color:var(--p-bright);letter-spacing:0.18em;margin-bottom:0.6rem;">[ COMANDI DI NAVIGAZIONE E OSSERVAZIONE ]</div>
  <table style="width:100%;border-collapse:collapse;font-size:0.78rem;line-height:2.0;">
    <tr><td style="color:var(--p-bright);width:22%;">GUARDA</td><td style="color:var(--p-dim);width:8%;">L</td><td>Ridescrive la stanza in cui ti trovi.</td></tr>
    <tr><td style="color:var(--p-bright);">ESAMINA [X]</td><td style="color:var(--p-dim);">X</td><td>Osserva visivamente un oggetto o elemento.</td></tr>
    <tr><td style="color:var(--p-bright);">VAI [dir]</td><td style="color:var(--p-dim);">N S E O</td><td>Spostati: Nord, Sud, Est, Ovest.</td></tr>
    <tr><td style="color:var(--p-bright);">VAI ALTO</td><td style="color:var(--p-dim);">U / A</td><td>Sali al livello superiore.</td></tr>
    <tr><td style="color:var(--p-bright);">VAI BASSO</td><td style="color:var(--p-dim);">D / B</td><td>Scendi al livello inferiore.</td></tr>
    <tr><td style="color:var(--p-bright);">INVENTARIO</td><td style="color:var(--p-dim);">I</td><td>Mostra cosa stai trasportando.</td></tr>
  </table>
</div>

<div>
  <div style="font-size:0.85rem;color:var(--p-bright);letter-spacing:0.18em;margin-bottom:0.6rem;">[ COMANDI DI INTERAZIONE ]</div>
  <table style="width:100%;border-collapse:collapse;font-size:0.78rem;line-height:2.0;">
    <tr><td style="color:var(--p-bright);width:22%;">PRENDI [X]</td><td style="color:var(--p-dim);width:8%;">—</td><td>Raccoglie un oggetto nell'inventario.</td></tr>
    <tr><td style="color:var(--p-bright);">USA [X]</td><td style="color:var(--p-dim);">—</td><td>Usa o indossa un oggetto.</td></tr>
    <tr><td style="color:var(--p-bright);">USA X SU Y</td><td style="color:var(--p-dim);">—</td><td>Combina o applica X su un bersaglio Y.</td></tr>
    <tr><td style="color:var(--p-bright);">ANALIZZA [X]</td><td style="color:var(--p-dim);">—</td><td>Scansione tecnica profonda. Rivela ciò che gli occhi non vedono.</td></tr>
    <tr><td style="color:var(--p-bright);">ENTRA</td><td style="color:var(--p-dim);">—</td><td>Entra in un passaggio appena aperto.</td></tr>
    <tr><td style="color:var(--p-bright);">PARLA CON [X]</td><td style="color:var(--p-dim);">—</td><td>Interagisce con un'entità.</td></tr>
    <tr><td style="color:var(--p-bright);">TOCCA [X]</td><td style="color:var(--p-dim);">—</td><td>Tocca o attiva un elemento.</td></tr>
  </table>
</div>

<div>
  <div style="font-size:0.85rem;color:var(--p-bright);letter-spacing:0.18em;margin-bottom:0.6rem;">[ SISTEMA E UTILITÀ ]</div>
  <table style="width:100%;border-collapse:collapse;font-size:0.78rem;line-height:2.0;">
    <tr><td style="color:var(--p-bright);width:22%;">AIUTO</td><td style="color:var(--p-dim);width:8%;">—</td><td>Mostra la lista comandi di base nel gioco.</td></tr>
    <tr><td style="color:var(--p-bright);">ECHI</td><td style="color:var(--p-dim);">—</td><td>Riascolta gli echi temporali registrati dal Sintonizzatore.</td></tr>
    <tr><td style="color:var(--p-bright);">SALVA / CARICA</td><td style="color:var(--p-dim);">—</td><td>Salva o carica la partita (oppure usa F4 / F3).</td></tr>
    <tr><td style="color:var(--p-bright);">PULISCI</td><td style="color:var(--p-dim);">—</td><td>Pulisce il terminale e mostra la stanza corrente.</td></tr>
    <tr><td style="color:var(--p-bright);">↑ ↓ (frecce)</td><td style="color:var(--p-dim);">—</td><td>Scorre la cronologia dei comandi digitati.</td></tr>
  </table>
</div>

</div>[PAUSE]<div style="color:var(--p-main);height:100%;display:flex;flex-direction:column;justify-content:flex-start;gap:1.6rem;">

<div style="text-align:center;border-bottom:2px solid var(--p-dim);padding-bottom:1rem;">
  <div style="font-size:1.2rem;letter-spacing:0.15em;color:var(--p-bright);text-shadow:0 0 8px var(--p-glow-a);">╔══════════════════════════════════════════╗</div>
  <div style="font-size:1.3rem;letter-spacing:0.2em;color:var(--p-bright);text-shadow:0 0 10px var(--p-glow-a);padding:0.4rem 0;">MANUALE OPERATIVO  v1.1.38</div>
  <div style="font-size:1.2rem;letter-spacing:0.15em;color:var(--p-bright);text-shadow:0 0 8px var(--p-glow-a);">╚══════════════════════════════════════════╝</div>
  <div style="font-size:0.75rem;color:var(--p-dim);margin-top:0.5rem;">STRUMENTAZIONE AVANZATA  ·  MECCANICHE DI GIOCO  ·  PAGINA 2 / 2</div>
</div>

<div>
  <div style="font-size:0.85rem;color:var(--p-bright);letter-spacing:0.18em;margin-bottom:0.7rem;">[ STRUMENTAZIONE DI BORDO ]</div>
  <div style="margin-bottom:1rem;">
    <div style="font-size:0.85rem;color:var(--p-bright);margin-bottom:0.3rem;">MULTISCANNER  —  ANALIZZA [oggetto]</div>
    <div style="font-size:0.75rem;line-height:1.9;color:var(--p-main);">Il tuo scanner personale va oltre la vista. <span style="color:var(--p-bright);">ANALIZZA</span> è diverso da <span style="color:var(--p-bright);">ESAMINA</span>: mentre ESAMINA ti dice cosa vedi, ANALIZZA ti dice cosa <em>sono</em> le cose. Usalo su ogni elemento alieno o anomalo. Indispensabile per procedere.</div>
  </div>
  <div>
    <div style="font-size:0.85rem;color:var(--p-bright);margin-bottom:0.3rem;">SINTONIZZATORE DI FREQUENZA  —  USA SINTONIZZATORE</div>
    <div style="font-size:0.75rem;line-height:1.9;color:var(--p-main);">Un dispositivo che trovi nel gioco. Una volta raccolto, usalo con <span style="color:var(--p-bright);">USA SINTONIZZATORE</span> nelle stanze silenziose per captare gli "Echi Temporali": frammenti delle ultime ore dell'equipaggio. Non sono solo atmosfera — contengono indizi vitali. Riascoltali con il comando <span style="color:var(--p-bright);">ECHI</span>.</div>
  </div>
</div>

<div>
  <div style="font-size:0.85rem;color:var(--p-bright);letter-spacing:0.18em;margin-bottom:0.7rem;">[ DIRETTIVE OPERATIVE ]</div>
  <div style="font-size:0.75rem;line-height:2.1;color:var(--p-main);">
    <div>▸  Sii specifico: <span style="color:var(--p-bright);">USA TAGLIERINA SU CREPA</span>, non solo <span style="color:var(--p-bright);">USA TAGLIERINA</span>.</div>
    <div>▸  Se un'azione non funziona, prova <span style="color:var(--p-bright);">ANALIZZA</span> prima — spesso sblocca nuove opzioni.</div>
    <div>▸  Leggi tutto con attenzione: la storia è l'obiettivo, non la destinazione.</div>
    <div>▸  Puoi usare <span style="color:var(--p-bright);">INDOSSA</span> come sinonimo di <span style="color:var(--p-bright);">USA</span> per indossare equipaggiamento.</div>
    <div>▸  Usa le frecce ↑ ↓ per richiamare i comandi già digitati.</div>
    <div>▸  In caso di schermo confuso: <span style="color:var(--p-bright);">PULISCI</span> per azzerare l'output.</div>
  </div>
</div>

<div style="border-top:1px solid var(--p-dim);padding-top:0.8rem;">
  <div style="font-size:0.85rem;color:var(--p-bright);letter-spacing:0.18em;margin-bottom:0.5rem;">[ OBIETTIVO ]</div>
  <div style="font-size:0.75rem;line-height:2.0;color:var(--p-main);">Sei a bordo di un relitto alieno. Devi scoprire cosa è successo all'equipaggio, raccogliere tre oggetti simbolici nascosti nelle profondità della nave, e raggiungere il Santuario Centrale. La verità ti aspetta nell'oscurità.</div>
</div>

</div>`;

/* introText rimosso — sostituito da IntroScreen (componente animato) */

const creditsText = `<div style="color:var(--p-main);height:100%;display:flex;flex-direction:column;justify-content:center;gap:1.6rem;text-align:center;">

<div>
  <div style="font-size:1.2rem;letter-spacing:0.12em;color:var(--p-bright);text-shadow:0 0 8px var(--p-glow-a);">╔══════════════════════════════════════════╗</div>
  <div style="font-size:1.1rem;letter-spacing:0.18em;color:var(--p-bright);text-shadow:0 0 10px var(--p-glow-a);padding:0.5rem 0;">IL RELITTO SILENTE  v1.1.6</div>
  <div style="font-size:1.2rem;letter-spacing:0.12em;color:var(--p-bright);text-shadow:0 0 8px var(--p-glow-a);">╚══════════════════════════════════════════╝</div>
  <div style="font-size:0.7rem;color:var(--p-dim);margin-top:0.5rem;letter-spacing:0.1em;">UN'AVVENTURA TESTUALE ITALIANA</div>
</div>

<div style="border-top:1px solid var(--p-dim);border-bottom:1px solid var(--p-dim);padding:1rem 0;">
  <div style="font-size:0.72rem;color:var(--p-bright);letter-spacing:0.14em;margin-bottom:0.6rem;">[ SVILUPPATO CON ]</div>
  <div style="font-size:0.72rem;color:var(--p-main);line-height:2.0;">
    React 19 · TypeScript 5.9 · Vite 8<br/>
    Electron 41 · electron-builder 26<br/>
    Tailwind CSS 4 · Press Start 2P (@fontsource)
  </div>
</div>

<div>
  <div style="font-size:0.72rem;color:var(--p-bright);letter-spacing:0.14em;margin-bottom:0.6rem;">[ ISPIRATO A ]</div>
  <div style="font-size:0.72rem;color:var(--p-main);line-height:2.0;">
    Zork (Infocom, 1980)<br/>
    The Hitchhiker's Guide to the Galaxy (Infocom, 1984)<br/>
    A Mind Forever Voyaging (Infocom, 1985)<br/>
    Castello di Ghiaccio (Paolo Vità, 1987)
  </div>
</div>

<div>
  <div style="font-size:0.72rem;color:var(--p-bright);letter-spacing:0.14em;margin-bottom:0.6rem;">[ TEMI E SUGGESTIONI ]</div>
  <div style="font-size:0.72rem;color:var(--p-main);line-height:2.0;">
    Arthur C. Clarke · Kim Stanley Robinson<br/>
    Paradosso di Fermi · Grande Filtro · Panspermia
  </div>
</div>

<div style="border-top:1px solid var(--p-dim);padding-top:1.2rem;">
  <div style="font-size:0.8rem;color:var(--p-bright);font-style:italic;letter-spacing:0.06em;text-shadow:0 0 6px var(--p-glow-a);">"Ogni fine è una prima nota."</div>
  <div style="font-size:0.65rem;color:var(--p-dim);margin-top:0.8rem;">Grazie per aver giocato.</div>
</div>

</div>`;

/* ═══════════════════════════════════════════════
   PAGINATED SCREEN
   fontSize default 1.35rem = stessa grandezza
   del testo di gioco (uniformità visiva)
   ═══════════════════════════════════════════════ */
const PaginatedScreen: React.FC<{
  fullText: string;
  finalPrompt: string;
  onComplete: (event: KeyboardEvent) => void;
}> = ({ fullText, finalPrompt, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [remainingText, setRemainingText] = useState<string | null>(null);
  const [isComplete, setIsComplete]       = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { visible, remaining } = paginateText(fullText);
    setDisplayedText(visible);
    setRemainingText(remaining);
    if (!remaining) setIsComplete(true);
  }, [fullText]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // I tasti F-x sono gestiti globalmente — non interferire
      if (/^F\d+$/.test(event.key)) return;
      if (isComplete) { onComplete(event); return; }
      if (event.key === 'Enter') {
        playKeystrokeSound();
        if (remainingText) {
          const { visible, remaining } = paginateText(remainingText);
          setDisplayedText(visible);
          setRemainingText(remaining);
          if (!remaining) setIsComplete(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [remainingText, isComplete, onComplete]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayedText]);

  return (
    <div
      ref={scrollRef}
      className="flex-grow overflow-y-auto no-scrollbar"
      style={{ fontSize: '1.35rem' }}
    >
      <div
        className="whitespace-pre-wrap"
        style={{ color: 'var(--p-main)' }}
        dangerouslySetInnerHTML={{ __html: displayedText }}
      />
      {isComplete
        ? <BlinkingPrompt text={finalPrompt} />
        : <BlinkingPrompt text="Premi RETURN per proseguire..." />
      }
    </div>
  );
};


/* ═══════════════════════════════════════════════
   GAME SIDEBAR — pannello destro persistente
   Contiene widget condizionali che appaiono solo
   quando la meccanica relativa è stata attivata.
   ═══════════════════════════════════════════════ */

// Glifi alieni fissi per décor ALGO_TRADUTTORE
const ALIEN_GLYPHS = ['Җ', 'Ѧ', 'Ѭ', 'Ӂ', 'Ԑ', 'Ԗ', 'Ԧ', 'Ԭ'];

interface GameSidebarProps {
  playerState: PlayerState;
}

const GameSidebar: React.FC<GameSidebarProps> = ({ playerState }) => {
  const translationPct = (playerState.flags.translationProgress as number | undefined) ?? 0;
  const hasTranslation = translationPct > 0;
  const hasInventory   = playerState.inventory.length > 0;

  // Se nulla da mostrare, la sidebar non occupa spazio
  if (!hasTranslation && !hasInventory) return null;

  const barFilled  = Math.round((translationPct / 100) * 10);
  const barEmpty   = 10 - barFilled;

  return (
    <aside style={{
      width:          '260px',
      flexShrink:     0,
      borderLeft:     '1px solid var(--outline-variant)',
      background:     'var(--surface-container-low)',
      display:        'flex',
      flexDirection:  'column',
      fontSize:       '0.6rem',
      letterSpacing:  '0.06em',
      overflowY:      'auto',
      gap:            '0',
    }}>

      {/* ── WIDGET: ALGO_TRADUTTORE ── */}
      {hasTranslation && (
        <div style={{
          borderBottom:  '1px solid var(--outline-variant)',
          borderLeft:    '3px solid var(--primary-container)',
          background:    'var(--surface-container-high)',
          padding:       '0.9rem 0.8rem',
        }}>
          {/* Header widget */}
          <div style={{
            color:         'var(--primary-fixed)',
            marginBottom:  '0.7rem',
            fontSize:      '0.55rem',
            letterSpacing: '0.1em',
            display:       'flex',
            alignItems:    'center',
            gap:           '0.4rem',
          }}>
            <span style={{ opacity: 0.7 }}>⟁</span>
            ALGO_TRADUTTORE
          </div>

          {/* Percentuale */}
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            marginBottom:   '0.4rem',
            fontSize:       '0.5rem',
          }}>
            <span style={{ color: 'var(--p-dim)' }}>MATRICE:</span>
            <span style={{
              color: translationPct === 100 ? 'var(--p-bright)' : 'var(--primary-container)',
            }}>
              {translationPct === 100 ? '██ COMPLETA ██' : `${translationPct}%`}
            </span>
          </div>

          {/* Barra progresso */}
          <div style={{
            width:      '100%',
            height:     '6px',
            background: 'var(--surface-variant)',
            marginBottom: '0.6rem',
            position:   'relative',
            overflow:   'hidden',
          }}>
            <div
              className={translationPct < 100 ? 'flicker-active' : ''}
              style={{
                position:   'absolute',
                top:        0,
                left:       0,
                height:     '100%',
                width:      `${translationPct}%`,
                background: translationPct === 100
                  ? 'var(--p-bright)'
                  : 'var(--primary-container)',
                transition: 'none',
                boxShadow:  '0 0 6px rgba(51,255,0,0.6)',
              }}
            />
          </div>

          {/* Barra ASCII classica */}
          <div style={{
            color:         'var(--p-dim)',
            fontSize:      '0.45rem',
            fontFamily:    'monospace',
            marginBottom:  '0.6rem',
            letterSpacing: '0',
          }}>
            {'█'.repeat(barFilled)}{'░'.repeat(barEmpty)}
          </div>

          {/* Glifi decorativi — ruotano ogni render per dare senso di "elaborazione" */}
          <div style={{
            display:      'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap:          '2px',
            opacity:      0.45,
            fontSize:     '0.7rem',
          }}>
            {ALIEN_GLYPHS.map((g, i) => (
              <span
                key={i}
                className={i % 3 === 1 ? 'animate-blink' : ''}
                style={{ textAlign: 'center', color: 'var(--p-dim)' }}
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── WIDGET: INVENTARIO ── */}
      {hasInventory && (
        <div style={{ padding: '0.9rem 0.8rem', flex: 1 }}>
          {/* Header widget */}
          <div style={{
            color:         'var(--primary-fixed-dim)',
            marginBottom:  '0.8rem',
            fontSize:      '0.55rem',
            letterSpacing: '0.1em',
            display:       'flex',
            alignItems:    'center',
            gap:           '0.4rem',
            borderBottom:  '1px solid var(--outline-variant)',
            paddingBottom: '0.4rem',
          }}>
            <span style={{ opacity: 0.7 }}>▣</span>
            INVENTARIO
            <span style={{ marginLeft: 'auto', color: 'var(--p-dim)', opacity: 0.6 }}>
              {playerState.inventory.length}
            </span>
          </div>

          {/* Lista oggetti */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {playerState.inventory.map((item, i) => (
              <div key={i}>
                <div style={{
                  color:         'var(--primary-container)',
                  fontSize:      '0.5rem',
                  letterSpacing: '0.06em',
                  marginBottom:  '0.2rem',
                  lineHeight:    '1.4',
                }}>
                  {item.toUpperCase()}
                </div>
                <div style={{
                  height:     '1px',
                  background: 'rgba(51, 255, 0, 0.15)',
                }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Numero seriale in fondo — "stamped serial" style */}
      <div style={{
        marginTop:     'auto',
        padding:       '0.4rem 0.8rem',
        borderTop:     '1px solid var(--outline-variant)',
        color:         'var(--p-dim)',
        fontSize:      '0.4rem',
        opacity:       0.3,
        letterSpacing: '0.06em',
      }}>
        SYS-PANEL-v1.2
      </div>
    </aside>
  );
};

/* ═══════════════════════════════════════════════
   MAPPA AMBIENCE PER STANZA
   Associa ogni location a un profilo sonoro.
   ═══════════════════════════════════════════════ */
const ROOM_AMBIENCE: Record<string, 'ship' | 'alien_quiet' | 'alien_cold' | 'alien_electric' | 'sacred'> = {
  'Plancia della Santa Maria':    'ship',
  'Stiva':                        'ship',
  'Scafo Esterno del Relitto':    'alien_cold',
  'Camera di Compensazione':      'alien_cold',
  'Corridoio Principale':         'alien_quiet',
  "Alloggi dell'Equipaggio":      'alien_quiet',
  'Serra Morente':                'alien_electric',
  'Arca Biologica':               'alien_cold',
  'Santuario del Silenzio':       'alien_quiet',
  'Scriptorium':                  'alien_quiet',
  'Arca della Memoria':           'alien_quiet',
  'Laboratori di Risonanza':      'alien_electric',
  'Ponte di Comando':             'sacred',
  'Santuario Centrale':           'sacred',
};

/* ═══════════════════════════════════════════════
   APP PRINCIPALE
   ═══════════════════════════════════════════════ */
const App: React.FC = () => {
  const [gameState, setGameState]       = useState<GameState>(GameState.Boot);
  const [output, setOutput]             = useState<OutputLine[]>([]);
  const [history, setHistory]           = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isLoading, setIsLoading]       = useState<boolean>(false);
  const [playerState, setPlayerState]   = useState<PlayerState>(INITIAL_PLAYER_STATE);
  const [continuation, setContinuation] = useState<string | null>(null);
  // null = chiuso | 'save' | 'load' = overlay slot aperto
  const [slotMenu, setSlotMenu]         = useState<'save' | 'load' | null>(null);
  // overlay informativo per inventario (html) e mappa (testo)
  const [infoOverlay, setInfoOverlay]   = useState<{ content: string; isHtml: boolean } | null>(null);
  // overlay impostazioni audio
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  // overlay pausa
  const [showPause, setShowPause] = useState(false);

  // ── Inizializza storage (filesystem IPC) al boot ──────────────────
  useEffect(() => {
    void initStorageSettings();
  }, []);

  // ── Ambient audio + autosave ad ogni cambio stanza ──
  useEffect(() => {
    if (gameState === GameState.Playing) {
      if (isAmbienceEnabled()) startAmbience(ROOM_AMBIENCE[playerState.location] ?? null);
      writeAutosave(playerState);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState.location, gameState]);

  /* ── Chiudi infoOverlay con ESC o INVIO ──────────────────────── */
  useEffect(() => {
    if (!infoOverlay) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setInfoOverlay(null);
      }
    };
    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true });
  }, [infoOverlay]);

  const handleGameResponse = useCallback((res: GameResponse) => {
    if (!res.description) return;
    switch (res.eventType) {
      case 'item_pickup': case 'item_use': playItemSound();  break;
      case 'magic':                        playMagicSound(); break;
      case 'movement':                     playMoveSound();  break;
      case 'error':                        playErrorSound(); break;
    }
    const { visible, remaining } = paginateText(res.description);
    const outputKind: OutputLine['kind'] = res.html ? 'html' : (res.typewriter ? 'typewriter' : 'text');
    if (res.clearScreen) {
      setOutput([{ kind: outputKind, content: visible } as OutputLine]);
    } else {
      setOutput(prev => [...prev, { kind: outputKind, content: `> ${visible}` } as OutputLine]);
    }
    setContinuation(remaining);
    if (res.gameOver) {
      const { visible: gv, remaining: gr } = paginateText(res.gameOver);
      setOutput(prev => [...prev, { kind: 'text', content: gv }]);
      setContinuation(gr);
      setGameState(GameState.GameOver);
    }
  }, []);

  useEffect(() => {
    if (!continuation) return;
    const continuePrompt: OutputLine = {
      kind: 'html',
      content: `<span style="color:var(--p-bright);" class="animate-blink">[ PREMI INVIO PER CONTINUARE ]</span>`
    };
    setOutput(prev => [...prev, continuePrompt]);
    const handleContinue = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      playKeystrokeSound();
      const textToPaginate = continuation;
      setOutput(prev => prev.slice(0, -1));
      const { visible, remaining } = paginateText(textToPaginate);
      setOutput(prev => [...prev, { kind: 'text', content: visible }]);
      setContinuation(remaining);
    };
    window.addEventListener('keydown', handleContinue, { once: true });
    return () => { window.removeEventListener('keydown', handleContinue); };
  }, [continuation]);

  const startGame = useCallback(() => {
    setPlayerState(INITIAL_PLAYER_STATE);
    setHistory([]);
    setHistoryIndex(-1);
    const { response, newState } = processCommand('inizia', INITIAL_PLAYER_STATE);
    setPlayerState(newState);
    setGameState(GameState.Playing);
    const { visible, remaining } = paginateText(response.description);
    setOutput([{ kind: 'text', content: visible }]);
    setContinuation(remaining);
  }, []);

  // ── Apertura/chiusura overlay slot ────────────────────────────────
  const openSaveMenu = useCallback(() => { setSlotMenu('save'); }, []);
  const openLoadMenu = useCallback(() => { setSlotMenu('load'); }, []);

  // ── Callback slot: salvataggio completato ──────────────────────────
  // Il write è già avvenuto nell'overlay; qui aggiungiamo solo il feedback.
  const handleSlotSave = useCallback((slotId: number) => {
    setOutput(prev => [...prev, { kind: 'text', content: `> PARTITA SALVATA NELLO SLOT ${slotId + 1}.` }]);
    setSlotMenu(null);
  }, []);

  // ── Callback slot: caricamento completato ──────────────────────────
  const handleSlotLoad = useCallback((slotId: number, loadedState: PlayerState) => {
    setPlayerState(loadedState);
    const { response } = processCommand('guarda', loadedState);
    setGameState(GameState.Playing);
    const slotLabel = slotId === -1 ? 'AUTOSAVE' : `SLOT ${slotId + 1}`;
    setOutput([{ kind: 'text', content: `> ${slotLabel} CARICATO.` }]);
    handleGameResponse({ ...response, clearScreen: true });
    setSlotMenu(null);
  }, [handleGameResponse]);

  const handleSlotCancel = useCallback(() => { setSlotMenu(null); }, []);

  // ── Gestore globale F1–F5 ──────────────────────────────────────────
  const handleFKey = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'F1':
        if (gameState === GameState.StartMenu) {
          playKeystrokeSound();
          setGameState(GameState.Instructions);
        }
        break;
      case 'F2':
        if (gameState === GameState.StartMenu || gameState === GameState.Instructions) {
          playKeystrokeSound();
          setGameState(GameState.Intro);
        }
        break;
      case 'F3':
        if (gameState === GameState.StartMenu || gameState === GameState.Playing) {
          playKeystrokeSound();
          openLoadMenu();
        }
        break;
      case 'F4':
        if (gameState === GameState.Playing) {
          playKeystrokeSound();
          openSaveMenu();
        }
        break;
      case 'F5':
        playKeystrokeSound();
        window.close();
        break;
      case 'F6':
        if (gameState === GameState.Playing) {
          playKeystrokeSound();
          setInfoOverlay({ content: getInventarioHtml(playerState), isHtml: true });
        }
        break;
      case 'F7':
        if (gameState === GameState.Playing) {
          playKeystrokeSound();
          setInfoOverlay({ content: getMappa(playerState), isHtml: false });
        }
        break;
      case 'F8':
        if (gameState === GameState.StartMenu || gameState === GameState.Instructions) {
          playKeystrokeSound();
          setGameState(GameState.Credits);
        }
        break;
      case 'F9':
      case 'Escape':
        if (gameState === GameState.Playing) {
          playKeystrokeSound();
          setShowPause(prev => !prev);
        }
        break;
    }
  }, [gameState, playerState, openLoadMenu, openSaveMenu]);

  useEffect(() => {
    window.addEventListener('keydown', handleFKey);
    return () => window.removeEventListener('keydown', handleFKey);
  }, [handleFKey]);

  // ── Gestore scelta menu (fallback '1'/'2' per retrocompatibilità) ──
  const handleStartMenuChoice = useCallback((event: KeyboardEvent) => {
    if (/^F\d+$/.test(event.key)) return;
    playKeystrokeSound();
    if (event.key === '1') setGameState(GameState.Instructions);
    else if (event.key === '2') setGameState(GameState.Intro);
  }, []);

  const submitCommand = useCallback(async (command: string) => {
    const trimmedCommand = command.trim().toLowerCase();
    if (!trimmedCommand || isLoading || gameState !== GameState.Playing) return;
    playSubmitSound();
    setOutput(prev => [...prev, { kind: 'text', content: `> ${command}` }]);
    setHistory(prev => [command, ...prev]);
    setHistoryIndex(-1);
    if (trimmedCommand === 'impostazioni' || trimmedCommand === 'impostazioni audio' || trimmedCommand === 'settings') {
      setShowAudioSettings(true);
      return;
    }
    if (trimmedCommand === 'audio' || trimmedCommand === 'musica' || trimmedCommand === 'suono') {
      const nowOn = toggleAmbience();
      if (nowOn) startAmbience(ROOM_AMBIENCE[playerState.location] ?? null);
      setOutput(prev => [...prev, { kind: 'text', content: `> Audio ambientale: ${nowOn ? 'ATTIVATO' : 'DISATTIVATO'}.` }]);
      return;
    }
    if (trimmedCommand === 'salva')  { openSaveMenu(); return; }
    if (trimmedCommand === 'carica') { openLoadMenu(); return; }
    if (trimmedCommand === 'pulisci' || trimmedCommand === 'clear') {
      const { response } = processCommand('guarda', playerState);
      handleGameResponse({ ...response, clearScreen: true });
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 80));
    const { response: rawResponse, newState } = processCommand(command, playerState);
    setPlayerState(newState);
    // Prepend statistiche missione al testo di game-over finale
    const finalResponse = rawResponse.gameOver
      ? { ...rawResponse, gameOver: getStats(newState) + '\n[PAUSE]\n' + rawResponse.gameOver }
      : rawResponse;
    handleGameResponse(finalResponse);
    setIsLoading(false);
  }, [isLoading, gameState, playerState, handleGameResponse, openSaveMenu, openLoadMenu]);

  const renderGameContent = () => {
    switch (gameState) {
      case GameState.Boot:
        return <BootScreen onComplete={() => setGameState(GameState.StartMenu)} />;
      case GameState.StartMenu:
        return <StartScreen onChoice={handleStartMenuChoice} />;
      case GameState.Instructions:
        return (
          <PaginatedScreen
            fullText={instructionsText}
            finalPrompt="Premi INVIO per tornare al menu principale"
            onComplete={(e) => {
              if (e.key === 'Enter') { playKeystrokeSound(); setGameState(GameState.StartMenu); }
            }}
          />
        );
      case GameState.Intro:
        return (
          <IntroScreen
            onComplete={() => { startGame(); }}
          />
        );
      case GameState.Credits:
        return (
          <PaginatedScreen
            fullText={creditsText}
            finalPrompt="Premi INVIO per tornare al menu"
            onComplete={(e) => {
              if (e.key === 'Enter') { playKeystrokeSound(); setGameState(GameState.StartMenu); }
            }}
          />
        );
      case GameState.GameOver:
        return <GameOverScreen onRestart={() => setGameState(GameState.StartMenu)} />;
      case GameState.Playing:
        return (
          <div style={{ display: 'flex', flex: 1, minHeight: 0, fontSize: '1.35rem' }}>
            {/* Area terminale principale — con padding proprio */}
            <div style={{
              display:       'flex',
              flexDirection: 'column',
              flexGrow:      1,
              overflow:      'hidden',
              minWidth:      0,
              paddingLeft:   '2.2rem',
              paddingRight:  '2.2rem',
              paddingBottom: '1.2rem',
            }}>
              <TerminalOutput output={output} />
              <CommandLine
                onSubmit={submitCommand}
                isLoading={isLoading || !!continuation}
                history={history}
                historyIndex={historyIndex}
                setHistoryIndex={setHistoryIndex}
              />
            </div>
            {/* Sidebar destra — tocca il bordo, altezza piena */}
            <GameSidebar playerState={playerState} />
          </div>
        );
    }
  };

  const scaleStyle = useGameScale();

  /* ─── Layout ──────────────────────────────────────────────────────────
     Struttura a due livelli come un vero monitor CRT:
     • Esterno: "cornice" / bezel — colore leggermente diverso dal nero schermo
     • Interno: area fosforo con effetti CRT, inset dalla cornice
     Come i monitor VT100, Commodore PET e i terminali anni '70-'80
     ─────────────────────────────────────────────────────────────────── */
  return (
    <div className="bg-black w-screen h-screen overflow-hidden">
      {/* Bezel — cornice fisica del monitor (industrial heavy) */}
      <div
        id="game-container"
        className="crt-flicker"
        style={{
          width:        '1920px',
          height:       '1080px',
          background:   'var(--bezel-bg)',
          border:       '20px solid var(--bezel-border)',
          borderBottom: '36px solid var(--bezel-border)',
          borderRadius: '4px',
          boxShadow:    '0 0 60px rgba(51,255,0,0.04), 0 0 200px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,0,0,0.6)',
          display:      'flex',
          flexDirection:'column',
          overflow:     'hidden',
          ...scaleStyle,
        }}
      >
        {/* Header CRT — sempre visibile dopo il boot */}
        {gameState !== GameState.Boot && (
          <CrtHeader gameState={gameState} location={playerState.location} />
        )}

        {/* Area schermo — phosphor display */}
        <div
          style={{
            flex:          1,
            background:    'var(--bg-screen)',
            position:      'relative',
            overflow:      'hidden',
            display:       'flex',
            flexDirection: 'column',
            /* Nessun padding orizzontale qui: la sidebar deve toccare il bordo */
            paddingTop:    '1.6rem',
            boxShadow:     'inset 0 0 80px rgba(0,0,0,0.8), inset 0 0 20px rgba(51,255,0,0.03)',
          }}
        >
          {/* Strati CRT — dal più profondo */}
          <div className="crt-noise"    />
          <div className="crt-vignette" />
          <div className="scanline"     />

          <div style={{ color: 'var(--p-main)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {renderGameContent()}
          </div>

          {/* Overlay slot salvataggio/caricamento */}
          {slotMenu !== null && (
            <SaveLoadOverlay
              mode={slotMenu}
              playerState={playerState}
              onSave={handleSlotSave}
              onLoad={handleSlotLoad}
              onCancel={handleSlotCancel}
            />
          )}

          {/* Overlay pausa — F9/ESC durante il gioco */}
          {showPause && gameState === GameState.Playing && (
            <PauseOverlay
              onResume={  () => setShowPause(false) }
              onSave={    () => { setShowPause(false); openSaveMenu(); }}
              onLoad={    () => { setShowPause(false); openLoadMenu(); }}
              onRestart={ () => { setShowPause(false); setGameState(GameState.StartMenu); }}
              onQuit={    () => { setShowPause(false); window.close(); }}
            />
          )}

          {/* Overlay impostazioni audio */}
          {showAudioSettings && (
            <AudioSettingsOverlay
              currentLocation={playerState.location}
              roomAmbience={ROOM_AMBIENCE[playerState.location] ?? null}
              onClose={() => setShowAudioSettings(false)}
            />
          )}

          {/* Overlay informativo — inventario (F6) e mappa (F7) */}
          {infoOverlay !== null && (
            <div
              className="overlay-crt"
              style={{
                position:      'absolute',
                inset:         0,
                zIndex:        100,
                display:       'flex',
                flexDirection: 'column',
                padding:       '1.8rem 2.2rem 1rem',
                overflow:      'hidden',
              }}
            >
              <div
                className="flex-grow overflow-y-auto no-scrollbar"
                style={{ fontSize: '1.35rem' }}
              >
                {infoOverlay.isHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: infoOverlay.content }} />
                ) : (
                  <div style={{ color: 'var(--p-main)', whiteSpace: 'pre', fontFamily: 'inherit' }}>
                    {infoOverlay.content}
                  </div>
                )}
              </div>
              <div
                style={{
                  borderTop:     '1px solid var(--outline-variant)',
                  paddingTop:    '0.5rem',
                  marginTop:     '0.8rem',
                  fontSize:      '0.6rem',
                  color:         'var(--p-dim)',
                  display:       'flex',
                  justifyContent:'flex-end',
                  letterSpacing: '0.06em',
                }}
              >
                <span style={{ color: 'var(--p-main)' }}>[ESC]</span>
                &nbsp;o&nbsp;
                <span style={{ color: 'var(--p-main)' }}>[INVIO]</span>
                &nbsp;per chiudere
              </div>
            </div>
          )}
        </div>

        {/* Footer F-key — sempre visibile dopo il boot */}
        {gameState !== GameState.Boot && (
          <FunctionKeyBar
            gameState={gameState}
            onF1={() => { playKeystrokeSound(); setGameState(GameState.Instructions); }}
            onF2={() => { playKeystrokeSound(); setGameState(GameState.Intro); }}
            onF3={() => { playKeystrokeSound(); openLoadMenu(); }}
            onF4={() => { playKeystrokeSound(); openSaveMenu(); }}
            onF5={() => { playKeystrokeSound(); window.close(); }}
            onF6={() => { playKeystrokeSound(); setInfoOverlay({ content: getInventarioHtml(playerState), isHtml: true }); }}
            onF7={() => { playKeystrokeSound(); setInfoOverlay({ content: getMappa(playerState), isHtml: false }); }}
            onF8={() => { playKeystrokeSound(); setGameState(GameState.Credits); }}
            onF9={() => { playKeystrokeSound(); setShowPause(prev => !prev); }}
          />
        )}
      </div>
    </div>
  );
};

const AppWithBoundary: React.FC = () => (
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

export default AppWithBoundary;
