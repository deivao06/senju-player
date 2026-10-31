# Validação — atualização em 28/10/2026

Monorepo, serviços compartilhados e aplicativo nativo implementados. APKs Android gerados.
A versão anterior foi instalada e abriu no Amazon AFTSSS (Android9/API28, ARMv7).
Depois disso, o usuário pediu o redesenho da entrada e suspendeu ações no aparelho, pois
outras pessoas estavam usando a TV. A nova interface foi compilada localmente e depois instalada/iniciada após a liberação
explícita do usuário, conforme o registro ao fim deste documento. O foco da entrada foi corrigido e validado posteriormente no próprio aparelho, conforme
o registro abaixo. Reprodução e navegação completa do catálogo continuam pendentes.

## Resultados atuais

| Verificação | Resultado observado |
| --- | --- |
| `pnpm install --frozen-lockfile --offline` | Aprovado, quatro workspaces. Aviso sobre script esbuild ignorado; o binário opcional instalado funcionou nos builds. |
| `pnpm build` | Aprovado; Vite6.4.1, JS ~1.243 MB, aviso de chunk >500 kB. Saída apps/web/dist. |
| `pnpm test` | Dez testes aprovados: cinco de serviços IPTV e cinco de transporte/preparação de streams nativos. Fixtures locais, sem provedor real. |
| `pnpm tv:typecheck` | Aprovado, incluindo o pacote IPTV compartilhado. |
| `pnpm --filter @senju/fire-tv bundle` | Aprovado; apps/fire-tv/build/index.android.bundle. |
| Hermes | Bytecode compilado pelo hermesc instalado. Bytecode HBC versão96 também confirmado dentro dos APKs release/sideload. |
| Autolinking | RN TV e módulos Android video, keychain e async-storage resolvidos e compilados. |
| Build Android | `./gradlew assembleDebug assembleRelease assembleSideload --max-workers=2 --console=plain` aprovado. Build após reforço visual do foco: 357 tarefas, dez executadas e 347 em cache, 44s; modo offline. |
| APK debug | Gerado, 49,4 MiB; certificado de desenvolvimento. Depende de Metro. |
| APK release | Gerado, 26,3 MiB, unsigned: precisa de assinatura privada antes da instalação. Nenhuma chave privada de distribuição foi criada. |
| APK sideload | Gerado, 26,3 MiB, assinatura de desenvolvimento verificada pelo apksigner (v2). Inclui JavaScript/Hermes; dispensa Metro. |
| Alinhamento sideload | `zipalign -c -P 16 4 .../app-sideload.apk` aprovado. |
| ABIs reais dos três APKs | Somente arm64-v8a e armeabi-v7a, confirmado no ZIP e no badging do aapt. |
| Manifesto sideload | com.senju.tv.sideload, versão1.0-sideload, minSdk24, targetSdk36; atividade com.senju.tv.MainActivity; Leanback/touchscreen/faketouch opcionais. |
| Smoke HTTP web | Na primeira rodada, Vite temporário localhost:5197 respondeu200 para `/` e `/src/App.tsx`. Servidor encerrado. Não equivale a ensaio completo da UI no navegador. |
| Docker | `docker compose config --quiet` aprovado; imagem/container não foram executados. |
| Lint web | Ainda falha com 18 erros herdados (any, effects, ts-ignore e variáveis não usadas). Baseline isolado tinha25; parte do código foi extraída e ficou fora do lint web, portanto a diferença não significa que a dívida foi resolvida. |
| `git diff --check` | Aprovado. Sem commits, pushes ou descarte das alterações existentes. |
| Hardware/instalação | Versão anterior instalada com sucesso e atividade iniciada (Status: ok), com tela inicial observada. Nova homepage ainda não instalada; ações na TV suspensas a pedido do usuário. |
| Reprodução real | Pendente: M3U/Xtream de provedor, HLS/TS, codecs/áudio, progresso, cancelamento em dispositivo e liberação de ExoPlayer. |
| Emulador | Não executado; /dev/kvm não está disponível neste ambiente WSL2. |

## Artefatos gerados

| Variante | Arquivo |
| --- | --- |
| Sideload para testar sem Metro | `apps/fire-tv/android/app/build/outputs/apk/sideload/app-sideload.apk` |
| Debug com Metro | `apps/fire-tv/android/app/build/outputs/apk/debug/app-debug.apk` |
| Release sem assinatura | `apps/fire-tv/android/app/build/outputs/apk/release/app-release-unsigned.apk` |

O sideload aparece como **Senju Player (Teste)** e usa o identificador com.senju.tv.sideload,
separado de com.senju.tv. A chave utilizada é a chave pública debug do template, destinada
à validação local; a configuração release continua exigindo a chave privada do responsável.

SHA-256 do sideload desta rodada:
`0d1347218a45af52c73bd858910d2c2fd87ea15a4bea8dfafd2b562a9d99fa58`

Relatório local com tamanho, ABIs e hashes das três variantes: apps/fire-tv/build/apk-report.json.
Os APKs, relatórios gerados e caches de desenvolvimento são ignorados pelo Git.

## Correções encontradas na compilação

- Caminho do hermesc no Gradle corrigido para o node_modules hoisted da raiz do monorepo.
- Filtro explícito de ABIs adicionado a defaultConfig.ndk. A propriedade reactNativeArchitectures
  sozinha ainda empacotava x86 e x86_64 na arquitetura antiga; os APKs finais foram reinspecionados.
- Variante sideload baseada em release, com bundle incluído, assinatura debug e applicationId separado.
- Manifesto ajustado conforme guia da Amazon: launcher Leanback e toque/faketouch opcionais.
- Metro exclui .local-build-tools da varredura de arquivos.
- Dependência Git de MPEGTS.js fixada via HTTPS no **mesmo commit** já presente no lock
  (webworkify-webpack@24d1e719b4a6cac37a518b2bb10fe124527ef4ef), evitando falha de resolução SSH.
- Preparação da fonte nativa isolada em playbackSource.ts; detecção HLS trata query e fragmento.

Os testes novos verificam headers codificados, inferência MPEG-TS, buffer configurado,
cancelamento de fetch, remoção de listeners e mensagens HTTP sem credenciais. Eles executam
no Node com fetch simulado; não validam o ExoPlayer, Android Keystore ou D-pad em execução.

## Ambiente utilizado e limitações

Node22.22.0, pnpm10.11.0, Temurin JDK17.0.21, Gradle8.14.3, SDK/API36 revisão2,
Build Tools35/36, platform-tools37.0.1 e NDK27.1.12297006. SDK e caches ficam em
.local-build-tools (ignorado por Git/Docker/Metro). Node, pnpm e JDK desta sessão ficam
em .local-build-tools/runtimes após a restauração de 28/10. Para retomar neste ambiente,
existe o perfil local não versionado `.local-build-tools/env.sh`. Na rodada inicial, essas
ferramentas estavam em /tmp e foram removidas pelo ambiente entre sessões.

O primeiro build esbarrou em Java/SDK ausentes. Downloads oficiais foram completados em partes,
com arquivos SDK/NDK conferidos pelo checksum do manifesto oficial, e a instalação foi concluída.
Os builds emitiram avisos de APIs depreciadas de RN/Keychain/Video e de recursos Gradle
incompatíveis com Gradle9; foram executados com a versão8.14.3 fixada no wrapper.
O aviso EPERM do setup_env.sh apareceu no Metro em sandbox; bundle e builds terminaram com exit0.

