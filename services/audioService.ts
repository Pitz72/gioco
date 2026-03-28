import { getSettingSync, setSetting } from './storageService';

/* ─── AudioContext ─────────────────────────────────────────────────────────
   Inizializzato al primo input utente (policy browser/Electron).
   In Electron (Chromium moderno) AudioContext è sempre disponibile:
   il fallback webkitAudioContext non è necessario.                       */
let audioCtx: AudioContext | null = null;

const initializeAudio = () => {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};

const ensureAudioInitialized = () => {
    if (!audioCtx || audioCtx.state === 'suspended') {
        initializeAudio();
    }
};

/* ─── Sistema SFX (effetti sonori) ────────────────────────────────────────
   Toggle e volume indipendenti dall'ambience.
   Lettura sempre sincrona dalla cache di storageService.               */

const SFX_ON_KEY  = 'relitto_sfx_on';
const SFX_VOL_KEY = 'relitto_sfx_vol';

export const isSfxEnabled = (): boolean => {
    const v = getSettingSync(SFX_ON_KEY);
    return v === null ? true : v === 'true';
};

export const getSfxVol = (): number => {
    const v = getSettingSync(SFX_VOL_KEY);
    return v !== null ? Math.max(0.01, Math.min(1, parseFloat(v))) : 0.7;
};

export const toggleSfx = (): boolean => {
    const next = !isSfxEnabled();
    setSetting(SFX_ON_KEY, String(next));
    return next;
};

export const setSfxVol = (val: number): void => {
    setSetting(SFX_VOL_KEY, String(Math.max(0.01, Math.min(1, val))));
};

// Helper: oscillatore breve per SFX
const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!audioCtx || !isSfxEnabled()) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1 * getSfxVol(), audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
};

// Helper: rumore filtrato per suoni di movimento
const playNoise = (duration: number) => {
    if (!audioCtx || !isSfxEnabled()) return;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 800;
    bandpass.Q.value = 0.5;

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    noise.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noise.start();
    noise.stop(audioCtx.currentTime + duration);
};

export const playKeystrokeSound = () => { ensureAudioInitialized(); playTone(220, 0.05, 'square'); };
export const playSubmitSound    = () => { ensureAudioInitialized(); playTone(440, 0.1,  'square'); };
export const playItemSound      = () => {
    ensureAudioInitialized();
    playTone(880, 0.05, 'triangle');
    setTimeout(() => { if (audioCtx) playTone(1046, 0.05, 'triangle'); }, 60);
};
export const playMagicSound = () => {
    ensureAudioInitialized();
    playTone(1046.50, 0.1, 'sine');
    setTimeout(() => { if (audioCtx) playTone(1396.91, 0.1, 'sine'); }, 100);
    setTimeout(() => { if (audioCtx) playTone(1567.98, 0.2, 'sine'); }, 200);
};
export const playMoveSound  = () => { ensureAudioInitialized(); playNoise(0.15); };
export const playErrorSound = () => { ensureAudioInitialized(); playTone(110, 0.15, 'sawtooth'); };
export const playTerminalBeep = () => { ensureAudioInitialized(); playTone(1320, 0.04, 'sine'); };

/* ─── Sistema Ambience ─────────────────────────────────────────────────────
   Loop procedurali per atmosfera per stanza. Il master GainNode gestisce
   fade-in/fade-out puliti per eliminare click e pop audio.
   Toggle e volume persistono tramite storageService.                    */

const AMBIENCE_ON_KEY  = 'relitto_ambience_on';
const AMBIENCE_VOL_KEY = 'relitto_ambience_vol';

export const isAmbienceEnabled = (): boolean => {
    const v = getSettingSync(AMBIENCE_ON_KEY);
    return v === null ? true : v === 'true';
};

export const getAmbienceVol = (): number => {
    const v = getSettingSync(AMBIENCE_VOL_KEY);
    return v !== null ? Math.max(0.01, Math.min(1, parseFloat(v))) : 0.5;
};

export const setAmbienceVol = (val: number): void => {
    const clamped = Math.max(0.01, Math.min(1, val));
    setSetting(AMBIENCE_VOL_KEY, String(clamped));
    if (ambienceGain && audioCtx) {
        ambienceGain.gain.setValueAtTime(clamped, audioCtx.currentTime);
    }
};

