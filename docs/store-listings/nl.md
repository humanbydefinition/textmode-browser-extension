Laat het bewegende web eruitzien als tekst.

[Textmode Overlay] is een realtime ASCII-artgenerator en video-naar-tekst-effect voor je browser. Selecteer een compatibele video of canvas en zie hoe die verandert in een levendig, perfect uitgelijnd raster van tekens. Combineer helderheidsarcering met contourlijnen, kies je kleuren en lettertype, stapel visuele effecten en exporteer het frame wanneer de compositie goed voelt.

De bronmedia blijft eronder staan, zodat je het effect op elk moment kunt mengen, pauzeren, resetten, vervangen of verwijderen.

Gebouwd met textmode.js.


─── PROBEER HET

Gebruik [Textmode Overlay] overal waar de pagina een compatibele canvas of HTML5-video toont:

  ▸ verander YouTube-weergave in live ASCII-videokunst
  ▸ herinterpreteer Twitch-streams en VOD's in textmode
  ▸ styleer Vimeo-video's en andere webvideospelers
  ▸ transformeer browsergames, demo's en WebGL-canvas
  ▸ geef muziek- en audiovisualisaties een tekstkunst-look
  ▸ verken p5.js, Three.js, generatieve kunst en creative-coding-schetsen
  ▸ test canvas- of video-elementen op je eigen websites

Sommige beveiligde, cross-origin of in sandbox gezette media zijn mogelijk niet beschikbaar. [Textmode Overlay] markeert ontoegankelijke frames en meldt samplingfouten zonder de pagina te onderbreken.


─── MAAK EEN OVERLAY

Open een pagina met een zichtbare canvas of video.

Werkbalk:
  1  Klik op het [Textmode Overlay]-pictogram in de werkbalk
  2  Kies "select media"
  3  Bekijk een voorbeeld van de beschikbare doelen
  4  Klik op een doel

Contextmenu:
  1  Klik met de rechtermuisknop ergens op de pagina, of direct op een video
  2  Kies "Open Textmode Overlay"
  3  Kies in het overlaypaneel "select media"
  4  Klik op een gemarkeerde canvas of video

Druk op Esc wanneer je de mediaselectie wilt annuleren.


─── TEEKEN MET LICHT, RANDEN OF BEIDE

De helderheids- en contourpassen kunnen onafhankelijk worden ingeschakeld, wat je drie manieren geeft om het resultaat vorm te geven:

  ▸ alleen helderheid
    ▹ zet lichtwaarden om via een aangepaste glyph-ramp

  ▸ alleen contour
    ▹ teken gedetecteerde randen als grafische lijnen van tekens

  ▸ gecombineerd
    ▹ leg contouren over op helderheidsgebaseerde ASCII-arcering

Fijn-afstelling van de contourdrempel en kleurgevoeligheid, keer een van beide passen om en kies bemonsterde of vaste kleuren voor de tekens en cellen.


─── MAAK DE STIJL VAN JOU

  ▸ meng het resultaat met een dekkingsregelaar
  ▸ stel de tekengrootte in van dicht detail tot grove pixels
  ▸ kies en bewerk de glyph-ramp voor de arcering
  ▸ wissel door de meegeleverde textmode-lettertypen
  ▸ upload ondersteunde TTF- of OTF-lettertypen vanaf je computer
  ▸ bemonster bronkleuren of selecteer vaste teken-, cel- en achtergrondkleuren met alfatransparantie
  ▸ sleep het paneel weg van het deel van de pagina dat je wilt zien
  ▸ reset een experiment en begin opnieuw zonder de media opnieuw te selecteren


─── BOUW EEN LIVE-EFFECTENSTAPEL

Kies uit 16 post-processingfilters, waaronder CRT, scanlines, bloom, filmkorrel, pixelering, chromatische aberratie, posterisatie, drempel, vignet, grijswaarden, sepia en regelaars voor tint, contrast en verzadiging.

Elk effect kan worden in- en uitgeschakeld, herschikt, uitgeklapt en aangepast terwijl de bron blijft spelen. De volgorde van de stapel wijzigen kan een heel ander resultaat opleveren.


─── BEWAAR EEN FRAME

  ▸ TXT
    ▹ kopieer het werk als een gewoon tekenraster

  ▸ SVG
    ▹ houd het textmode-resultaat scherp op elke schaal

  ▸ PNG
    ▹ exporteer een verliesvrije afbeelding

  ▸ JPG
    ▹ exporteer een compacte rasterafbeelding


─── ONTHOUDT JE WORKFLOW

Je meest recente overlaypreset wordt per domein apart onthouden. De paneelpositie wordt ook onthouden, en aangepaste lettertypen blijven lokaal in de door de browser beheerde extensieopslag totdat je ze verwijdert.


─── PRIVÉ STANDAARD

Er is geen account, cloudrenderer, tracking, advertenties of externe mediaverwerking. De extensie maakt alleen overlays wanneer daarom wordt gevraagd en houdt conversie, instellingen, lettertypen en exports binnen je browser.

Gebruikte machtigingen:
  ▸ activeTab
    ▹ toegang tot de pagina pas nadat je de extensie aanroept

  ▸ scripting
    ▹ start de overlaytools in de pagina

  ▸ storage
    ▹ bewaart lokale instellingen en metadata van aangepaste lettertypen

  ▸ unlimitedStorage
    ▹ bewaart ondersteunde aangepaste lettertypebestanden lokaal

  ▸ contextMenus
    ▹ voegt de rechtermuisknopactie "Open Textmode Overlay" toe


─── COMPATIBILITEIT

Same-origin, geneste, srcdoc- en dynamisch toegevoegde iframes worden ondersteund. Media in cross-origin of ondoorzichtige sandbox-iframes kunnen niet worden gekozen. Besmette canvas (tainted canvas), DRM-video en andere beveiligde bronnen kunnen het bemonsteren van pixels ook blokkeren volgens de normale beveiligingsregels van de browser.