Baseline web: `npm ci` e `npm run build` aprovados antes da migração, JS ~1.242 MB.
O npm reportou16 vulnerabilidades no grafo original (1 baixa, 3 moderadas, 12 altas).
Não foi aplicado `audit fix` ou atualização major geral. As dependências diretas web foram
fixadas nas versões do lock npm original; pnpm resolveu as transitivas. O lock anterior
permanece no histórico Git.

## Próxima validação

1. Aguardar a liberação explícita do usuário para voltar a executar ações na TV. Modelo/API/ABI já foram consultados na primeira conexão autorizada.
2. Instalar e iniciar o APK sideload, com autorização ADB confirmada na própria TV.
3. Percorrer catálogo longo por D-pad, teclado, seleção, retorno e restauração do foco.
4. Validar M3U/Xtream reais, HLS/TS, áudio/codecs, reconexão manual e liberação do player.
5. Medir memória/CPU/tempo de carga; corrigir gargalos observados no Stick disponível.

Comandos de ambiente, assinatura, ADB e instalação: [FIRE-TV.md](FIRE-TV.md).

## Tentativa em dispositivo — 28/10/2026

O usuário forneceu o endereço do Fire Stick. `adb connect` retornou **Connection refused**
na porta5555 e `adb devices -l` ficou vazio. Não houve conexão, consulta de modelo/API/ABI,
instalação ou inicialização. Próximo passo: habilitar a depuração ADB nas opções de
desenvolvedor do Fire TV, conferir o endereço e repetir a conexão. A autorização na tela
só poderá ser confirmada depois de o serviço ADB aceitar a conexão.

## Redesenho da entrada — 28/10/2026

- PlaylistSetup.tsx separa a apresentação do formulário nativo, sem alterar o transporte IPTV.
- Layout em duas colunas, identidade Senju, abas M3U/Xtream, campos rotulados e credenciais lado a lado.
- Botões usam o estado focused do Pressable: fundo verde vivo, texto escuro e borda branca.
  O primeiro botão recebe solicitação explícita de foco ao montar; o comportamento real ainda
  será validado no controle quando o usuário liberar a TV.
- Campos têm bordas neutras e destaque branco ao foco; resize para o teclado foi configurado.
- TypeScript, dez testes, build web e APKs debug/release/sideload aprovados localmente.
- Assinatura v2, alinhamento e ABIs ARM do novo sideload verificados. O bytecode inclui a nova entrada.
- Não houve instalação nem novos comandos na TV após o pedido de suspensão.

A primeira versão foi instalada antes desse pedido: `adb install` retornou Success e
`am start -W` retornou Status: ok. A tela inicial abriu sem Metro. Não foram testados
provedores reais, reprodução, persistência de credenciais preenchidas ou navegação completa.

## Atualização autorizada no aparelho — 28/10/2026

Após a liberação explícita do usuário, o APK da homepage redesenhada (SHA-256
4956c24b23d0bc10ef0a3050b6503fe3ca291b47253b956313fa53fe297fca94)
foi atualizado por `adb install -r` (Success), sem desinstalação ou limpeza de dados.
O app de teste foi reiniciado e `am start -W` retornou Status: ok.
O usuário fará a validação visual e de navegação; foco e reprodução ainda não foram
marcados como aprovados por esta atualização. Nenhuma lista ou credencial foi manipulada.

## Correção do seletor do controle — 28/10/2026

Sintoma reproduzido no Fire Stick: a hierarquia Android marcava Xtream Codes como focado,
mas o botão mantinha o fundo normal RGB(21,30,25). Apenas aumentar o contraste do estilo
não resolvia a falta de sincronização do estado visual com o foco nativo nesta stack.

Foi adicionado useTVFocus.ts, que acompanha os eventos focus/blur de useTVEventHandler
e associa o tag do evento ao controle por findNodeHandle. Button e Input usam esse estado
para o destaque; onFocus/onBlur continuam como fallback. Transições iguais são ignoradas
e somente o controle anterior/atual atualiza o estado. Callbacks de foco do catálogo são
encaminhados pelo mesmo caminho, sem alterar dependências ou código de terceiros.

O APK foi recompilado, teve assinatura/alinhamento verificados e foi atualizado com
install -r. Testes no aparelho usaram `input dpad keyevent` e compararam a hierarquia
nativa com as cores capturadas da tela, sem imprimir valores dos campos:

- Foco inicial: lista salva destacada em RGB(56,232,131), correspondente a #38e883.
- Direita/baixo/esquerda: o destaque acompanhou os botões, incluindo M3U e Xtream Codes.
- Os botões anteriores voltaram ao fundo normal; não permaneceram dois focos verdes.
- Campo Nome da lista: foco real e fundo #38e883, com borda branca confirmada.
- D-pad para cima a partir do campo: voltou ao M3U, que ficou verde.

Nenhuma lista foi selecionada, removida ou modificada durante esses testes; nenhum
valor foi digitado. A lista salva do usuário permaneceu disponível. O app ficou aberto.
TypeScript e dez testes locais passaram, além dos três builds Android. Reprodução,
teclado completo e navegação por catálogos extensos permanecem fora desta validação.

## Borda grossa e seta do seletor — 28/10/2026

A pedido do usuário, o foco ganhou borda branca de 5dp e uma seta ▶, além do fundo verde.
Os botões curtos (favorito/remover) usam a borda grossa sem apertar o ícone; a seta aparece
nos botões maiores e nos campos. A margem da seta é reservada para o texto não saltar
ao trocar o foco. Inputs têm um wrapper nativo estável e mantêm o ref do TextInput.
A altura da linha do catálogo e getItemLayout foram ajustados juntos para88dp.

TypeScript, dez testes locais e os três APKs aprovados. Sideload com assinatura/alinhamento
verificados e instalado com install -r. Na captura do AFTSSS, o controle focado apresentou
10 pixels brancos na borda superior e a seta escura visível, com fundo #38e883.
Captura local: apps/fire-tv/build/focus-border-verified.png (ignorada pelo Git).

A tentativa seguinte de percorrer todo o formulário foi interrompida pelo repouso da TV
e não foi contada como aprovação. Nesta rodada, borda/seta foram conferidas no botão
inicial; a navegação entre campos já havia sido testada na correção anterior. Nenhuma
lista foi confirmada, removida ou alterada. Não foram alteradas configurações da TV.

## Formulário limitado à altura da TV — 28/10/2026

PlaylistSetup agora limita a altura pela janela disponível e mantém a ação de conexão
fora da área rolável dos campos. As listas salvas ficam na coluna esquerda com rolagem
limitada. Cabeçalho e espaçamentos foram compactados, preservando borda branca/seta de foco.
Com teclado ou erros extensos, o corpo pode rolar; esses estados não foram validados em hardware nesta rodada.

TypeScript aprovado; assembleDebug, assembleRelease e assembleSideload concluídos
(BUILD SUCCESSFUL, 44s). Assinatura e alinhamento do APK sideload aprovados.
Atualizado no AFTSSS via install -r, preservando os dados. Capturas e árvore nativa
confirmaram os campos e a ação totalmente visíveis em 1920×1080: M3U com ação
em y=683..779; Xtream com usuário/senha em y=639..735 e ação em y=759..855.
Apenas a aba Xtream foi selecionada; nenhuma lista foi carregada, removida ou alterada.
Captura local ignorada pelo Git: apps/fire-tv/build/form-fit-verified.png.

## Catálogo visual e drawers — 30/10/2026