export const toggleAmbience = (): boolean => {
    const next = !isAmbienceEnabled();
    setSetting(AMBIENCE_ON_KEY, String(next));
    if (!next) stopAmbience();
    return next;
};

let ambienceGain: GainNode | null = null;
let ambienceStoppable: Array<OscillatorNode | AudioBufferSourceNode> = [];

export const stopAmbience = (): void => {
    const nodesToStop = [...ambienceStoppable];
    ambienceStoppable = [];
    const gainToFade = ambienceGain;
    ambienceGain = null;
    if (audioCtx && gainToFade && nodesToStop.length > 0) {
        const now = audioCtx.currentTime;
        const cur = Math.max(gainToFade.gain.value, 0.0001);
        gainToFade.gain.setValueAtTime(cur, now);
        gainToFade.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        setTimeout(() => {
            nodesToStop.forEach(n => { try { n.stop(); } catch { /* già fermato */ } });
            try { gainToFade.disconnect(); } catch { /* già disconnesso */ }
        }, 750);
    } else {
        nodesToStop.forEach(n => { try { n.stop(); } catch { /* ignorato */ } });
        if (gainToFade) { try { gainToFade.disconnect(); } catch { /* ignorato */ } }
    }
};

const addAmbienceOsc = (freq: number, type: OscillatorType, gainVal: number): void => {
    if (!audioCtx || !ambienceGain) return;
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainVal;
    osc.connect(gain);
    gain.connect(ambienceGain);
    osc.start();
    ambienceStoppable.push(osc);
};

const addAmbienceNoise = (gainVal: number, filterFreq: number, filterQ: number): void => {
    if (!audioCtx || !ambienceGain) return;
    const bufferSize = audioCtx.sampleRate * 4;
    const buffer     = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data       = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src    = audioCtx.createBufferSource();
    src.buffer   = buffer;
    src.loop     = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type  = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value         = filterQ;
    const gain   = audioCtx.createGain();
    gain.gain.value = gainVal;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ambienceGain);
    src.start();
    ambienceStoppable.push(src);
};

export const startAmbience = (type: 'ship' | 'alien_quiet' | 'alien_cold' | 'alien_electric' | 'sacred' | null): void => {
    stopAmbience();
    if (!isAmbienceEnabled() || !type) return;
    ensureAudioInitialized();
    if (!audioCtx) return;

    ambienceGain = audioCtx.createGain();
    const targetVol = getAmbienceVol();
    ambienceGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    ambienceGain.gain.exponentialRampToValueAtTime(targetVol, audioCtx.currentTime + 1.5);
    ambienceGain.connect(audioCtx.destination);

    switch (type) {
        case 'ship':
            addAmbienceOsc(55,  'sawtooth', 0.04);
            addAmbienceOsc(110, 'sawtooth', 0.02);
            addAmbienceNoise(0.03, 300, 0.8);
            break;
        case 'alien_quiet': {
            const osc     = audioCtx.createOscillator();
            const gain    = audioCtx.createGain();
            const lfo     = audioCtx.createOscillator();
            const lfoGain = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.value = 432;
            lfo.type = 'sine'; lfo.frequency.value = 0.1;
            lfoGain.gain.value = 10; gain.gain.value = 0.03;
            lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
            osc.connect(gain); gain.connect(ambienceGain);
            lfo.start(); osc.start();
            ambienceStoppable.push(osc, lfo);
            break;
        }
        case 'alien_cold':
            addAmbienceNoise(0.04, 180, 1.2);
            addAmbienceOsc(28, 'sine', 0.05);
            break;
        case 'alien_electric':
            addAmbienceOsc(60,  'square', 0.025);
            addAmbienceOsc(120, 'square', 0.015);
            addAmbienceNoise(0.02, 600, 2.0);
            break;
        case 'sacred': {
            const osc     = audioCtx.createOscillator();
            const gain    = audioCtx.createGain();
            const lfo     = audioCtx.createOscillator();
            const lfoGain = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.value = 528;
            lfo.type = 'sine'; lfo.frequency.value = 0.05;
            lfoGain.gain.value = 8; gain.gain.value = 0.04;
            lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
            osc.connect(gain); gain.connect(ambienceGain);
            lfo.start(); osc.start();
            ambienceStoppable.push(osc, lfo);
            break;
        }
    }
};
