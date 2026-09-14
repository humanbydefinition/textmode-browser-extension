Lass das bewegte Web wie Text aussehen.

[Textmode Overlay] ist ein Echtzeit-ASCII-Art-Generator und Video-zu-Text-Effekt für deinen Browser. Wähle ein kompatibles Video oder Canvas aus und sieh zu, wie es zu einem lebendigen, perfekt ausgerichteten Zeichenraster wird. Kombiniere Helligkeitsschattierungen mit Konturlinien, wähle deine Farben und Schriftarten, staple visuelle Effekte und exportiere das Bild, wenn die Komposition passt.

Die Quellmedien bleiben darunter an Ort und Stelle, sodass du den Effekt jederzeit mischen, anhalten, zurücksetzen, ersetzen oder entfernen kannst.

Erstellt mit textmode.js.


─── AUSPROBIEREN

Nutze [Textmode Overlay] überall dort, wo die Seite ein kompatibles Canvas oder HTML5-Video bereitstellt:

  ▸ verwandle YouTube-Wiedergabe in lebendige ASCII-Videokunst
  ▸ interpretiere Twitch-Streams und VODs im Textmodus neu
  ▸ stylisiere Vimeo-Videos und andere Web-Videoplayer
  ▸ verwandle Browserspiele, Demos und WebGL-Canvas-Elemente
  ▸ verleihe Musik- und Audiovisualisierern einen Text-Art-Look
  ▸ erkunde p5.js, Three.js, generative Kunst und Creative-Coding-Skizzen
  ▸ teste Canvas- oder Video-Elemente in deinen eigenen Websites

Einige geschützte, cross-origin- oder in einer Sandbox isolierte Medien sind möglicherweise nicht verfügbar. [Textmode Overlay] markiert unzugängliche Frames und meldet Sampling-Fehler, ohne die Seite zu unterbrechen.


─── OVERLAY ERSTELLEN

Öffne eine Seite mit einem sichtbaren Canvas oder Video.

Symbolleiste:
  1  Klicke auf das [Textmode Overlay]-Symbol in der Symbolleiste
  2  Wähle "select media"
  3  Sieh dir die verfügbaren Ziele in der Vorschau an
  4  Klicke auf ein Ziel

Kontextmenü:
  1  Klicke mit der rechten Maustaste irgendwo auf die Seite oder direkt auf ein Video
  2  Wähle "Open Textmode Overlay"
  3  Wähle im Overlay-Bedienfeld "select media"
  4  Klicke auf ein hervorgehobenes Canvas oder Video

Drücke jederzeit Esc, um die Medienauswahl abzubrechen.


─── MIT LICHT, KANTEN ODER BEIDEM ZEICHNEN

Die Helligkeits- und Konturdurchgänge lassen sich unabhängig voneinander aktivieren, sodass du das Ergebnis auf drei Weisen formen kannst:

  ▸ nur Helligkeit
    ▹ übersetze Helligkeitswerte über eine eigene Glyphen-Rampe

  ▸ nur Kontur
    ▹ zeichne erkannte Kanten als grafische Zeichenlinien

  ▸ kombiniert
    ▹ lege Konturen über die helligkeitsbasierte ASCII-Schattierung

Feinjustiere Konturschwelle und Farbempfindlichkeit, invertiere beide Durchgänge und wähle abgetastete oder feste Farben für Zeichen und Zellen.


─── MACHE DEN STIL ZU DEINEM

  ▸ mische das Ergebnis mit einer Deckkraft-Steuerung
  ▸ stelle die Zeichengröße von dichtem Detail bis zu groben Pixeln ein
  ▸ wähle und bearbeite die Glyphen-Rampe für die Schattierung
  ▸ wechsle durch die mitgelieferten Textmodus-Schriftarten
  ▸ lade unterstützte TTF- oder OTF-Schriftarten von deinem Computer hoch
  ▸ taste Quellfarben ab oder wähle feste Zeichen-, Zellen- und Hintergrundfarben mit Alpha-Transparenz
  ▸ zieh das Bedienfeld von dem Seitenteil weg, den du sehen möchtest
  ▸ setze ein Experiment zurück und starte erneut, ohne die Medien neu auszuwählen


─── BAUE EINEN LIVE-EFFEKT-STAPEL

Wähle aus 16 Nachbearbeitungsfiltern, darunter CRT, Scanlines, Bloom, Filmkorn, Pixelierung, chromatische Aberration, Posterisierung, Schwellenwert, Vignette, Graustufen, Sepia sowie Farbton-, Kontrast- und Sättigungsregler.

Jeder Effekt lässt sich umschalten, neu anordnen, aufklappen und anpassen, während die Quelle weiterläuft. Eine andere Reihenfolge im Stapel kann ein völlig anderes Ergebnis erzeugen.


─── EIN BILD SPEICHERN

  ▸ TXT
    ▹ kopiere das Kunstwerk als reines Zeichenraster

  ▸ SVG
    ▹ halte das Textmodus-Ergebnis in jeder Größe scharf

  ▸ PNG
    ▹ exportiere ein verlustfreies Bild

  ▸ JPG
    ▹ exportiere ein kompaktes Rasterbild


─── BEHÄLT DEINEN WORKFLOW

Dein zuletzt verwendetes Overlay-Preset wird für jede Domain separat gespeichert. Auch die Position des Bedienfelds wird gemerkt, und eigene Schriftarten bleiben lokal im vom Browser verwalteten Erweiterungsspeicher, bis du sie entfernst.


─── PRIVAT ALS STANDARD

Es gibt kein Konto, keinen Cloud-Renderer, kein Tracking, keine Werbung und keine externe Medienverarbeitung. Die Erweiterung erstellt Overlays nur auf Anfrage und behält Konvertierung, Einstellungen, Schriftarten und Exporte in deinem Browser.

Verwendete Berechtigungen:
  ▸ activeTab
    ▹ greift erst nach deinem Aufruf der Erweiterung auf die Seite zu

  ▸ scripting
    ▹ startet die In-Page-Overlay-Werkzeuge

  ▸ storage
    ▹ behält lokale Einstellungen und Metadaten eigener Schriftarten

  ▸ unlimitedStorage
    ▹ behält unterstützte eigene Schriftdateien lokal

  ▸ contextMenus
    ▹ fügt die Rechtsklick-Aktion „Open Textmode Overlay“ hinzu


─── KOMPATIBILITÄT

Same-Origin-, verschachtelte, srcdoc- und dynamisch hinzugefügte iframes werden unterstützt. Medien in cross-origin- oder undurchsichtigen Sandbox-iframes lassen sich nicht auswählen. Canvas-Elemente mit gesperrtem Pixelzugriff (tainted canvas), DRM-Videos und andere geschützte Quellen können das Pixel-Sampling gemäß den üblichen Browsersicherheitsregeln ebenfalls blockieren.