A tela de cadastro foi preservada. CatalogScreen separa o catálogo da orquestração
IPTV de App, com grade responsiva virtualizada, logos/capas e títulos, campos e
botões menores, painel esquerdo de categorias/favoritos/recentes e perfil à direita.
CatalogCard mantém destaque branco/verde e trata imagens ausentes ou com falha.
Os episódios usam a imagem informada pelo provedor ou a capa da série, quando disponível.

O primeiro teste encontrou foco nativo sem destaque dentro de Modal no RN TV legado.
Os drawers passaram a ser overlays na mesma raiz nativa, com o catálogo não focável
quando estão abertos e foco preso ao painel. A altura das listas é limitada pela área
medida, evitando recorte da linha focada. A versão final usa a rolagem nativa ao focar, sem comandos redundantes por card.
A busca não remonta a grade a cada tecla nem solicita foco dos cards durante a edição.

No AFTSSS real: entrada automática carregou os 2.731 canais da única lista salva;
D-pad esquerda abriu categorias; escolher uma categoria fechou o painel e exibiu
124 itens; Voltar abriu perfil; esquerda fechou perfil e restaurou foco no ícone;
OK no ícone reabriu perfil; D-pad abriu Configurações e destacou Entrada automática.
Não foram removidas listas, alterados favoritos ou preferências, nem iniciada reprodução.
As categorias visitadas são estado transitório da sessão.

Validação local final: TypeScript aprovado, dez testes aprovados, web compilado,
assembleDebug/assembleRelease/assembleSideload aprovados (45s na última execução),
assinatura e alinhamento do sideload aprovados. APK instalado por install -r.
A tentativa de verificar filmes na primeira rodada encontrou a TV em repouso e
não foi contada como aprovação. Reprodução e retorno do player não foram repetidos
nesta alteração visual. Teclado e busca prolongada ainda exigem testes de usabilidade.

Amostra inicial de dumpsys, após inicialização e visita aos drawers: PSS 135031 KiB
(~131,9 MiB), 1125 frames registrados, 160 janky (14,22%), p50 7ms e p95 27ms.
Os números incluem inicialização/imagens/painéis e não constituem benchmark isolado
nem aprovação definitiva de desempenho. É necessário separar navegação aquecida de
entrada fria e testar sessões longas no hardware antes de afirmar fluidez sustentada.

O cache atual do catálogo é em memória durante a sessão, por tipo de conteúdo.
Cache persistente com atualização em segundo plano foi sugerido ao usuário, ainda
não implementado. Uma futura implementação deve separar por lista/tipo, limitar
espaço, preservar o catálogo em erro de rede e proteger URLs que carregam credenciais
ou tokens; não gravar diretamente o catálogo completo em JSON sem essa avaliação.

### Rodada curta de desempenho e ajuste final — 30/10/2026

Com o catálogo carregado e contadores de gfxinfo zerados, uma sequência de 14 teclas
D-pad (baixo×2, direita×5, esquerda×5, cima×2, intervalo de 150ms mais execução do
comando) registrou 148 frames, 49 janky (33,11%), p50 12ms, p95 34ms e p99 48ms.
Foram removidos os comandos JS de rolagem a cada foco; Android já mantém o item
visível com o viewport limitado. useTVFocus passou a ter uma única assinatura nativa
e um mapa por tag: apenas o controle anterior e o novo recebem a atualização de foco.
Não se percorrem todos os cards a cada evento.

Repetindo a sequência no mesmo aparelho: 82 frames, 21 janky (25,61%), p50 11ms,
p95 23ms e p99 26ms. São amostras curtas, com quantidades diferentes de frames;
a redução observada não comprova causalidade isolada nem fluidez sustentada.
Ainda há frames acima do orçamento e é necessária investigação com tracing e
mais cenários, especialmente listas grandes, imagens novas e reprodução.
Não se declarou o desempenho encerrado nem se garantiu ausência de travamentos.

Os três APKs finais compilaram em 32s; TypeScript e dez testes aprovados; assinatura e
alinhamento aprovados; versão final instalada mantendo dados. A entrada automática,
a grade e o drawer com borda branca/verde foram conferidos novamente no hardware.
Capturas locais ignoradas pelo Git em apps/fire-tv/build/catalog-verified.png e
apps/fire-tv/build/categories-verified.png; relatório de APKs atualizado.

## Player para controle remoto — 30/10/2026

Player.tsx mantém react-native-video 6.19.0/Media3 e o mesmo buffer/fonte nativa,
substituindo a faixa antiga sempre visível por HUD superior e controles inferiores
menores. PlayerControls.tsx isola as atualizações do relógio/progresso do componente
que contém Video. Não há nova dependência, animação ou implementação do cache proposto.

Canais mostram logo/nome/grupo e AO VIVO; VOD/episódios mostram tempo/duração e barra
informativa, com −30/+30 habilitados somente quando duração e seek estão disponíveis.
Controles ocultam após 5s de reprodução sem interação; um receptor nativo focável
permite OK para revelá-los sem pausar. D-pad e Play/Pause também são tratados.
Pausa mantém os controles; ocultação manual continua disponível. Back retorna ao
catálogo. Spinner é pequeno e central; erro oferece tentar novamente/voltar e desmonta
o Video. Timers/listeners são removidos ao sair; posição é salva a cada 5s e na saída.

Validação real no AFTSSS:
- Canal iniciou. Foi observada ocultação automática (somente Mostrar controles da
  reprodução ficou focável), OK revelou sem pausar e outro OK pausou.
- Após espera, controles permaneceram em pausa com Reproduzir focado e borda branca/verde.
- Back voltou ao catálogo, restaurando o card na primeira coluna.
- Catálogo de filmes carregou 43.928 itens. Um filme iniciou com duração 1:20:44.
- Tecla MEDIA_PLAY_PAUSE pausou; tempo 00:22 e botões de seek habilitados.
- +30 seguido de retomada mostrou 00:52 e Pausar disponível; Back retornou ao catálogo.
  Um dump intermediário imediatamente após seek falhou com null root; não foi usado
  como evidência. A leitura seguinte válida confirmou o tempo de 00:52.

Não foram apagadas listas nem alteradas credenciais, favoritos ou preferências.
Os itens reproduzidos entraram no histórico e o filme recebeu progresso, pelo fluxo
normal do aplicativo. Não foram testados nesta rodada: botão −30, retomada após reiniciar,
episódios, todos os codecs, cenário de erro/retry, longas sessões ou perda de rede.
A barra é informativa; seek usa os botões ±30s. Não há EPG, seleção de trilhas ou DVR.

TypeScript e os dez testes locais aprovados. Debug, release e sideload compilados;
assinatura/alinhamento e instalação do APK são registrados no relatório local.
As mudanças desta rodada se limitam à TV; o aplicativo web não foi alterado.

APK final desta interface: três variantes compiladas em 32s, assinatura/alinhamento
verificados, sideload atualizado via install -r e inicializado com Status: ok.
Os XMLs temporários de diagnóstico desta rodada foram removidos do dispositivo.

## Remoção das instruções de rodapé — 30/10/2026

Removidas as instruções de controle do rodapé de PlayerControls e CatalogScreen,
bem como a mensagem de ocultação automática no player. O status de pausa permanece.
A faixa do player diminui de altura e a grade ocupa a área liberada no catálogo.
TypeScript aprovado. A mudança não altera os comandos do controle remoto.

Os três APKs compilaram em 33s; assinatura e alinhamento do sideload aprovados.

## Menu na navbar e tipos no drawer — 30/10/2026

