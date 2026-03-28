
import React, { useEffect, useRef, useState } from 'react';
import { OutputLine } from '../types';

interface TerminalOutputProps {
  output: OutputLine[];
}

/* ─── Rilevamento titolo stanza ────────────────────────────────────────────
   Solo stringhe composte esclusivamente da lettere maiuscole italiane,
   spazi, apostrofi e trattini (lunghezza 4-40). Esclude simboli come
   [ ] : % che compaiono nelle barre di progresso e nei suggerimenti.   */
const isRoomTitle = (s: string): boolean => {
    const t = s.trim();
    return t.length >= 4 && t.length <= 40 && /^[A-ZÀÈÉÌÒÙ\s''\-]+$/.test(t);
};

/* ─── Rendering testo con titolo stanza ────────────────────────────────── */
const renderTextContent = (content: string): React.ReactNode => {
    const nnIdx = content.indexOf('\n\n');
    if (nnIdx > 0) {
        const firstLine = content.slice(0, nnIdx);
        if (isRoomTitle(firstLine)) {
            const rest = content.slice(nnIdx);
            return (
                <>
                    <span className="phosphor-ghost" style={{
                        color: 'var(--p-bright)',
                        letterSpacing: '0.14em',
                        display: 'block',
                        marginBottom: '0.2em',
                    }}>
                        {firstLine}
                    </span>
                    {rest}
                </>
            );
        }
    }
    return content;
};

/* ─── Componente typewriter ────────────────────────────────────────────────
   Anima il testo carattere per carattere a 10ms/char. Qualsiasi tasto
   (eccetto F-keys e modificatori) completa l'animazione istantaneamente. */
const TypewriterLine: React.FC<{ content: string }> = ({ content }) => {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const charRef = useRef(0);

    useEffect(() => {
        charRef.current = 0;
        setDisplayed('');
        setDone(false);

        intervalRef.current = setInterval(() => {
            charRef.current++;
            setDisplayed(content.slice(0, charRef.current));
            if (charRef.current >= content.length) {
                clearInterval(intervalRef.current!);
                setDone(true);
            }
        }, 10);

        const handleKey = (e: KeyboardEvent) => {
            if (/^F\d+$/.test(e.key) || ['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock'].includes(e.key)) return;
            if (intervalRef.current) clearInterval(intervalRef.current);
            setDisplayed(content);
            setDone(true);
        };
        window.addEventListener('keydown', handleKey);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            window.removeEventListener('keydown', handleKey);
        };
    }, [content]);

    return (
        <span className="whitespace-pre-wrap">
            {renderTextContent(displayed)}
            {!done && (
                <span
                    className="animate-blink"
                    style={{ display: 'inline-block', width: '0.65ch', height: '0.9em', background: 'var(--p-main)', marginLeft: '1px', verticalAlign: 'text-bottom' }}
                />
            )}
        </span>
    );
};

const TerminalOutput: React.FC<TerminalOutputProps> = ({ output }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  return (
    <div className="flex-grow overflow-y-auto pr-2 no-scrollbar glow-text-soft">
      {output.map((line, index) =>
        line.kind === 'html'
          ? <div key={index} className="whitespace-pre-wrap" style={{ color: 'var(--p-main)' }} dangerouslySetInnerHTML={{ __html: line.content }} />
          : line.kind === 'typewriter'
            ? <div key={index} className="whitespace-pre-wrap" style={{ color: 'var(--p-main)' }}><TypewriterLine content={line.content} /></div>
            : <div key={index} className="whitespace-pre-wrap" style={{ color: 'var(--p-main)' }}>{renderTextContent(line.content)}</div>
      )}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default TerminalOutput;
