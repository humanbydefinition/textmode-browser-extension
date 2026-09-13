```text
Faça a web em movimento parecer texto.

[Textmode Overlay] é um gerador de arte ASCII em tempo real e um efeito de vídeo para texto para o seu navegador. Selecione um vídeo ou canvas compatível e veja-o virar uma grade de caracteres viva e perfeitamente alinhada. Combine sombreamento por brilho com linhas de contorno, escolha suas cores e fonte, empilhe efeitos visuais e exporte o quadro quando a composição parecer certa.

A mídia de origem permanece embaixo, então você pode mesclar, pausar, redefinir, substituir ou remover o efeito quando quiser.

Feito com textmode.js.


─── EXPERIMENTE

Use o [Textmode Overlay] onde a página expuser um canvas ou vídeo HTML5 compatível:

  ▸ transforme a reprodução do YouTube em arte ASCII ao vivo
  ▸ reinterprete streams e VODs da Twitch em textmode
  ▸ estilize vídeos do Vimeo e outros players de vídeo da web
  ▸ transforme jogos de navegador, demos e canvas WebGL
  ▸ dê um visual de arte em texto a visualizadores de música e áudio
  ▸ explore p5.js, Three.js, arte generativa e esboços de creative coding
  ▸ teste elementos canvas ou vídeo nos seus próprios sites

Algumas mídias protegidas, de origem cruzada ou em sandbox podem ficar indisponíveis. O [Textmode Overlay] marca quadros inacessíveis e relata erros de amostragem sem interromper a página.


─── CRIE UMA SOBREPOSIÇÃO

Abra uma página com um canvas ou vídeo visível.

Barra de ferramentas:
  1  Clique no ícone do [Textmode Overlay] na barra de ferramentas
  2  Escolha "select media"
  3  Pré-visualize os alvos disponíveis
  4  Clique em um alvo

Menu de contexto:
  1  Clique com o botão direito em qualquer lugar da página, ou diretamente em um vídeo
  2  Escolha "Open Textmode Overlay"
  3  No painel de sobreposição, escolha "select media"
  4  Clique em um canvas ou vídeo destacado

Pressione Esc quando quiser cancelar a seleção de mídia.


─── DESENHE COM LUZ, BORDAS OU AMBOS

Os passes de brilho e contorno podem ser ativados de forma independente, dando a você três maneiras de moldar o resultado:

  ▸ somente brilho
    ▹ traduza os valores de luz por uma rampa de glifos personalizada

  ▸ somente contorno
    ▹ desenhe as bordas detectadas como linhas gráficas de caracteres

  ▸ combinado
    ▹ sobreponha contornos ao sombreamento ASCII baseado em brilho

Ajuste o limite de contorno e a sensibilidade à cor, inverta qualquer um dos passes e escolha cores amostradas ou fixas para seus caracteres e células.


─── DEIXE O ESTILO COM A SUA CARA

  ▸ mescle o resultado com um controle de opacidade
  ▸ defina o tamanho dos caracteres, do detalhe denso a pixels graúdos
  ▸ escolha e edite a rampa de glifos usada para o sombreamento
  ▸ percorra as fontes textmode incluídas
  ▸ envie fontes TTF ou OTF compatíveis do seu computador
  ▸ amostre as cores de origem ou selecione cores fixas de caractere, célula e fundo com transparência alfa
  ▸ arraste o painel para longe da parte da página que você quer ver
  ▸ redefina um experimento e recomece sem selecionar a mídia de novo


─── MONTE UMA PILHA DE EFEITOS AO VIVO

Escolha entre 16 filtros de pós-processamento, incluindo CRT, scanlines, bloom, granulado de filme, pixelização, aberração cromática, posterização, limiar, vinheta, escala de cinza, sépia e controles de matiz, contraste e saturação.

Cada efeito pode ser ativado, reordenado, expandido e ajustado enquanto a fonte continua tocando. Mudar a ordem da pilha pode produzir um resultado totalmente diferente.


─── SALVE UM QUADRO

  ▸ TXT
    ▹ copie a arte como uma grade de caracteres simples

  ▸ SVG
    ▹ mantenha o resultado do textmode nítido em qualquer escala

  ▸ PNG
    ▹ exporte uma imagem sem perdas

  ▸ JPG
    ▹ exporte uma imagem raster compacta


─── LEMBRA DO SEU FLUXO DE TRABALHO

Sua predefinição de sobreposição mais recente é lembrada separadamente para cada domínio. A posição do painel também é lembrada, e fontes personalizadas persistem localmente no armazenamento gerenciado pelo navegador até você removê-las.


─── PRIVADO POR PADRÃO

Não há conta, renderizador na nuvem, rastreamento, publicidade nem processamento remoto de mídia. A extensão cria sobreposições apenas quando solicitada e mantém a conversão, as configurações, as fontes e as exportações dentro do seu navegador.

Permissões utilizadas:
  ▸ activeTab
    ▹ acessa a página somente depois que você invoca a extensão

  ▸ scripting
    ▹ inicia as ferramentas de sobreposição na página

  ▸ storage
    ▹ mantém configurações locais e metadados de fontes personalizadas

  ▸ unlimitedStorage
    ▹ mantém localmente os arquivos de fonte personalizados compatíveis

  ▸ contextMenus
    ▹ adiciona a ação de clique direito “Open Textmode Overlay”


─── COMPATIBILIDADE

Iframes de mesma origem, aninhados, srcdoc e adicionados dinamicamente são suportados. Mídia dentro de iframes de origem cruzada ou com sandbox opaco não pode ser selecionada. Canvas com dados contaminados (tainted canvas), vídeo com DRM e outras fontes protegidas também podem bloquear a amostragem de pixels de acordo com as regras normais de segurança do navegador.
```