O botão ☰ passou para a navbar, antes da marca Senju Player. Ao vivo, Filmes e Séries
foram movidos para o início do drawer esquerdo, acima de filtros e categorias. A faixa
lateral da grade foi removida e a largura dos cards foi recalculada usando a área total.
O drawer abre pelo botão e também ao mover da primeira coluna para o menu com D-pad.
Ao fechar, restaura foco no card ou no botão, conforme a origem da abertura.

TypeScript aprovado; debug/release/sideload compilados em 31s; assinatura e alinhamento
aprovados; APK atualizado no AFTSSS preservando dados. Na TV foram confirmados: menu
na navbar antes do nome, ausência das três abas antigas na barra, abertura por esquerda,
três tipos dentro do drawer com destaque de foco e fechamento por direita restaurando
o card. O botão na navbar e a seleção de Filmes dentro do drawer também foram testados.
Nenhum conteúdo foi reproduzido nesta rodada. Captura local ignorada pelo Git:
apps/fire-tv/build/navbar-drawer-verified.png.

## Navbar única, accordions e foco sutil — 30/10/2026

Navbar agora reúne menu, marca, separador, seleção/quantidade, busca e perfil em uma
linha. O segundo cabeçalho da grade foi removido. A largura da busca acompanha a janela
com limites e o título usa ellipsis. O drawer ganhou padding esquerdo de 32dp, além do
recuo das linhas; linhas quiet não têm borda permanente. A tela de cadastro permanece
com o estilo aprovado (quiet é opt-in em Button).

CatalogMenu virtualiza uma lista plana de linhas de accordions: tipos gerais no topo,
separador, plataformas expansíveis, Outras categorias e Favoritos/Recentes. Fechar menu
foi removido; Voltar/direita continuam disponíveis. Sem categorias identificáveis, não
se inventam plataformas/tipos. Categorias de gêneros ou marcas sem alias ficam em
Outras categorias do tipo atual. Marcas são identificadas somente pelos nomes das
categorias, sem inferir por título, capa ou URL. Não há integração oficial de plataformas.

App reutiliza fetchCategories de Xtream para descobrir os outros tipos em segundo
plano, sem baixar os catálogos completos. Usa o AbortController existente para cancelar
consultas obsoletas. M3U usa os grupos do parser existente. O filtro de plataforma é
preservado durante carga assíncrona e usa Map por grupo, sem testar todos os aliases
para cada item. A escolha de um tipo geral limpa plataforma, grupo, busca e filtro.
O código existente de fetchCategories retorna {} em falha; nesse caso a descoberta
pode ficar incompleta e usa os grupos disponíveis até Atualizar catálogo.

Cards sem foco: fundo transparente, borda transparente e imagem/nome. Apenas o target
recebe borda de 2dp e escala estática 1,025; não há animação ou medição de layout a cada
frame. O espaço para foco é reservado na grade. Foi mantida a navegação/restauração de
foco e a assinatura nativa única do helper de foco.

Verificações: TypeScript e 13 testes aprovados (incluindo falso positivo de plataforma,
tipos disponíveis, grupos duplicados e fallback M3U). Debug/release/sideload compilaram
em 38s; assinatura e alinhamento aprovados; APK atualizado no AFTSSS via install -r.
Na TV: título/quantidade e busca alinhados na navbar; cards sem borda quando desfocados;
menu com recuo maior; Fechar menu ausente; Globoplay expandiu/recolheu pelo D-pad;
selecionar seu filho Séries carregou um catálogo ainda não aberto mantendo o filtro,
com 593 itens e foco no primeiro card. Nenhum conteúdo foi reproduzido nesta rodada.
Capturas locais em apps/fire-tv/build/navbar-compact-verified.png,
platform-accordion-verified.png e platform-filter-verified.png, ignoradas pelo Git.

Pendentes: todos os aliases com todas as fontes, falha/retry dos endpoints de categorias,
dimensões de TV diferentes e sessões longas de navegação. Não foi feita medição de FPS
nesta rodada nem declarado o desempenho como concluído. Cache persistente segue pendente.

A opção geral Séries foi conferida após o filtro: retornou 10.815 itens, sem o prefixo Globoplay na navbar. XMLs temporários removidos do aparelho.

## Busca por seção, acesso à navbar e filmes por plataforma — 30/10/2026

Removida a abertura automática de menu ao focar ☰. O botão exige OK; mover para ele
pela esquerda apenas o foca. Os cards da primeira linha usam nextFocusUp para a busca
da navbar (ou Voltar às séries nos episódios), sem passar pelo menu. A busca identifica
a seção atual no placeholder/label; Enter busca transfere o foco ao primeiro resultado.

filterCatalog isola a busca por tipo, plataforma, grupo e favoritos/recentes. Consulta
vazia evita montar strings de pesquisa para cada item. Trocar de seção limpa a busca.

Corrigida a substituição de metadados de categorias pelos grupos encontrados nos itens:
mergeCategoryGroups mantém a união até atualizar a fonte. XtreamService preserva a
categoria principal existente (comportamento web) e acrescenta groupNames opcionais
quando category_ids/category_names informam associações adicionais. O caminho comum
sem associações extras evita coleções adicionais por item. A navegação e filtro nativos
consideram essas associações. Se uma fonte adicionar filmes Netflix/Globoplay/etc.,
o filho Filmes aparece automaticamente após recarregar as categorias; não há marcas
com tipos fixos nem necessidade de cadastrar uma rota nova.

Na leitura atual da lista, Netflix apresentou somente Séries, inclusive após a correção
da união de metadados. O usuário confirmou que não viu Filmes Netflix em outro app e
apenas supunha que existiriam; pediu manter a base preparada para quando a fonte informar.
Não foram inventados filmes nem atribuídos gêneros genéricos à Netflix. Categorias de
filmes foram inspecionadas parcialmente na UI; um dump retornou null root e foi descartado.

TypeScript e 16 testes aprovados (6 compartilhados + 10 nativos), incluindo múltiplas
categorias Xtream, preservação de metadados e busca sem vazamento entre seções.
Web compilou em 7,83s; debug/release/sideload compilaram em 42s. Assinatura/alinhamento
aprovados, sideload instalado via install -r e inicializado com Status: ok.

O aparelho entrou em reprodução durante a verificação seguinte; os comandos de controle
foram interrompidos para preservar o uso. A subida para a busca e a edição contextual
não foram concluídas em hardware nesta rodada; não foram marcadas como aprovadas.
Esses fluxos e a classificação de filmes por uma fonte real que a forneça continuam
pendentes de validação no aparelho. Sem commits/pushes e sem cache persistente novo.

## Conferência final autorizada no aparelho — 30/10/2026

Após o usuário liberar o Fire Stick, a versão já instalada foi reaberta preservando
os cadastros. Nenhuma alteração adicional de código ou rebuild foi necessário.
- Esquerda no primeiro card apenas focou ☰; BIBLIOTECA continuou ausente.
- OK abriu o menu com Ao vivo focado. A opção Filmes carregou 43.928 itens.
- Cima no primeiro card de Filmes focou o EditText Buscar em Filmes; menu continuou fechado.
- Digitação de Rota manteve o foco no campo e retornou 245 filmes.
- KEYCODE_ENTER genérico foi consumido pelo teclado Fire TV como seleção da tecla a,
  produzindo Rotaa/zero resultados. Esse envio não confirmou a busca e não foi contado
  como aprovação. A letra foi excluída, e a tecla Avançar do teclado real foi acionada:
  a busca Rota permaneceu com 245 resultados e o primeiro card recebeu o foco, sem abrir vídeo.
