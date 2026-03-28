/* ─── echoData.ts ──────────────────────────────────────────────────────────
   Unica fonte di verità per gli echi temporali del Sintonizzatore.
   Importato sia da gameLogic.ts (per ECHO_TEXTS display) sia da
   laboratoriRisonanza.ts (per onUse del Sintonizzatore), evitando
   la dipendenza circolare gameLogic ↔ rooms.
   ─────────────────────────────────────────────────────────────────────── */

/** Mappa echoId → testo leggibile mostrato al giocatore. */
export const ECHO_TEXTS: Record<string, string> = {
    'echo_plancia':     "CAPITANO: 'Rotta impostata per il sistema trino. I motori sono al limite. Che Dio ci perdoni per quello che stiamo portando a casa.'",
    'echo_serra':       "XENO-BOTANICO: 'Stanno morendo tutte. Il filtro atmosferico è collassato. Non c'è più acqua. Ho provato a salvare il Seme, ma...'",
    'echo_lab':         "INGEGNERE CAPO: 'La risonanza è instabile! Il cristallo non regge il carico! Evacuare il settore! SUBITO!' — [pausa] — 'Non riesco a farlo. Se lascio il generatore adesso il campo collassa e con lui tutta la Sezione Seme. Non posso. Devo stabilizzare prima. Voi andate. Io... resto.'",
    'echo_arca':        "UFFICIALE MEDICO: 'I sistemi vitali sono offline. Sono tutti morti nel sonno. Il freddo... è stato misericordioso.'",
    'echo_alloggi':     "NAVARCA: 'Questo sarà il mio ultimo ciclo di veglia. Ho chiesto di rimanere l'ultimo. Qualcuno deve spegnere le luci quando tutti se ne sono andati. È... è un onore.'",
    'echo_ponte':       "UFFICIALE DI NAVIGAZIONE: 'La rotta è confermata e sigillata nei cristalli. Tra 4.7 milioni di cicli, il sistema bersaglio sarà maturo. Noi non ci saremo. Ma il canto... il canto ci sarà.'",
    'echo_corridoio':   "UNA VOCE — senza identificativo di ruolo: 'Il Seme è al sicuro. La Stele è al sicuro. Il Nucleo è al sicuro. Abbiamo fatto tutto quello che potevamo. Tutto. Ora è nelle mani del tempo — e del futuro che non conosceremo mai.'",
    'echo_camera':      "TECNICO DI BORDO: 'Porta esterna sigillata. Protocollo silenzio attivato. La musica ha trovato la sua ultima casa. Che continui, oltre il freddo, oltre il buio. Che continui.'",
    'echo_scriptorium': "LO SCRIBA: 'L'ultima iscrizione è completa. La Stele porta tutto ciò che siamo stati — ogni scoperta, ogni errore, ogni speranza. Non so se sarà mai letta. Ma la verità deve avere un posto dove stare.'",
    'echo_stiva':       "TECNICO DI CARICO: 'Il Seme è sigillato. Ho controllato ogni capsula tre volte. Se anche tutto il resto fallisse... questo deve arrivare. Deve.'",
    'echo_santuario_sil': "CUSTODE: 'Il silenzio non è assenza. È la forma che la memoria prende quando le parole finiscono. Ho dedicato tutta la mia vita a impararlo. Solo adesso capisco che era vero.'",
};

/** Mappa location name → echoId per il Sintonizzatore. */
export const LOCATION_TO_ECHO: Record<string, string> = {
    'Plancia della Santa Maria':    'echo_plancia',
    'Serra Morente':                'echo_serra',
    'Laboratori di Risonanza':      'echo_lab',
    'Arca Biologica':               'echo_arca',
    "Alloggi dell'Equipaggio":      'echo_alloggi',
    'Ponte di Comando':             'echo_ponte',
    'Corridoio Principale':         'echo_corridoio',
    'Camera di Compensazione':      'echo_camera',
    'Scriptorium':                  'echo_scriptorium',
    'Stiva':                        'echo_stiva',
    'Santuario del Silenzio':       'echo_santuario_sil',
};
