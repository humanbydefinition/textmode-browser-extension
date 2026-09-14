Fai sembrare il web in movimento un testo.

[Textmode Overlay] è un generatore di arte ASCII in tempo reale e un effetto video-in-testo per il tuo browser. Seleziona un video o un canvas compatibile e guardalo diventare una griglia di caratteri viva e perfettamente allineata. Combina l'ombreggiatura per luminosità con le linee di contorno, scegli i colori e il font, impila gli effetti visivi ed esporta il fotogramma quando la composizione è quella giusta.

Il media di origine resta sotto, così puoi fondere, mettere in pausa, ripristinare, sostituire o rimuovere l'effetto quando vuoi.

Realizzato con textmode.js.


─── PROVALO

Usa [Textmode Overlay] ovunque la pagina esponga un canvas o un video HTML5 compatibile:

  ▸ trasforma la riproduzione di YouTube in arte ASCII video dal vivo
  ▸ reinterpreta stream e VOD di Twitch in textmode
  ▸ stilizza i video di Vimeo e altri lettori video web
  ▸ trasforma giochi per browser, demo e canvas WebGL
  ▸ aggiungi un aspetto di arte testuale ai visualizzatori di musica e audio
  ▸ esplora p5.js, Three.js, arte generativa e sketch di creative coding
  ▸ testa elementi canvas o video sui tuoi siti web

Alcuni media protetti, cross-origin o in sandbox potrebbero non essere disponibili. [Textmode Overlay] contrassegna i fotogrammi inaccessibili e segnala gli errori di campionamento senza interrompere la pagina.


─── CREA UN OVERLAY

Apri una pagina con un canvas o un video visibile.

Barra degli strumenti:
  1  Fai clic sull'icona [Textmode Overlay] nella barra degli strumenti
  2  Scegli "select media"
  3  Visualizza in anteprima i target disponibili
  4  Fai clic su un target

Menu contestuale:
  1  Fai clic con il pulsante destro in qualsiasi punto della pagina, o direttamente su un video
  2  Scegli "Open Textmode Overlay"
  3  Nel pannello dell'overlay, scegli "select media"
  4  Fai clic su un canvas o un video evidenziato

Premi Esc quando vuoi annullare la selezione del media.


─── DISEGNA CON LUCE, BORDI O ENTRAMBI

I passaggi di luminosità e contorno possono essere attivati in modo indipendente, offrendoti tre modi per plasmare il risultato:

  ▸ solo luminosità
    ▹ traduci i valori di luce tramite una rampa di glifi personalizzata

  ▸ solo contorno
    ▹ disegna i bordi rilevati come linee grafiche di caratteri

  ▸ combinato
    ▹ sovrapponi i contorni all'ombreggiatura ASCII basata sulla luminosità

Metti a punto la soglia del contorno e la sensibilità al colore, inverti uno dei due passaggi e scegli colori campionati o fissi per i suoi caratteri e le sue celle.


─── RENDI TUO LO STILE

  ▸ fondi il risultato con un controllo di opacità
  ▸ imposta la dimensione dei caratteri, dal dettaglio fitto ai pixel grossi
  ▸ scegli e modifica la rampa di glifi usata per l'ombreggiatura
  ▸ scorri i font textmode inclusi
  ▸ carica font TTF o OTF supportati dal tuo computer
  ▸ campiona i colori di origine o seleziona colori fissi di carattere, cella e sfondo con trasparenza alfa
  ▸ trascina il pannello lontano dalla parte della pagina che vuoi vedere
  ▸ ripristina un esperimento e ricomincia senza selezionare di nuovo il media


─── CREA UNA PILE DI EFFETTI DAL VIVO

Scegli tra 16 filtri di post-elaborazione, tra cui CRT, scanline, bloom, grana della pellicola, pixelizzazione, aberrazione cromatica, posterizzazione, soglia, vignettatura, scala di grigi, seppia e controlli di tonalità, contrasto e saturazione.

Ogni effetto può essere attivato, riordinato, espanso e regolato mentre la sorgente continua a riprodursi. Cambiare l'ordine della pila può produrre un risultato completamente diverso.


─── SALVA UN FOTOGRAMMA

  ▸ TXT
    ▹ copia l'opera come una semplice griglia di caratteri

  ▸ SVG
    ▹ mantieni il risultato textmode nitido a qualsiasi scala

  ▸ PNG
    ▹ esporta un'immagine senza perdita

  ▸ JPG
    ▹ esporta un'immagine raster compatta


─── RICORDA IL TUO FLUSSO DI LAVORO

Il tuo preset di overlay più recente viene ricordato separatamente per ogni dominio. Viene ricordata anche la posizione del pannello, e i font personalizzati restano localmente nello spazio di archiviazione dell'estensione gestito dal browser finché non li rimuovi.


─── PRIVATO PER IMPOSTAZIONE PREDEFINITA

Non ci sono account, renderer cloud, tracciamento, pubblicità né elaborazione remota dei media. L'estensione crea overlay solo quando richiesto e mantiene conversione, impostazioni, font ed esportazioni all'interno del tuo browser.

Autorizzazioni utilizzate:
  ▸ activeTab
    ▹ accede alla pagina solo dopo che invochi l'estensione

  ▸ scripting
    ▹ avvia gli strumenti di overlay nella pagina

  ▸ storage
    ▹ conserva le impostazioni locali e i metadati dei font personalizzati

  ▸ unlimitedStorage
    ▹ conserva localmente i file dei font personalizzati supportati

  ▸ contextMenus
    ▹ aggiunge l'azione con clic destro "Open Textmode Overlay"


─── COMPATIBILITÀ

Sono supportati iframe same-origin, annidati, srcdoc e aggiunti dinamicamente. I media all'interno di iframe cross-origin o con sandbox opaca non possono essere selezionati. Anche i canvas contaminati (tainted canvas), i video DRM e altre sorgenti protette possono bloccare il campionamento dei pixel secondo le normali regole di sicurezza del browser.