- Trocar para Netflix → Séries limpou o texto de Filmes e exibiu 1.962 itens.
- Cima novamente focou Buscar em Netflix · Séries, mantendo o menu fechado.
- Stranger retornou 3 itens nessa seção e manteve o foco no campo durante a digitação.
- Um dump durante carga de Séries retornou null root; foi descartado e uma leitura
  posterior válida confirmou a seção e o campo vazio.

Os testes anteriores que estavam pendentes de conferência de navegação/busca passaram
nesses caminhos do aparelho real. Isso não cobre todos os modelos, teclados, categorias
ou sessões prolongadas. Nenhum vídeo foi iniciado; credenciais/favoritos foram preservados.

## Avanço automático: preparação local sem interromper a TV — 30/10/2026

A pedido do usuário, esta rodada prioriza o avanço automático. A filha estava assistindo;
nenhum comando ADB, instalação, reinício ou teste em hardware foi executado nesta rodada.
O usuário pediu aviso e coordenação antes de instalar; aguardar seu sinal.

completePlayback calcula a transição usando a fila completa de episódios já ordenada
pelo XtreamService (temporada e número), independente da listagem/futuras tabs. Ao fim,
limpa o progresso do episódio concluído, inicia o próximo do zero, atualiza histórico e
índice de foco. No último, retorna à lista. Filmes e canais não entram na fila da série.
URL vazia ou ID repetido no próximo interrompem a sequência com erro, sem pular vários
conteúdos ou reabrir a mesma instância. Erro de reprodução não dispara avanço.

Player recebe callback de fim separado de Voltar/fechar, ignora onEnd duplicado e
progresso/seek tardios após o fim. App invalida o item corrente ao fechar/Voltar e rejeita
callbacks de outro ID. Cada item usa key própria para desmontar o player anterior e
reiniciar posição, pausa, duração, erro e timers antes de iniciar o próximo. Não há
pré-carregamento simultâneo de players nem requisição nova para buscar a fila.

TypeScript e 20 testes locais aprovados (6 compartilhados + 14 nativos). Os testes
adicionais cobrem próximo episódio/temporada, último episódio, histórico/progresso sem
mutação, filme/canal fora da fila, URL inválida e identificador duplicado. Os eventos
reais do decoder e a liberação entre episódios continuam não validados em hardware.
Uma primeira geração de APKs debug/release/sideload concluiu em 1m20s; a versão final
é verificada separadamente após o último ajuste. Os demais pedidos estão em TV-TODO.md.

Geração final: debug/release/sideload aprovados em 39s. Assinatura e alinhamento do
sideload aprovados; relatório de APKs atualizado com hashes/ABIs/bundle. O APK desta
rodada está somente no computador, aguardando liberação do usuário; não instalado.

## Instalação autorizada do avanço automático — 30/10/2026

Após o usuário enviar Pode instalar, o APK sideload foi atualizado no AFTSSS com
install -r (Success), preservando dados. A atividade foi aberta com Status: ok.
Não foram enviados comandos para escolher série, reproduzir, pular ou encerrar episódio,
para que o usuário retomasse o conteúdo da filha. O avanço ao fim natural continua
pendente de validação real; instalação bem-sucedida não foi contada como teste de reprodução.

## Busca sem resultados e controles flutuantes — 30/10/2026

Removido o botão Abrir categorias do estado vazio, cuja largura podia colapsar pelo
texto flexível sem largura disponível. O estado agora mostra apenas a mensagem.
Input ganhou nextFocusLeft para ☰ e o handler de D-pad direciona o foco ao menu em
busca vazia, com teclado fechado. Keyboard listeners são removidos ao desmontar e
não atualizam estado/render a cada tecla. Confirmar uma busca vazia tem fallback para
☰ em vez de tentar focar um card desmontado; com resultados mantém o primeiro card.

PlayerControlButton usa os mesmos eventos de foco nativos e labels de acessibilidade,
com ícones nativos (play/pause em Views) em vez de textos grandes. Play/pause fica no
centro da faixa e alterna o ícone mantendo a mesma instância/foco. ±30s ficam nas
laterais e respeitam seek disponível. Fundo da faixa passou a transparente, botões
circulares translúcidos e foco branco com fundo escuro para contraste em cenas claras.
Não foram acrescentadas bibliotecas, animações ou alterações no avanço automático.
A barra ainda é informativa; tabs de temporadas e episódio anterior/próximo pendentes.

TypeScript e os 20 testes locais existentes aprovados. Sem testes espelho/snapshots
para esta mudança visual. Navegação de busca vazia, comportamento do teclado Fire TV,
foco dos novos ícones e contraste ainda não validados em hardware nesta rodada.
Nenhum comando ADB foi enviado. A pedido explícito do usuário, perguntar e aguardar
confirmação antes de qualquer atualização de APK no Fire Stick. APK somente local.

Geração final local: três APKs aprovados em 32s; assinatura/alinhamento do sideload aprovados. Não instalado, aguardando confirmação do usuário.

## Botões anterior/próximo episódio — 30/10/2026

episodeNavigation identifica os vizinhos válidos na fila completa. changeEpisode
calcula a troca manual, preserva a posição do atual, zera o destino e atualiza histórico
e foco sem mutar os dados. A ação é validada contra o ID que está efetivamente em
reprodução. Player invalida os callbacks antigos antes de trocar; App usa key do item
para reiniciar a instância e impedir que um onEnd antigo cause avanço duplo.

Ícones nativos de skip/barra foram adicionados ao transporte translúcido; não aparecem
em conteúdo sem fila. Primeiro/último e destinos inválidos/duplicados ficam desabilitados.
Nada foi instalado e nenhum comando foi enviado ao Fire Stick nesta rodada.

TypeScript e 22 testes aprovados (6 compartilhados, 16 nativos). Casos novos cobrem
movimento manual nos dois sentidos entre temporadas, posição não concluída preservada,
reinício do destino, histórico/favoritos sem mutação, limites, URL inválida, ID repetido
e filmes/canais sem fila. Layout, foco e troca do decoder ainda não validados em hardware.
Aguardar confirmação do usuário antes de atualizar o APK, conforme regra explícita.

APKs debug/release/sideload aprovados em 34s; assinatura e alinhamento aprovados. Arquivos somente locais, sem instalação na TV.

## Instalação autorizada dos controles e busca vazia — 30/10/2026

Após a confirmação pode do usuário, APK sideload atualizado com install -r (Success)
e atividade aberta (Status: ok). Inclui busca sem resultados sem botão central,
controles translúcidos com ícones e anterior/próximo episódio. Dados preservados.
Não foram iniciados vídeos nem enviados comandos para navegar no conteúdo; usuário
pode retomar a série. Instalação/inicialização não substituem validação funcional
dos novos controles e da navegação no estado vazio.

## TODO restante e identidade do player — 30/10/2026

Implementadas abas horizontais de temporadas, preservando a fila completa e a
restauração pelo episódio. Barra focável com prévia de 10s por esquerda/direita,
OK confirma uma chamada seek; sair descarta. Controles não somem durante seleção.
Player mantém verde translúcido; botões de salto temporal sem números visuais.
Nenhuma dependência adicionada. Catálogo geral mantém array sem cópia; episódios
filtrados por temporada continuam em FlatList virtualizada.

