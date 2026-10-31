# Senju para LG webOS e Samsung Tizen — primeira base

## Escopo e estado

Aplicação React DOM/TypeScript única em `apps/smart-tv`, independente do web e do
Fire TV. Alvo: modelos 2022 em diante (LG webOS 22+, Samsung Tizen 6.5+).
Isso é alvo de compatibilidade, não certificação de todas as TVs.

Primeiro fluxo implementado: conectar M3U/Xtream, Home com cinco plataformas,
catálogo por tipo/categoria/plataforma, busca contextual, temporadas, episódios,
reprodução, próximo/anterior e avanço automático de episódios. A Home usa nomes
das plataformas nesta base; os logotipos e a paridade visual completa vêm depois.
Categorias de plataforma são determinadas pelo nome da categoria fornecida pela
lista. Os tipos podem ser consultados mesmo antes de carregados; sem itens, a
interface informa ausência de conteúdo. Não pressupomos filmes Netflix na fonte.

Reutilização real: serviços, parser, entidades e funções de ordenação/identificação
de plataformas em `packages/iptv`. Os módulos originais do Fire TV reexportam as
funções extraídas para preservar seus imports e os testes existentes.
Sem compartilhamento de React Native/DOM, sem novo backend ou player de terceiros.

## Desenvolvimento

