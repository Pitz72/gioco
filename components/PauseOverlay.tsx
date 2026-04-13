import React, { useEffect } from 'react';

interface PauseOverlayProps {
    onResume:   () => void;
    onSave:     () => void;
    onLoad:     () => void;
    onRestart:  () => void;
    onQuit:     () => void;
}

const ITEMS = [
    { key: '1', label: 'CONTINUA' },
    { key: '2', label: 'SALVA'    },
    { key: '3', label: 'CARICA'   },
    { key: '4', label: 'RICOMINCIA' },
    { key: '5', label: 'ESCI'     },
] as const;

const PauseOverlay: React.FC<PauseOverlayProps> = ({
    onResume, onSave, onLoad, onRestart, onQuit,
}) => {
    const actions: Record<string, () => void> = {
        '1': onResume,
        '2': onSave,
        '3': onLoad,
        '4': onRestart,
        '5': onQuit,
    };

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            e.stopImmediatePropagation();
            e.preventDefault();
            if (e.key === 'Escape' || e.key === 'F9') { onResume(); return; }
            const fn = actions[e.key];
            if (fn) fn();
        };
        window.addEventListener('keydown', handleKey, { capture: true });
        return () => window.removeEventListener('keydown', handleKey, { capture: true });
    }, [onResume, onSave, onLoad, onRestart, onQuit]);

    return (
        <div
          className="overlay-crt"
          style={{
            position:       'absolute',
            inset:          0,
            zIndex:         110,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}
        >
            <div style={{
                width:     '420px',
                border:    '1px solid var(--outline-variant)',
                borderLeft: '3px solid var(--primary-container)',
                boxShadow: '0 0 60px rgba(51,255,0,0.12), inset 0 0 30px rgba(0,0,0,0.6)',
                background: 'var(--surface-container-low)',
                fontSize:   '0.85rem',
            }}>
                {/* Titolo — stile badge industriale */}
                <div style={{
                    background:    'var(--primary-container)',
                    color:         'var(--on-primary)',
                    padding:       '0.6rem 1.2rem',
                    fontSize:      '0.8rem',
                    letterSpacing: '0.18em',
                    textShadow:    'none',
                }}>
                    // SISTEMA IN PAUSA //
                </div>

                <div style={{ padding: '0.4rem 0' }}>
                    {ITEMS.map(item => (
                        <div
                            key={item.key}
                            onClick={actions[item.key]}
                            style={{
                                display:     'flex',
                                alignItems:  'center',
                                gap:         '1.2rem',
                                padding:     '0.7rem 1.4rem',
                                cursor:      'pointer',
                                borderBottom:'1px solid rgba(60, 75, 53, 0.4)',
                                transition:  'none',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(51,255,0,0.06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <span style={{
                                display:       'inline-block',
                                background:    'var(--p-main)',
                                color:         'var(--bg-screen)',
                                padding:       '2px 7px',
                                fontSize:      '0.7rem',
                                flexShrink:    0,
                                letterSpacing: '0.04em',
                                minWidth:      '2ch',
                                textAlign:     'center',
                            }}>{item.key}</span>
                            <span style={{ color: 'var(--p-main)', letterSpacing: '0.1em', fontSize: '0.8rem' }}>{item.label}</span>
                        </div>
                    ))}
                </div>

                <div style={{
                  textAlign:     'right',
                  color:         'var(--p-dim)',
                  fontSize:      '0.55rem',
                  letterSpacing: '0.06em',
                  padding:       '0.5rem 1rem',
                  borderTop:     '1px solid var(--outline-variant)',
                  opacity:       0.6,
                }}>
                    ESC / F9 — RIPRENDERE
                </div>
            </div>
        </div>
    );
};

export default PauseOverlay;
