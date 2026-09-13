```text
Niech poruszający się internet wygląda jak tekst.

[Textmode Overlay] to generator grafiki ASCII w czasie rzeczywistym i efekt „wideo w tekst” dla Twojej przeglądarki. Wybierz zgodny film lub canvas i patrz, jak zmienia się w żywą, idealnie wyrównaną siatkę znaków. Łącz cieniowanie według jasności z liniami konturu, wybieraj kolory i czcionkę, nakładaj efekty wizualne i eksportuj klatkę, gdy kompozycja jest taka, jak chcesz.

Źródłowe medium pozostaje pod spodem, więc możesz w dowolnym momencie zmieszać, wstrzymać, zresetować, zastąpić lub usunąć efekt.

Zbudowane z textmode.js.


─── WYPRÓBUJ

Używaj [Textmode Overlay] wszędzie tam, gdzie strona udostępnia zgodny canvas lub film HTML5:

  ▸ zamień odtwarzanie YouTube w żywą grafikę ASCII wideo
  ▸ zinterpretuj na nowo transmisje i VOD Twitch w textmode
  ▸ stylizuj filmy Vimeo i inne odtwarzacze wideo w sieci
  ▸ przekształcaj gry przeglądarkowe, dema i canvas WebGL
  ▸ nadaj wygląd sztuki tekstowej wizualizacjom muzyki i dźwięku
  ▸ odkrywaj p5.js, Three.js, sztukę generatywną i szkice creative coding
  ▸ testuj elementy canvas lub wideo na własnych stronach

Niektóre chronione, cross-origin lub objęte sandboxem media mogą być niedostępne. [Textmode Overlay] oznacza niedostępne klatki i zgłasza błędy próbkowania, nie przerywając działania strony.


─── UTWÓRZ NAKŁADKĘ

Otwórz stronę z widocznym canvasem lub filmem.

Pasek narzędzi:
  1  Kliknij ikonę [Textmode Overlay] na pasku narzędzi
  2  Wybierz „select media”
  3  Podejrzyj dostępne cele
  4  Kliknij cel

Menu kontekstowe:
  1  Kliknij prawym przyciskiem w dowolnym miejscu strony lub bezpośrednio na filmie
  2  Wybierz „Open Textmode Overlay”
  3  W panelu nakładki wybierz „select media”
  4  Kliknij podświetlony canvas lub film

Naciśnij Esc, gdy chcesz anulować wybór medium.


─── RYSUJ ŚWIATŁEM, KONTUREM LUB JEDNYM I DRUGIM

Przebiegi jasności i konturu można włączać niezależnie, co daje trzy sposoby kształtowania wyniku:

  ▸ tylko jasność
    ▹ przekształcaj wartości światła przez własną rampę glifów

  ▸ tylko kontur
    ▹ rysuj wykryte krawędzie jako graficzne linie znaków

  ▸ połączone
    ▹ nakładaj kontury na cieniowanie ASCII oparte na jasności

Dopracuj próg konturu i czułość na kolor, odwróć dowolny przebieg i wybierz próbkowane lub stałe kolory dla jego znaków i komórek.


─── NADAJ STYLOWI WŁASNY CHARAKTER

  ▸ mieszaj wynik za pomocą kontrolki krycia
  ▸ ustaw rozmiar znaków od gęstych szczegółów po grube piksele
  ▸ wybierz i edytuj rampę glifów używaną do cieniowania
  ▸ przełączaj dołączone czcionki textmode
  ▸ wgraj obsługiwane czcionki TTF lub OTF z komputera
  ▸ próbkuj kolory źródła lub wybierz stałe kolory znaków, komórek i tła z przezroczystością alfa
  ▸ przeciągnij panel z dala od części strony, którą chcesz widzieć
  ▸ zresetuj eksperyment i zacznij od nowa bez ponownego wybierania medium


─── ZBUDUJ STOS EFEKTÓW NA ŻYWO

Wybieraj spośród 16 filtrów przetwarzania końcowego, w tym CRT, scanline, bloom, ziarno filmowe, pikselizację, aberrację chromatyczną, posteryzację, próg, winietę, odcienie szarości, sepia oraz kontrolki barwy, kontrastu i nasycenia.

Każdy efekt można włączać, zmieniać kolejność, rozwijać i dostrajać, gdy źródło nadal jest odtwarzane. Zmiana kolejności stosu może dać zupełnie inny wynik.


─── ZAPISZ KLATKĘ

  ▸ TXT
    ▹ skopiuj dzieło jako zwykłą siatkę znaków

  ▸ SVG
    ▹ zachowaj ostrość wyniku textmode w dowolnej skali

  ▸ PNG
    ▹ wyeksportuj obraz bezstratny

  ▸ JPG
    ▹ wyeksportuj kompaktowy obraz rastrowy


─── PAMIĘTA TWÓJ PRZEPŁYW PRACY

Ostatni preset nakładki jest pamiętany osobno dla każdej domeny. Pozycja panelu również jest pamiętana, a własne czcionki pozostają lokalnie w zarządzanej przez przeglądarkę pamięci rozszerzenia, dopóki ich nie usuniesz.


─── PRYWATNOŚĆ DOMYŚLNIE

Nie ma konta, renderera w chmurze, śledzenia, reklam ani zdalnego przetwarzania mediów. Rozszerzenie tworzy nakładki tylko na żądanie i zachowuje konwersję, ustawienia, czcionki i eksporty w Twojej przeglądarce.

Używane uprawnienia:
  ▸ activeTab
    ▹ dostęp do strony tylko po wywołaniu rozszerzenia

  ▸ scripting
    ▹ uruchomienie narzędzi nakładki na stronie

  ▸ storage
    ▹ zachowanie lokalnych ustawień i metadanych własnych czcionek

  ▸ unlimitedStorage
    ▹ lokalne zachowanie obsługiwanych plików własnych czcionek

  ▸ contextMenus
    ▹ dodanie akcji „Open Textmode Overlay” po kliknięciu prawym przyciskiem


─── ZGODNOŚĆ

Obsługiwane są elementy iframe tego samego źródła, zagnieżdżone, srcdoc i dodawane dynamicznie. Media wewnątrz iframe cross-origin lub nieprzejrzystego sandboxa nie mogą być wybrane. Zanieczyszczone canvasy (tainted canvas), wideo DRM i inne chronione źródła mogą również blokować próbkowanie pikseli zgodnie ze standardowymi zasadami bezpieczeństwa przeglądarki.
```