Mesmas versões React/ReactDOM 19.2.4, Vite 6.4.1, TypeScript 5.9.3 e plugin React
4.7.0 já utilizadas no web. Build clássico IIFE com recursos locais (sem dependência de ES modules em file://),
com target Chromium 85 para Samsung 2022;
LG 2022 usa Chromium 87. Não usar APIs modernas sem verificar esse piso.

```bash
pnpm install --frozen-lockfile
pnpm smart:dev                 # http://localhost:5174
pnpm smart:test
pnpm smart:build
pnpm smart:build:webos         # apps/smart-tv/build/webos
pnpm smart:build:tizen         # apps/smart-tv/build/tizen
```

Setas, Enter e Escape permitem experimentar a navegação no computador. Campos de
texto preservam as setas horizontais para edição; o IME nativo ainda precisa de
teste. Voltar reconhece 461 (LG) e 10009 (Samsung). Drawers limitam o movimento aos
controles visíveis dentro deles. Paginação explícita: até 30 capas por página,
com lazy loading; catálogos já consultados ficam em memória até sair da lista.
Não há download de vídeo nem cache persistente nesta versão.

## Reprodução

- Samsung: carrega o script local `$WEBAPIS/webapis/webapis.js`, detecta AVPlay,
  prepara assincronamente, reproduz e fecha o decoder ao sair. Nenhum fallback
  silencioso para HTML video se a API Samsung falhar na inicialização.
- LG: elemento HTML video, usando a reprodução oferecida pela plataforma. HLS,
  MPEG-TS, codecs, áudio, seek e redirecionamentos dependem da TV e do stream.
- Navegador: HTML video, limitado aos formatos nativos do navegador. Um erro HLS
  no Chrome de computador não certifica falha nem sucesso na TV.
- Fontes que exigem headers customizados são rejeitadas explicitamente nesta
  etapa. Não ignoramos Referer/User-Agent em silêncio.
- Controles ainda permanecem visíveis; auto-hide e refinamento do player pendentes.
- Ao ocultar o aplicativo, a reprodução é pausada. Retomar é uma ação explícita.

## Credenciais e rede

Credenciais e URLs só ficam na memória da sessão. Não gravamos senhas/tokens em
localStorage, IndexedDB ou logs. Fechar/recarregar exige conectar novamente.
Persistência segura, seleção de múltiplas listas, favoritos, histórico, progresso
e cache criptografado exigem adaptação posterior; o módulo Android não é portátil.

Requisições são diretas ao provedor; não dependem do proxy do Senju Web. O servidor
precisa permitir o acesso pelo ambiente web da TV. CORS, HTTP/HTTPS, TLS, URLs com
headers e redirecionamentos precisam de testes reais. A política de acesso ampla
no manifesto Tizen permite listas de diferentes domínios; não contorna CORS.
O script Samsung usa somente a API local do fabricante; sem CDN na aplicação.

## Pacotes e instalação — comandos ainda não validados neste ambiente

As pastas `build/webos` e `build/tizen` contêm recursos e metadados para as ferramentas
oficiais. As pastas não são instaladores. Atualização: gerado IPK de desenvolvimento e WGT não assinado; veja a seção de publicação abaixo.
Não há LG/Samsung conectada. CLI LG 3.2.6 foi instalada temporariamente em /tmp; Tizen Studio não está instalado.

### LG

Instalar webOS CLI, habilitar Developer Mode na TV e cadastrar o dispositivo com
`ares-setup-device`. Configurar a chave conforme o fluxo oficial de Developer Mode.
Na raiz do repositório:

```bash
pnpm smart:build:webos
mkdir -p apps/smart-tv/build/packages
ares-package --no-minify apps/smart-tv/build/webos -o apps/smart-tv/build/packages
# Usar o nome real do .ipk produzido e o alias cadastrado:
ares-install --device MINHA_LG CAMINHO_DO_IPK
ares-launch --device MINHA_LG com.senju.player.tv
```

### Samsung

Instalar Tizen Studio/TV Extension/Certificate Extension, conectar a TV em Developer
Mode e criar um perfil de certificado apropriado ao dispositivo. Na raiz:

```bash
pnpm smart:build:tizen
# Ajustar o identificador de pacote de desenvolvimento antes de publicar na loja.
tizen package -t wgt -s MEU_PERFIL -- apps/smart-tv/build/tizen
# Usar nome e diretório reais do WGT gerado e o target cadastrado:
tizen install -n ARQUIVO.wgt -t MINHA_SAMSUNG -- DIRETORIO_DO_WGT
tizen run -p SenjuTV001.Player -t MINHA_SAMSUNG
```

IDs e ícone geométrico locais são de desenvolvimento; cadastro, assinatura,
requisitos de loja e publicação ainda não foram executados. Download por Pages
não substitui os fluxos de instalação/certificados dos fabricantes.

## Validação e sequência prioritária

Testes de adaptadores usam APIs simuladas, não decodificadores reais.
Build, teste do navegador e teste de hardware são evidências diferentes.
A primeira tentativa do Chromium falhou por bibliotecas ausentes. Após extrair as bibliotecas somente em /tmp, o teste de navegador passou com respostas Xtream fictícias: login/Home, temporadas, Voltar, drawer, busca vazia e paginação. Isso não valida o runtime/decoder da TV.
A próxima etapa essencial é reproduzir amostras reais de HLS, MPEG-TS, filmes e
séries numa LG e numa Samsung, incluindo entrada de texto e retorno do player.
Depois: foco remoto completo, segurança/persistência, biblioteca pessoal, cache e
paridade visual. Desempenho e memória precisam de medição em modelo de entrada.

## Fontes oficiais consultadas

- https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine
- https://webostv.developer.lge.com/develop/specifications/streaming-protocol-drm
- https://webostv.developer.lge.com/develop/getting-started/web-app-types
- https://webostv.developer.lge.com/develop/references/appinfo-json
- https://webostv.developer.lge.com/develop/tools/cli-dev-guide
- https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html
- https://developer.samsung.com/smarttv/develop/guides/multimedia/media-playback/using-avplay.html
- https://developer.samsung.com/smarttv/develop/guides/fundamentals/configuring-tv-applications.html

## Publicação de testes — 2026-10-30

- Página: https://deivao06.github.io/senju-player-tv/
- Guia LG: https://deivao06.github.io/senju-player-tv/lg.html
- Arquivos: https://github.com/deivao06/senju-player-tv/releases/tag/v0.1.0-smart-preview.1
- LG `senju-player-lg.ipk`: CLI oficial 3.2.6 com --no-minify; estrutura ar/tar e recursos verificados byte a byte com o build do Vite. A CLI informou Success mas encerrou com código 134 neste ambiente Node22; a saída anormal está registrada, sem afirmar instalação válida.
- Samsung `senju-player-samsung-unsigned.wgt`: ZIP/WGT técnico sem assinatura, criado por `python3 apps/smart-tv/scripts/package-tizen.py` após o build Tizen. XML/ZIP verificados; não instala diretamente. Exige certificado/perfil apropriado e validação nas ferramentas Samsung.
- Sem certificados privados embutidos nos pacotes ou repositório público. Sem dados de listas.
- Instalação, player real, codecs, IME e desempenho continuam não validados em LG/Samsung.
- Fire TV APK público é o mesmo hash já testado no AFTSSS; não houve atualização da TV nesta publicação.

Para reproduzir o WGT sem assinatura depois do build:

```bash
pnpm smart:build:tizen
python3 apps/smart-tv/scripts/package-tizen.py
```

O script usa Python3/zipfile e não substitui a etapa oficial de assinatura Samsung.
