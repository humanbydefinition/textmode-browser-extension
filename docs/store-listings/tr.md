Hareket eden web'i metne dönüştürün.

[Textmode Overlay], tarayıcınız için gerçek zamanlı bir ASCII sanatı üreticisi ve videoyu metne çeviren bir efekt. Uyumlu bir video veya canvas seçin ve onun canlı, kusursuz hizalanmış bir karakter ızgarasına dönüşmesini izleyin. Parlaklık gölgelemesini kontur çizgileriyle birleştirin, renklerinizi ve yazı tipinizi seçin, görsel efektleri katmanlayın ve kompozisyon istediğiniz gibi olduğunda kareyi dışa aktarın.

Kaynak medya altta yerinde kalır; böylece efekti istediğiniz zaman karıştırabilir, duraklatabilir, sıfırlayabilir, değiştirebilir veya kaldırabilirsiniz.

textmode.js ile oluşturuldu.


─── DENEYİN

Sayfa uyumlu bir canvas veya HTML5 video sunduğunda [Textmode Overlay]'i her yerde kullanın:

  ▸ YouTube oynatımını canlı ASCII video sanatına dönüştürün
  ▸ Twitch yayınlarını ve VOD'ları textmode ile yeniden yorumlayın
  ▸ Vimeo videolarını ve diğer web video oynatıcılarını biçimlendirin
  ▸ tarayıcı oyunlarını, demoları ve WebGL canvas'larını dönüştürün
  ▸ müzik ve ses görselleştiricilerine metin sanatı görünümü ekleyin
  ▸ p5.js, Three.js, üretici sanat ve creative coding eskizlerini keşfedin
  ▸ canvas veya video öğelerini kendi sitelerinizde test edin

─── BİR KATMAN OLUŞTURUN

Görünür bir canvas veya video içeren bir sayfa açın.

  1  Araç çubuğundaki [Textmode Overlay] simgesine tıklayarak veya bağlam menüsünden "Open Textmode Overlay" seçeneğini seçerek paneli açın.
  2  Kullanılabilir bir video veya canvas öğesinin üzerine gelerek ya da odağı öğeye getirerek önizleyin.
  3  Katmanı uygulamak için listedeki öğeye tıklayın veya öğeyi klavyeyle seçin.

Bir öğeyi doğrudan sayfadan seçmek için "Select media on page" seçeneğini etkinleştirin ve öğeye tıklayın.

─── IŞIK, KONTUR VEYA HER İKİSİYLE ÇİZİN

Parlaklık ve kontur geçişleri bağımsız olarak etkinleştirilebilir ve sonucu şekillendirmenin üç yolunu sunar:

  ▸ yalnızca parlaklık
    ▹ ışık değerlerini özel bir glif rampasıyla dönüştürün

  ▸ yalnızca kontur
    ▹ algılanan kenarları karakterlerden oluşan grafik çizgiler olarak çizin

  ▸ birleşik
    ▹ konturları parlaklık tabanlı ASCII gölgelemesinin üzerine yerleştirin

Kontur eşiğini ve renk hassasiyetini ince ayarlayın, iki geçişten birini ters çevirin ve karakterleri ile hücreleri için örneklenmiş veya sabit renkler seçin.


─── STİLİ KENDİNİZE GÖRE YAPIN

  ▸ sonucu bir opaklık denetimiyle karıştırın
  ▸ karakter boyutunu yoğun ayrıntıdan iri piksellere kadar ayarlayın
  ▸ gölgeleme için kullanılan glif rampasını seçin ve düzenleyin
  ▸ paketle gelen textmode yazı tiplerini döngüyle gezin
  ▸ desteklenen TTF veya OTF yazı tiplerini bilgisayarınızdan yükleyin
  ▸ kaynak renkleri örnekleyin veya alfa saydamlığa sahip sabit karakter, hücre ve arka plan renkleri seçin
  ▸ paneli sayfanın görmek istediğiniz bölümünden uzağa sürükleyin
  ▸ bir deneyi sıfırlayın ve medyayı yeniden seçmeden baştan başlayın


─── CANLI BİR EFEKT YIĞINI OLUŞTURUN

CRT, tarama çizgileri, bloom, film greni, pikselleştirme, renk sapması, posterizasyon, eşik, vinyet, gri tonlama, sepya ile ton, kontrast ve doygunluk denetimleri dahil 16 işlem sonrası filtresi arasından seçin.

Her efekt, kaynak oynatılmaya devam ederken açılıp kapatılabilir, yeniden sıralanabilir, genişletilebilir ve ayarlanabilir. Yığın sırasını değiştirmek tamamen farklı bir sonuç üretebilir.


─── BİR KAREYİ KAYDEDİN

  ▸ TXT
    ▹ eseri düz bir karakter ızgarası olarak kopyalayın

  ▸ SVG
    ▹ textmode sonucunu her ölçekte net tutun

  ▸ PNG
    ▹ kayıpsız bir görüntü dışa aktarın

  ▸ JSON
    ▹ bir kareyi yapılandırılmış veri olarak dışa aktarın


─── İŞ AKIŞINIZI HATIRLAR

En son katman ön ayarınız her alan adı için ayrı ayrı hatırlanır. Panel konumu da hatırlanır ve özel yazı tipleri, siz onları kaldırana kadar tarayıcı tarafından yönetilen uzantı depolamasında yerel olarak kalır.


─── VARSAYILAN OLARAK GİZLİ

Hesap, bulut oluşturucu, izleme, reklam veya uzaktan medya işleme yoktur. Uzantı katmanları yalnızca istendiğinde oluşturur ve dönüştürmeyi, ayarları, yazı tiplerini ve dışa aktarımları tarayıcınızın içinde tutar.

Kullanılan izinler:
  ▸ activeTab
    ▹ sayfaya yalnızca uzantıyı çağırdıktan sonra erişir

  ▸ scripting
    ▹ sayfa içi katman araçlarını başlatır

  ▸ storage
    ▹ yerel ayarları ve özel yazı tipi meta verilerini korur

  ▸ unlimitedStorage
    ▹ desteklenen özel yazı tipi dosyalarını yerel olarak korur

  ▸ contextMenus
    ▹ "Open Textmode Overlay" sağ tık eylemini ekler