Validação local: pnpm tv:typecheck aprovado; pnpm test aprovado (22 testes,
6 compartilhados e 16 nativos); pnpm build aprovado com aviso preexistente de
chunk web >500kB. Gradle assembleDebug/assembleRelease/assembleSideload offline
aprovado em 1m8s (357 tarefas). apksigner verify e zipalign aprovados.
SHA-256 deste sideload: 6aeb34267fef3f1221046e0993a4da2979cbe6d3c916b5ae8b3cea3734e7d6d6.
Relatório apps/fire-tv/build/apk-report.json atualizado.

Instalação NÃO realizada nesta rodada: revisão automática recusou install -r,
interpretando a regra do usuário como necessidade de confirmação específica após
os novos ajustes. Nova confirmação solicitada. Nenhuma navegação foi executada
no dispositivo. Abas, foco da barra e seeks ainda NÃO validados em hardware.
Fim natural/avanço automático, troca manual e recuperação de busca vazia também
continuam pendentes de validação funcional real. Cache permanece adiado.

## Instalação da candidata com temporadas e barra — 30/10/2026

Após a nova confirmação explícita do usuário, install -r retornou Success e
am start -W retornou Status: ok para com.senju.tv.sideload/com.senju.tv.MainActivity.
Atualização sem limpar dados. Aplicativo aberto; nenhum conteúdo iniciado nesta
rodada. Os testes funcionais dos controles, abas e fim natural continuam pendentes;
instalação e início da atividade não comprovam esses comportamentos.

## Ordenação de novidades — 30/10/2026

Xtream agora preserva addedAt/updatedAt opcionais, normalizando added e last_modified.
Ordenação TV por inclusão para filmes e atualização para séries; escopo de busca,
plataforma e favoritos mantido. Histórico separado. Sem datas válidas, mantém ordem
original e desabilita a opção, sem adivinhar por ID, nome ou data de lançamento.
Ordem memorizada antes da busca: sem chamadas adicionais ao provedor ou sort por tecla.

pnpm tv:typecheck aprovado. pnpm test: 24 aprovados (7 compartilhados, 17 nativos).
Casos novos: segundos/milissegundos, campos ausentes/zero/negativos/não numéricos,
datas de lançamento não usadas, atualização versus inclusão, empates/sem datas,
array original sem mutação, escopo Netflix/favoritos e histórico independente.
pnpm build aprovado com aviso preexistente de chunk web >500kB.

Nenhum comando ADB enviado nesta rodada. Não há resposta bruta da conta disponível
localmente para confirmar esses campos; fixtures não comprovam suporte do provedor.
Instalação e validação funcional no Fire Stick aguardam confirmação específica.

Build Android aprovado: debug/release/sideload em 59s, 357 tarefas. Assinatura e
alinhamento do sideload aprovados. SHA-256: d20b616b64bdb60ed896aa376344ce2aa1fac2671287c3c42fb330cb067b3621.
Relatório local de variantes atualizado. APK somente local, sem instalação.

## Instalação autorizada de novidades — 30/10/2026

Usuário confirmou especificamente a instalação. adb install -r retornou Success;
am start -W da atividade com.senju.tv.sideload/com.senju.tv.MainActivity retornou
Status: ok. Atualização sem limpar dados. Nenhum conteúdo iniciado nem navegação
funcional executada nesta rodada. Metadados da fonte e ordenação real ainda não
confirmados; instalação/inicialização não equivalem a essa validação.

## Cache persistente do catálogo — 30/10/2026

Módulo Android SenjuCatalogCache registrado no pacote nativo existente (arquitetura
legada). Arquivos privados em cacheDir, páginas GZIP/AES-256-GCM com chave no Android
Keystore; metadados também cifrados. Snapshot publicado por AtomicFile, isolamento
por lista/credenciais/tipo, limites de tamanho e limpeza de menos usados. Sem
novas dependências, sem alteração de comportamento do web.

Abertura com cache recente evita consulta do catálogo/autenticação. Cache antigo é
exibido antes da tentativa de atualização; falha conserva os dados com aviso.
Validade de seis horas verificada na abertura/seleção de tipo (também em memória),
sem polling durante reprodução. Perfil mostra data salva e atualização manual;
configurações têm limpeza de cache. Remoção da lista tenta limpar seus arquivos.
Cache não contém vídeos nem detalhes/episódios de séries.

pnpm tv:typecheck aprovado. pnpm test: 30 testes aprovados, sendo 7 compartilhados,
17 testes nativos anteriores e 6 cenários do cache. Fixture de 45.001 itens (>6 MiB),
91 páginas; inclusão de catálogo vazio, isolamento, M3U completo, validade, escrita
parcial/cancelada, leitura cancelada, esquema inválido, corrupção e páginas ausentes,
limpeza por lista/global. Os testes usam disco simulado e não validam criptografia,
AtomicFile, LRU ou o fluxo de interface no Android.

pnpm build aprovado; mantém aviso conhecido de chunk web >500kB.
Build Android inicial do módulo aprovado em 2m38s, 357 tarefas. Builds posteriores
incluem ajustes de limpeza e UI; resultado final e hash registrados abaixo.
Nenhum comando ADB ou instalação executado nesta etapa. Desempenho no Fire Stick,
Keystore, abertura sem rede, retomada e atualização real permanecem NÃO VALIDADOS.
Documentação e roteiro: CACHE-TV.md. Instalação requer nova confirmação do usuário.

Build final: assembleDebug/assembleRelease/assembleSideload offline aprovado em 46s,
357 tarefas. Assinatura do sideload e zipalign 16KiB aprovados. SHA-256:
2f3c8ff5486bbc8fe5e3d4be722d5eb37c705a627700e9ca5d788b807313a4d5. APKs/relatório locais atualizados; não instalados.

## Instalação autorizada da versão com cache — 30/10/2026

Usuário confirmou especificamente a instalação. adb install -r retornou Success;
am start -W da atividade com.senju.tv.sideload/com.senju.tv.MainActivity retornou
Status: ok (TotalTime 765ms; este valor mede início da atividade, não catálogo).
Atualização sem limpar dados. Nenhum vídeo iniciado nem cache apagado nesta rodada.
Instalação/inicialização confirmadas; gravação/leitura real do cache, Keystore,
abertura sem rede e ganho de desempenho ainda não validados funcionalmente.

## Reformulação visual integral — 30/10/2026

Usuário autorizou todas as telas, incluindo login, e escolheu construir direto no
app. Paleta alinhada ao Senju Web: fundos quase pretos, verde de ação e foco claro.
Tokens e ícones geométricos nativos compartilhados; sem novas dependências, blur,
fontes remotas ou animações contínuas. Login com formulário segmentado e rolável,
campos mais limpos e listas salvas; removida legenda fixa de controle da entrada.

Catálogo preserva navbar e virtualização. Nome contextual em 38dp acima da grade,
com dica de favorito só para o alvo; este texto atualiza estado no próprio componente,
sem setState da grade a cada movimento D-pad. Favoritos/Histórico precedem plataformas;
ordenação agrupada ao final. Estado vazio tem ações nomeadas e largura explícita,
com nextFocusLeft para o menu. Feedback de atualização no contexto existente e
feedback local de sucesso/erro ao limpar cache. Perfil/configurações roláveis.

Player com proteção verde escura localizada, controles flutuantes e rótulo apenas
do controle focado. Saltos sem números visuais nos ícones, conforme preferência.
Barra com marcador focal e ações assistivas increment/decrement/activate. Preservados
seek por confirmação, episódios, progresso e reprodução nativa.

