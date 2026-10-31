# Downloads — Senju Player

Modo de tarefa: Operate — identificar a plataforma, baixar e instalar o player.
Escopo: página pública estática `distribution/senju-player-tv/index.html`.
Preservar a identidade Senju TV e manter `DESIGN.md` intacto.

## Composição e compromissos

Fire TV é a ação principal: chamada à esquerda, painel do APK à direita,
instruções em três passos e informações de compatibilidade. LG webOS e Samsung
Tizen aparecem como prévias para modelos2022+: LG tem link para o IPK de teste e
guia; Samsung informa que não há instalador pronto e aponta à prévia técnica sem
assinatura. O APK não serve a esses sistemas.

Mesma paleta verde: fundo `#060b09`, superfície `#101b15`, texto `#edf5ef`, auxiliar
`#a2b7a9`, ação `#34ef7d`, separador `#2b4034` e foco `#c2ffd8`. Arial/Helvetica
local, superfícies tonais e cantos suaves, sem novo sistema visual. CTA verde com
texto escuro, foco visível e link de salto ao download. Em telas estreitas, hero,
passos e linhas de plataformas passam a uma coluna; endereço e hash podem quebrar.
Movimento reduzido desativa rolagem suave.

A página informa versão de testes, requisitos do APK, chave de desenvolvimento,
integridade SHA-256 e ausência de conteúdo fornecido pelo Senju. Detalhes de
versão e downloads apontam ao GitHub; instalação por Downloader tem instruções
próprias. A compatibilidade declarada do aplicativo não valida a página nesse
navegador.

## Evidência e limites

Fonte HTML/CSS inspecionada nesta passagem. Evidência de navegador e revisão
informada pela tarefa principal: capturas reais Chromium em
`.impeccable/review/download-1920.png`, `download-1280.png` e `download-390.png`;
verificações de ausência de overflow e foco em link aprovadas. Revisão independente:
ship para o design no escopo capturado.

Endpoints de publicação ainda em andamento. Disponibilidade pública e entrega do
APK exigem confirmação após publicação. Downloader e hardware não foram testados;
as capturas Chromium não certificam esses ambientes nem a instalação nas TVs.


## Atualização — prévia LG publicada

Guia `distribution/senju-player-tv/lg.html`, capturas desktop1280 e mobile390.
Download IPK para desenvolvimento e instruções de Developer Mode/computador
na mesma rede. Ainda sem teste de instalação/player na TV. Samsung possui WGT
técnico não assinado no release, mas não um instalador pronto. Revisão independente
ship; clareza ajustada para “Instalador ainda indisponível” com link à prévia técnica.
Site/Fire TV endpoints HTTP200; LG/WGT verificados por download e hash conforme
registro em docs/VALIDACAO.md. A publicação não valida Downloader ou hardware.
