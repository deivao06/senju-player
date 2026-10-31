# Smart TV — Senju em LG e Samsung

Modo de tarefa: Operate — conectar a própria lista, encontrar conteúdo e assistir.
Escopo: `apps/smart-tv`, adaptação React DOM/TypeScript para LG webOS 22+ e Samsung
Tizen 6.5+ (modelos 2022 em diante). Esses são alvos de compatibilidade, não uma
certificação de dispositivos. Web e Fire TV permanecem aplicações independentes.
Construção direta em código; preservar a identidade Senju TV existente, sem criar
um novo sistema visual nem alterar o escopo Android de `PRODUCT.md` e `DESIGN.md`.

## Compromissos visuais existentes

Reutilizar verde-preto `#060b09`, superfície `#101b15`, elevado `#17271e`, texto
`#edf5ef`, auxiliar `#a2b7a9`, acento `#34ef7d` e contorno de foco `#c2ffd8`.
O player conserva a proteção verde translúcida `#092619e8`. Hierarquia por tons,
contornos e espaço; sem blur, brilho decorativo, fontes externas ou animação
contínua. A fonte DOM atual é Arial/sans-serif, com base fluida de 16 a 28px;
isso adapta a linguagem nativa, sem converter sp/dp em equivalência física.

Controles comuns recebem contorno claro de 3px, offset de 3px e preenchimento
`#204c33` no foco. Seleção usa `#163b27` e acento, com semântica `aria-pressed`.
O CSS atual das capas mantém fundo transparente no foco, conservando o contorno;
paridade completa com o reforço de preenchimento do sistema nativo é pendente.
Botões e campos têm cantos suaves e alturas relativas; tempos usam números
tabulares. Leitura à distância e contraste sobre vídeo precisam de evidência real.

## Composição implementada

Entrada em duas colunas: marca e chamada à esquerda, formulário à direita com
Xtream Codes/M3U, campos rotulados, credenciais e aviso de dados apenas na sessão.
Formulário rola dentro de 90vh; abaixo de 1000px, espaçamento e padding diminuem.

Shell com menu, marca, contexto, busca contextual no catálogo e perfil. Home com
atalhos Ao vivo/Filmes/Séries e cinco tiles textuais: Netflix, Globoplay, Prime
Video, Disney+ e HBO. Cores de nomes ficam restritas aos tiles. Não há logos nesta
base; os atalhos filtram a própria lista, sem abrir apps externos ou inventar
conteúdo. O tile abre Séries e permite trocar o tipo no catálogo.

Drawer esquerdo reúne início, tipos, plataformas expansíveis e categorias da lista;
perfil à direita permite atualizar e sair. Ambos usam superfície verde e scrim
escuro, largura de 29rem limitada a 70vw. A implementação limita navegação ao
drawer e tenta restaurar o foco ao contexto anterior; a correção em controle real
ainda exige validação.

Catálogo com seis colunas (cinco abaixo de 1000px), até 30 capas por página,
carregamento de imagens sob demanda e nomes truncados em uma linha. Busca,
categorias, plataforma, temporadas e episódios alteram o conjunto exibido.
Carregamento, erro com nova tentativa e vazio com limpeza de filtros têm estados
explícitos. O retorno desfaz player, carregamento, drawer, temporadas ou catálogo
conforme o contexto. Não há rodapé persistente de instruções do controle.

Player ocupa a tela com vídeo contain, título e controles protegidos por verde
translúcido. Controles permanecem visíveis nesta versão. Há fila de episódios,
anterior/próximo e avanço automático na implementação; isso não demonstra
decodificação ou continuidade em hardware.

## Evidência e limites de validação

Passagem documental baseada em leitura de `PRODUCT.md`, `DESIGN.md`,
`docs/SMART-TV.md`, `apps/smart-tv/src/style.css` e `apps/smart-tv/src/App.tsx`.
Nenhum teste, captura de navegador, instalação ou revisão em televisão foi
executado nesta passagem. Capturas e aprovação do Fire TV não validam o DOM.
Verificações de navegador eventualmente conduzidas em paralelo devem registrar
suas próprias evidências antes de serem incorporadas aqui.

Conforme `docs/SMART-TV.md`, Samsung usa AVPlay e LG usa HTML video; navegador
desktop usa formatos nativos. Adaptadores simulados, build, navegador e televisão
são evidências distintas. Sem LG/Samsung conectada. CLI LG3.2.6 usada temporariamente para IPK;
WGT Samsung técnico sem assinatura. Pastas de build não equivalem a instaladores.
Instalação/player reais não foram validados; detalhes em docs/SMART-TV.md.
Compatibilidade Chromium 85/87, IME, códigos de Voltar, navegação remota, codecs,
HLS/MPEG-TS, seek, áudio, CORS/TLS e redirecionamentos requerem testes nos alvos.
Não afirmar aprovação visual, desempenho, memória ou leitura à distância.

## Pendências

- Validar amostras reais e retorno do player numa LG e numa Samsung; medir memória
  e desempenho em modelo de entrada, além de teclado e foco remoto completo.
- Refinar player e auto-hide, logos locais e paridade visual no sistema existente.
- Adaptar persistência segura, múltiplas listas, favoritos, histórico, progresso e
  cache criptografado. Atualmente credenciais e catálogos ficam na sessão; não há
  download de vídeo ou cache persistente.
- Validar empacotamento, instalação, assinatura e requisitos de loja com ferramentas
  oficiais; publicação não foi executada.


Atualização: Chromium141 com fixtures validou login/Home, temporadas, Voltar, drawer,
busca vazia e paginação. Capturas browser não certificam motores85/87 ou decoder
das TVs. IPK LG e WGT sem assinatura publicados com limites explícitos.