Typecheck e 30 testes aprovados; build web aprovado com aviso preexistente de chunk
>500kB. Build Android inicial aprovado em 58s, 357 tarefas. Revisão independente
estática encontrou contraste insuficiente em placeholders legados quando focados;
overrides removidos. Revisor confirmou correção (6,90:1 no foco) e manteve disposição
recapture para inspeção visual futura. Isso não é aprovação visual integral.

Nenhuma instalação/comando ADB nesta rodada. Sem capturas nativas novas: emulador
indisponível e TV exige confirmação antes de atualizar APK. Login/teclado, grade,
drawers, foco, player e legibilidade real devem ser capturados e conferidos após
instalação autorizada, sem usar HTML ou imagens antigas como prova do redesign.
Documentação do produto e sistema em PRODUCT.md, DESIGN.md e .impeccable/.

Build final do redesign aprovado em39s: debug/release/sideload, 357 tarefas.
Assinatura e alinhamento sideload aprovados. SHA-256: eb4ed09f88cae81b78644e5d4ae42907052107b52a896d07543126119390e4a9.
Artefatos somente locais; instalação aguarda autorização específica.

## Instalação e inspeção visual do redesign — 30/10/2026

Instalação especificamente autorizada: adb install -r Success, am start Status: ok.
Dados preservados. Capturas reais 1920x1080, app lógico960x540, em .impeccable/review
(ignoradas pelo Git). M3U/Xtream sem preencher campos, menu, perfil, 43.934 filmes,
player e foco na barra inspecionados. Imagens carregam; perfil mostra catálogo salvo.
Filme Razão e Sensibilidade [L] iniciado, pausado por botão de mídia, barra alcançada
por Up e reprodução encerrada por Voltar ao catálogo. Não foram removidas listas,
limpo cache nem alteradas credenciais/configurações. Reprodução de teste pode
acrescentar título ao histórico/progresso pelo funcionamento normal do app.

Defeito visual encontrado: botão Catálogo no formulário sem texto; Cancelar também
apareceu vazio durante carregamento. Correção local aplicada ao cálculo de largura
intrínseca do texto (flexGrow/flexShrink sem flexBasis zero). Voltar no formulário
agora retorna ao catálogo ativo, em vez de deixar o evento encerrar a atividade.
Ambas correções ainda NÃO INSTALADAS, pois cada APK exige nova autorização.

Revisor independente inspecionou as sete capturas válidas; disposição fix. Nenhum
outro defeito material confirmado nessas imagens. Player/seek íntegros nessa cena;
login precisa confirmação do botão após correção. Não validado:640x360, IME,
contraste em outras cenas, desempenho medido ou ciclo de episódios completo.
Arquivo fire-tv-catalog.png descartado por mostrar drawer em vez de catálogo;
fire-tv-movies.png é evidência válida da grade. Dump UI do perfil retornou null root
e não foi usado como evidência. Metadados das capturas em capture-manifest.json.

Lote corretivo: typecheck e30testes aprovados, três APKs compilados em36s.
Assinatura/alinhamento aprovados. SHA-256 do sideload corrigido, ainda local:
40c570b5bd8bce0b9d9c496acbf2e44ac91d29e40afedc234803062c390052fb. Nenhuma segunda instalação realizada.

## Instalação autorizada do lote corretivo — 30/10/2026

Após confirmação específica Sim, install-r Success e início da atividade Status:ok.
Sem limpar dados. Aberto perfil, selecionado Trocar ou adicionar lista; captura
fire-tv-login-fixed.png mostra botão Catálogo com texto e largura corretos. Em
seguida input dpad keyevent4 retornou diretamente ao catálogo, sem amstart entre
as capturas e sem encerrar atividade; fire-tv-back-fixed.png comprova a tela final.
Aplicativo deixado no catálogo Ao vivo, sem reprodução iniciada nesta rodada.
Nenhuma lista editada/removida, campos preenchidos ou preferência alterada.
Cancelar durante carregamento não foi recapturado; não marcar validado por imagem.

Revisor independente conferiu a segunda rodada: botão Catálogo resolved e retorno
Back resolved, disposition ship restrita às duas correções em960x540. Sem aprovação
integral de outras resoluções, IME, estado Cancelar ou desempenho.

## Ordenação automática e seção combinada — 30/10/2026

Pedido corrigido: ordenação sempre por atualização/inclusão, sem menu de configuração.
Adicionados recentemente é seção combinada de filmes e séries dos últimos30dias,
com busca própria, limites por datas e badges de tipo. Séries sem addedAt podem usar
updatedAt com explicação visível. Filtragem ignora antigo escopo de categoria/plataforma.
Histórico e fila de episódios preservam respectivas cronologias.

Carregamento combinado só busca tipos ausentes/antigos, sequencialmente, reaproveita
cache e publica grade depois da carga para não deslocar foco. Cancelamento invalida
continuação; erros parciais preservam dados disponíveis. Carregamento preserva o
contexto e não fecha reprodução caso uma atualização termine depois de abrir conteúdo.

Typecheck aprovado.32 testes (7 compartilhados,19 nativos,6 cache) aprovados; casos
novos cobrem janela30dias/limite/futuro/ausentes, filmes+séries combinados, distinção
de inclusão e atualização, busca da seção e seleção de catálogos por validade/cache.
Build web aprovado com aviso conhecido de chunk >500kB.

Usuário autorizou nesta rodada atualizar sem nova pergunta (revoga a exigência de
confirmação adicional para esta atualização). Build/instalação e teste da seção no
Fire Stick registrados abaixo. Sem commits/pushes ou descarte de alterações locais.

Build debug/release/sideload aprovado em48s,357 tarefas; assinatura e alinhamento
aprovados. SHA-256 do sideload: 1fa52cde070eb278d78701153f16b34d5be798e2b88d3b631345c9ce4c901a17.

Instalação desta rodada autorizada sem pergunta adicional: install-r Success e
atividade iniciada Status:ok. Menu mostra Adicionados recentemente após Séries,
sem grupo de configuração de ordenação. Entrada acionada por D-pad; tela combina
carregamento de filmes/séries e explica janela30dias e fallback de data das séries.
Cancelar durante carregamento aparece com texto e largura corretos nesta captura,
confirmando também a correção global de largura dos botões da rodada anterior.
Aguardar carga completa para registrar resultado da seção.

Carga concluída no Fire Stick: seção Adicionados recentemente apresentou1.424itens,
com filmes e séries intercalados e badges Filme/Série, janela30dias explicada e
fallback de séries visível. Entrada acionada pelo D-pad a partir de Ao vivo.
Capturas nativas1920x1080 em .impeccable/review/fire-tv-new-menu.png e
fire-tv-new-section.png. App deixado nessa seção, sem iniciar conteúdo, editar
listas ou alterar configurações. Busca/falhas/cancelamento foram cobertos em
fixtures e código; não foram todos reexecutados em hardware nesta rodada.

## Home de plataformas e refinamento de catálogo — 30/10/2026

Pedido: Home com somente Netflix, Globoplay, Prime Video, Disney+ e HBO. Implementada
no shell existente, preservando perfil/drawers/cache. Cinco PNGs locais verificados,
origem Commons em SOURCES.md e sidecars (59.119 bytes no total). Sem runtime novo.
Indisponíveis ficam desabilitados se não há categorias da fonte; tipo padrão Filmes,
senão Séries/Ao vivo, sem inventar tipos. Abas contextuais para plataformas com mais
de um tipo. Voltar e menu Início retornam à Home e restauram foco da plataforma.

