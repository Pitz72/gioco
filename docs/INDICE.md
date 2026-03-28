# INDICE DOCUMENTAZIONE — IL RELITTO SILENTE
**Versione:** 1.2.1 · **Data aggiornamento:** 2026-03-21

---

## Struttura

```
docs/
├── INDICE.md                          ← questo file
├── giocatore/                         ← documentazione per l'utente finale
│   ├── LEGGIMI.txt                    ← quick start incluso nell'installer
│   ├── MANUALE.md                     ← manuale operativo completo
│   └── SOLUZIONE.md                   ← walkthrough e guida al 100%
├── sviluppo/                          ← documentazione tecnica
│   ├── README.md                      ← scheda tecnica e istruzioni di build
│   └── STATO_PROGETTO.md              ← stato corrente del progetto
├── narrativa/                         ← documentazione del contenuto
│   ├── definizionenarrativa.md        ← roadmap narrativa N1–N11 (chiusa)
│   └── articolo.md                    ← diario di sviluppo di Simone Pizzi
├── storico/                           ← documenti di audit e verifica
│   ├── analisi2026.md                 ← audit 21 criticità (chiuso a v1.1.0)
│   ├── analisimiglioramento2026.md    ← piano miglioramenti (archiviato a v1.1.23)
│   └── VERIFICA_WALKTHROUGH.md        ← verbale simulazione integrale (2026-03-21)
└── changelog/                         ← un file per ogni versione rilasciata
    ├── 0.0.1.md … 0.4.9.md            ← fase sperimentale (prototipo AI Studio)
    ├── 1.0.0.md … 1.0.19.md           ← fase stabilizzazione e audit
    ├── 1.1.0.md … 1.1.40.md           ← fase funzionalità, narrativa, distribuzione
    ├── 1.2.0.md                       ← stabilizzazione sistema comandi
    └── 1.2.1.md                       ← inventario, mappa fog-of-war, HINT completato
```

---

## Documenti per il giocatore

| File | Contenuto | Stato |
|---|---|---|
| `giocatore/LEGGIMI.txt` | Quick start: avvio, comandi essenziali, tasti funzione | ✅ v1.1.37 |
| `giocatore/MANUALE.md` | Manuale completo: interfaccia, comandi, meccaniche, walkthrough sintetico | ✅ v1.1.37 |
| `giocatore/SOLUZIONE.md` | Walkthrough passo per passo + guida al 100% (echi, lore, statistiche) | ✅ v1.1.37 |

> `LEGGIMI.txt` e `SOLUZIONE.md` vengono inclusi nell'installer Windows come file aggiuntivi (configurati in `package.json` → `extraFiles`).

---

## Documenti di sviluppo

| File | Contenuto | Stato |
|---|---|---|
| `sviluppo/README.md` | Stack, caratteristiche, comandi di build, struttura file chiave, tasti funzione | ✅ v1.1.37 |
| `sviluppo/STATO_PROGETTO.md` | Salute tecnica, architettura, copertura comandi, audio, UX, narrativa, distribuzione | ✅ v1.1.37 |

---

## Documenti narrativi

| File | Contenuto | Stato |
|---|---|---|
| `narrativa/definizionenarrativa.md` | Roadmap N1–N11: analisi di ogni intervento narrativo, ordine operativo, note | Chiuso al 100% — 2026-03-21 |
| `narrativa/articolo.md` | Diario di sviluppo pubblico di Simone Pizzi: origini, architettura, parser, audio, narrativa | Definitivo |

---

## Documenti storici e di audit

| File | Contenuto | Stato |
|---|---|---|
| `storico/analisi2026.md` | Audit completo delle 21 criticità (v1.0.1 Gold Master): gravissime, gravi, medie, leggere | Chiuso — tutte ✅ a v1.1.0 |
| `storico/analisimiglioramento2026.md` | Piano miglioramenti: parser, funzionalità, narrativa (P1–P10, E1–E5, A1–A8, S1–S10, D1–D7) | Archiviato — completato a v1.1.23 |
| `storico/VERIFICA_WALKTHROUGH.md` | Simulazione mentale integrale: percorso critico, 4 bug trovati e risolti (v1.1.34–v1.1.37) | Definitivo — 2026-03-21 |

---

## Changelog

Ogni versione ha il proprio file in `changelog/X.Y.Z.md`. Il formato è uniforme: problema → soluzione → file modificati → verifica TSC.

### Fasi di sviluppo

| Intervallo | Versioni | Contenuto principale |
|---|---|---|
| Prototipo | v0.0.1–v0.4.9 | Sperimentazione con AI Studio, prime stanze, parser elementare |
| Stabilizzazione | v1.0.0–v1.0.19 | Audit 21 criticità, rifacimento estetico CRT, storage, font locale |
| Funzionalità | v1.1.0–v1.1.6 | Parser Levenshtein, item system, ambience, typewriter, UX |
| Contenuto | v1.1.7–v1.1.23 | Copertura comandi, echi, TOCCA, HINT, mappa, salvataggio, pausa, audio overlay |
| Qualità | v1.1.24–v1.1.25 | Storage filesystem, totalEchoes, Error Boundary |
| Narrativa | v1.1.26–v1.1.33 | N1–N11: monologhi, puzzle finale, Scriptorium, tacche L.V., Anticamera, echi |
| Bugfix finale | v1.1.34–v1.1.37 | 4 bug da simulazione walkthrough (monologo, Disco, Postazione, Cristallo) |

### Ultimo changelog: `changelog/1.2.1.md`

---

*Indice generato il 2026-03-21 · Il Relitto Silente Project · Simone Pizzi*
