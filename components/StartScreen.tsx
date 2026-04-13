import React, { useEffect } from 'react';

interface StartScreenProps {
    onChoice: (event: KeyboardEvent) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onChoice }) => {

    useEffect(() => {
        window.addEventListener('keydown', onChoice);
        return () => { window.removeEventListener('keydown', onChoice); };
    }, [onChoice]);

    return (
        <div className="w-full h-full flex flex-col" style={{ padding: '3rem 3.5rem', gap: '0' }}>

            {/* Label sistema — industrial offset, top-left */}
            <div style={{ color: 'var(--p-dim)', fontSize: '0.5rem', letterSpacing: '0.14em', marginBottom: '3rem', opacity: 0.5 }}>
                INTERFACCIA TERMINALE v1.2.5 // SISTEMA ATTIVO
            </div>

            {/* Titolo — occupazione pesante, allineato a sinistra */}
            <h1
                className="phosphor-ghost"
                style={{
                    fontSize:      '4rem',
                    letterSpacing: '0.1em',
                    lineHeight:    '1.3',
                    color:         'var(--p-bright)',
                    marginBottom:  '0.5rem',
                }}
            >
                IL RELITTO<br/>SILENTE
            </h1>

            <div style={{
                width: '120px',
                height: '2px',
                background: 'var(--primary-container)',
                marginBottom: '2rem',
                boxShadow: '0 0 10px rgba(51,255,0,0.5)',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '3rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--p-main)', letterSpacing: '0.06em' }}>
                    di Simone Pizzi
                </p>
                <p style={{ fontSize: '0.65rem', color: 'var(--p-dim)', letterSpacing: '0.04em' }}>
                    UN'AVVENTURA TESTUALE · ANNO 2025
                </p>
            </div>

            {/* Istruzioni tasti — stile log di sistema */}
            <div style={{
                borderTop: '1px solid var(--outline-variant)',
                paddingTop: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
            }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--p-dim)', letterSpacing: '0.06em', opacity: 0.7 }}>
                    PROTOCOLLO DI ACCESSO:
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--p-main)', letterSpacing: '0.06em' }}>
                    <span style={{ color: 'var(--p-bright)' }}>F1</span> — ISTRUZIONI &nbsp;&nbsp;
                    <span style={{ color: 'var(--p-bright)' }}>F2</span> — AVVIA PARTITA &nbsp;&nbsp;
                    <span style={{ color: 'var(--p-bright)' }}>F3</span> — CARICA &nbsp;&nbsp;
                    <span style={{ color: 'var(--p-bright)' }}>F8</span> — CREDITI
                </p>
            </div>

            {/* Firma in basso — "stamped serial number" style */}
            <div style={{ marginTop: 'auto', opacity: 0.25, fontSize: '0.45rem', letterSpacing: '0.1em', color: 'var(--p-dim)' }}>
                RELITTO-SN-2025-ITA // © SIMONE PIZZI // ALL RIGHTS RESERVED
            </div>
        </div>
    );
};

export default StartScreen;