Também implementados seis posters em960dp, busca de novidades compacta, explicação
de datas sob demanda e dica de favorito única por sessão. Qualidade visual separa
apenas tags explícitas do nome; título original/URL/ID permanecem inalterados.

Typecheck e34testes aprovados (7 compartilhados,21 nativos,6 cache). Casos novos:
cinco plataformas exatas, tipos da fonte, plataforma ausente, fallback e mudança de
tipo disponível; apresentação de tags sem inventar qualidade nem eliminar linguagem.
Build web aprovado com aviso preexistente de chunk >500kB. Android e validação da
Home em dispositivo registrados abaixo. Nenhum commit/push ou descarte de mudanças.

Build da Home debug/release/sideload aprovado em1m35s,357tarefas. Assinatura e
alinhamento aprovados. Logos confirmados pela tabela de recursos AAPT2 em release
e sideload; nomes de arquivos são otimizados, e debug usa assets pelo Metro.
SHA-256 sideload instalado: 2da6db9de4906749d16e720ed28070bc542c6d607aaec51357ae0298bc1aeb64.
Instalação sob autorização vigente para atualização sem nova pergunta: install-r
Success e atividade aberta Status:ok. Captura inicial mostra exatamente cinco
plataformas e foco Netflix, com tipos reais da fonte.

Home conferida no Fire Stick (1920x1080 físico,960x540 lógico): cinco logos e foco
inicial Netflix. D-pad OK abriu Netflix · Séries com1.963itens; Voltar retornou à
Home e restaurou foco Netflix. RightRight abriu Prime Video · Séries com607itens e
abas Séries/Ao vivo da fonte. Up no primeiro card focou a aba Séries sem abrir menu;
Voltar retornou à Home com Prime Video focado. Nenhum vídeo iniciado, dados/listas
preservados. Capturas fire-tv-home*.png em .impeccable/review (fora do Git).
640x360, plataformas ausentes e ativação das outras três não foram todos exercitados
em hardware; helpers têm cobertura de disponibilidade e seleção de tipo.

Revisão independente da Home e transições nativas: disposition ship restrita a
960x540 e às capturas observadas. Cinco plataformas, catálogos Netflix/Prime, abas
e retorno/foco conferidos; nenhum defeito material confirmado nesse escopo.
Documentação do sistema atualizada sem alterar tokens globais.640x360,IME,
plataformas indisponíveis em hardware e desempenho medido permanecem pendentes.


## 2026-10-30 — Base inicial LG webOS / Samsung Tizen

- Nova aplicação React DOM em `apps/smart-tv`; alvo modelos 2022+; web e Fire TV preservados.
- Extração sem mudança funcional de catalogOrder/catalogNavigation/homePlatforms para `packages/iptv`, com reexports no Fire TV.
- `pnpm build`: PASS (aviso de chunk web >500 kB já existente).
- `pnpm tv:typecheck`: PASS.
- `pnpm test`: PASS, 41 testes (7 IPTV +21 runtime Fire TV +6 cache +7 Smart TV).
- `pnpm smart:build:webos` e `pnpm smart:build:tizen`: PASS; recursos e manifestos preparados em `apps/smart-tv/build/{webos,tizen}`. Não são instaladores.
- Build Chromium 85, IIFE clássico sem dependência de carregamento local de ES modules.
- Revisão estática independente: cinco correções pontuadas como resolvidas (cancelamento, foco do drawer, grupo após episódios, retry de série e teclas Play/Pause/Stop). Isso não certifica funcionamento visual nem hardware.
- Chromium temporário baixado para tentar teste de navegador; execução bloqueada por biblioteca nativa ausente `libnspr4.so`. Nenhum screenshot/fluxo de navegador validado.
- CLIs webOS/Tizen não instaladas. Não foi gerado `.ipk`/`.wgt`, nem realizada instalação em TV.
- Sem teste real de streams, codecs, IME, D-pad, desempenho, memória ou auto-next no fim natural do episódio. Os testes dos adaptadores usam APIs simuladas.
- Nenhuma ação executada no Fire Stick. Sem commits ou pushes.
- Pendências e comandos em `docs/SMART-TV.md`.


## 2026-10-30 — Distribuição pública e pacotes Smart TV de desenvolvimento

Repositório público de downloads criado por autorização explícita: https://github.com/deivao06/senju-player-tv. Somente HTML/SVG/README e artefatos finais, sem envio de código-fonte do monorepo. Página https://deivao06.github.io/senju-player-tv/ habilitada no Pages.

Fire TV: APK original SHA-256 2da6db9de4906749d16e720ed28070bc542c6d607aaec51357ae0298bc1aeb64, assinatura apksigner verificada, HTTP público 200 e tamanho 27741608 bytes conferidos. Prévia v0.1.0-preview.1.

Navegador agora disponível após extração de libnspr/libnss/libasound só em /tmp. Chromium 141 com fixtures Xtream passou login/Home, temporadas, Back, foco drawer, paginação 30 itens e busca vazia. Não certifica Chromium 85/87 nem media decoder das TVs.

Página download: capturas reais 1920×1080,1280×720,390×844, sem overflow horizontal, links e foco presentes; revisão independente ship do design nesse escopo. Guia LG capturado em 1280 e390. Não testado em Downloader/TV.

LG: @webos-tools/cli3.2.6 gerou IPK com --no-minify e requiredACG vazio. Ferramenta emitiu Success, porém saída134; arquivo ar/tar íntegro, cada recurso comparado byte a byte ao build Vite. SHA-256 6eb70fa0593e3f28310c61215c1501e4c3cfd46800225197d3171c5e4c9c1e16. Não afirmar instalação testada.

Samsung: WGT sem assinatura criado como artefato técnico ZIP/XML; não é diretamente instalável. Sem Tizen Studio/certificados. SHA-256 5659139e72e854c3f65f3d5b0dc8556070caaac56c87793ff993af3b2ae075ff.

Prévia técnica v0.1.0-smart-preview.1 publicada com os dois arquivos e hashes, limitações explícitas. Guia LG inclui Developer Mode, computador na mesma rede, obtenção de chave e comandos oficiais. Sem conexão ou alteração de qualquer TV. Sem commit/push no repositório de desenvolvimento; a publicação aprovada criou commits somente no novo repositório público.

Verificação pública final: guia LG HTTP200; IPK e WGT baixados anonimamente e comparados integralmente com os arquivos locais, hashes idênticos. Página corrigida para distinguir WGT técnico de instalador Samsung. Commit público final da página: a4dcff978a5337a610708cd44777fe19c9a58a9a.


## 2026-10-30 — Preparação do commit do monorepo

Por solicitação explícita do usuário, documentação atualizada antes do commit/push:
README, contexto do produto, guia Fire TV, resumo das pendências, instruções locais
e briefs Smart TV/downloads. Registros históricos preservados.

Checks repetidos nesta etapa: `pnpm test` (41 testes), `pnpm build` (PASS, aviso
conhecido de chunk web >500kB), `pnpm tv:typecheck` e `pnpm smart:build` (PASS).
Nenhum APK novo instalado, nenhuma conexão com TV realizada. APKs/IPK/WGT,
ferramentas locais, credenciais e capturas permanecem fora do Git. A única
keystore versionada é a chave padrão de desenvolvimento Android, sem uso para
produção. Repositório de origem já público; revisão dos arquivos previstos não
encontrou padrões de tokens/chaves privadas. A autorização atual inclui commit
e push do estado completo do projeto, preservando a migração por renomes Git.
