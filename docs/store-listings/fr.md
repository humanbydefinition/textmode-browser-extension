Faites ressembler le web en mouvement à du texte.

[Textmode Overlay] est un générateur d'art ASCII en temps réel et un effet vidéo-vers-texte pour votre navigateur. Sélectionnez une vidéo ou un canvas compatible, puis regardez-la devenir une grille de caractères vivante et parfaitement alignée. Mélangez l'ombrage par luminosité avec des lignes de contour, choisissez vos couleurs et votre police, empilez des effets visuels et exportez l'image lorsque la composition vous convient.

Le média source reste en dessous, vous pouvez donc mélanger, mettre en pause, réinitialiser, remplacer ou retirer l'effet quand vous le souhaitez.

Créé avec textmode.js.


─── ESSAYEZ-LE

Utilisez [Textmode Overlay] partout où la page expose un canvas ou une vidéo HTML5 compatible :

  ▸ transformez la lecture YouTube en art ASCII vidéo en direct
  ▸ réinterprétez les streams et VOD Twitch en textmode
  ▸ stylisez les vidéos Vimeo et autres lecteurs vidéo web
  ▸ transformez les jeux de navigateur, démos et canvas WebGL
  ▸ ajoutez un rendu d'art textuel aux visualiseurs de musique et d'audio
  ▸ explorez p5.js, Three.js, l'art génératif et les croquis de creative coding
  ▸ testez des éléments canvas ou vidéo sur vos propres sites web

Certains médias protégés, cross-origin ou en sandbox peuvent être indisponibles. [Textmode Overlay] signale les images inaccessibles et rapporte les erreurs d'échantillonnage sans interrompre la page.


─── CRÉER UNE SUPERPOSITION

Ouvrez une page contenant un canvas ou une vidéo visible.

Barre d'outils :
  1  Cliquez sur l'icône [Textmode Overlay] de la barre d'outils
  2  Choisissez « select media »
  3  Prévisualisez les cibles disponibles
  4  Cliquez sur une cible

Menu contextuel :
  1  Faites un clic droit n'importe où sur la page, ou directement sur une vidéo
  2  Choisissez « Open Textmode Overlay »
  3  Dans le panneau de superposition, choisissez « select media »
  4  Cliquez sur un canvas ou une vidéo mis en évidence

Appuyez sur Échap à tout moment pour annuler la sélection du média.


─── DESSINER AVEC LA LUMIÈRE, LES CONTOURS, OU LES DEUX

Les passes de luminosité et de contour peuvent être activées indépendamment, ce qui vous donne trois façons de façonner le résultat :

  ▸ luminosité seule
    ▹ traduire les valeurs de lumière via une rampe de glyphes personnalisée

  ▸ contour seul
    ▹ dessiner les bords détectés comme des lignes graphiques de caractères

  ▸ combiné
    ▹ superposer les contours à l'ombrage ASCII basé sur la luminosité

Affinez le seuil de contour et la sensibilité aux couleurs, inversez l'une ou l'autre passe et choisissez des couleurs échantillonnées ou fixes pour ses caractères et ses cellules.


─── FAITES LE STYLE À VOTRE IMAGE

  ▸ mélangez le résultat avec un contrôle d'opacité
  ▸ réglez la taille des caractères, du détail fin aux gros pixels
  ▸ choisissez et modifiez la rampe de glyphes utilisée pour l'ombrage
  ▸ parcourez les polices textmode fournies
  ▸ importez des polices TTF ou OTF compatibles depuis votre ordinateur
  ▸ échantillonnez les couleurs source ou sélectionnez des couleurs fixes de caractère, de cellule et d'arrière-plan avec transparence alpha
  ▸ faites glisser le panneau loin de la partie de la page que vous voulez voir
  ▸ réinitialisez une expérience et recommencez sans resélectionner le média


─── COMPOSEZ UNE PILE D'EFFETS EN DIRECT

Choisissez parmi 16 filtres de post-traitement, notamment CRT, scanlines, bloom, grain de film, pixellisation, aberration chromatique, postérisation, seuil, vignette, niveaux de gris, sépia et réglages de teinte, de contraste et de saturation.

Chaque effet peut être activé, réordonné, développé et ajusté pendant que la source continue de jouer. Modifier l'ordre de la pile peut produire un résultat complètement différent.


─── ENREGISTRER UNE IMAGE

  ▸ TXT
    ▹ copiez l'œuvre sous forme de grille de caractères brute

  ▸ SVG
    ▹ gardez le résultat textmode net à n'importe quelle échelle

  ▸ PNG
    ▹ exportez une image sans perte

  ▸ JPG
    ▹ exportez une image raster compacte


─── MÉMORISE VOTRE FLUX DE TRAVAIL

Votre dernier préréglage de superposition est mémorisé séparément pour chaque domaine. La position du panneau est également mémorisée, et les polices personnalisées persistent localement dans le stockage géré par le navigateur jusqu'à ce que vous les supprimiez.


─── PRIVÉ PAR DÉFAUT

Il n'y a ni compte, ni moteur de rendu cloud, ni suivi, ni publicité, ni traitement distant des médias. L'extension crée des superpositions uniquement à la demande et garde la conversion, les réglages, les polices et les exports dans votre navigateur.

Autorisations utilisées :
  ▸ activeTab
    ▹ accéder à la page seulement après votre appel de l'extension

  ▸ scripting
    ▹ démarrer les outils de superposition dans la page

  ▸ storage
    ▹ conserver les réglages locaux et les métadonnées des polices personnalisées

  ▸ unlimitedStorage
    ▹ conserver localement les fichiers de police personnalisés compatibles

  ▸ contextMenus
    ▹ ajouter l'action de clic droit « Open Textmode Overlay »


─── COMPATIBILITÉ

Les iframes same-origin, imbriquées, srcdoc et ajoutées dynamiquement sont prises en charge. Les médias dans des iframes cross-origin ou à sandbox opaque ne peuvent pas être ciblés. Les canvas corrompus (tainted canvas), les vidéos DRM et d'autres sources protégées peuvent aussi bloquer l'échantillonnage des pixels selon les règles de sécurité habituelles du navigateur.
