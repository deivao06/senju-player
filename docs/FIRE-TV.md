# Senju Player para Fire TV (Fire OS)

Implementação inicial nativa. O Senju não fornece conteúdo; use listas próprias e autorizadas.
Não há WebView nem backend novo. Roku e Vega OS estão fora do escopo. A evolução
LG/Samsung fica separada em `apps/smart-tv`; veja SMART-TV.md.

## Estado atual

APK de testes instalado no AFTSSS; Home, entrada de catálogo de Netflix/Prime,
restauração de foco e alguns fluxos de formulário/player conferidos. Registro
detalhado em VALIDACAO.md. Não certifica todos os formatos, avanço natural entre
episódios, funcionamento offline, memória ou performance do cache. Downloads em
https://deivao06.github.io/senju-player-tv/.

## Estrutura e escolhas

- `apps/web`: app original React/Vite/Tailwind, stores e persistência originais.
- `apps/fire-tv`: React Native TV, UI nativa por estado, sem biblioteca de navegação adicional.
- `packages/iptv`: entidades, classificação M3U, normalização e endpoints Xtream originais.
  Transporte injetado: axios/proxy no web, fetch direto com timeout/cancelamento na TV.
- pnpm 10.11.0, instalação hoisted para Gradle/autolinking. Metro e TypeScript resolvem React
  da aplicação TV explicitamente para evitar misturar React 19.1 e o React do web.

Versões fixadas: RN alias `react-native-tvos@0.81.5-0`, React 19.1.0, RN Video 6.19.0
(Media3 1.8.0 conforme pacote instalado), Keychain 10.0.0, AsyncStorage 2.2.0.
Base Android do template oficial RN 0.81.5: minSdk 24, compile/targetSdk 36,
Build Tools 35.0.0 e 36.0.0, Kotlin 2.1.20, NDK 27.1.12297006, Gradle 8.14.3, JDK 17.
Hermes habilitado, arquitetura antiga habilitada explicitamente (`newArchEnabled=false`)
para reduzir o escopo da primeira integração. Testar mudança para Fabric separadamente.
A escolha 0.81 é uma base fixa conservadora, não uma afirmação de ser a última versão.

Fire OS 6/API25 ou superior é o mínimo desta combinação. Fire OS 5/API22 não é suportado.
Dispositivo de teste identificado: Amazon AFTSSS, Fire OS Android9/API28, sistema
ARM de 32 bits. Codecs e comportamento variam conforme modelo/stream. APK inclui
armeabi-v7a e arm64-v8a;
não assumir que um processador de 64 bits implica sistema Android de 64 bits.

## Ambiente e comandos

Instale Node >=20.19.4 (validado com 22.22.0), pnpm 10.11.0, JDK17 e Android Studio/SDK.
No SDK Manager, instale API36, Build Tools 35.0.0 e 36.0.0, platform-tools e o NDK indicado acima.
Configure `JAVA_HOME`, `ANDROID_HOME` e adicione platform-tools ao PATH. Não versionar
`android/local.properties`, chaves release, senhas ou listas reais.

```bash
corepack enable
corepack prepare pnpm@10.11.0 --activate
pnpm install --frozen-lockfile
pnpm dev                    # web: http://localhost:5173, com proxy IPTV
pnpm build                  # apps/web/dist
pnpm test                   # fixtures locais M3U/Xtream, sem provedor externo
pnpm tv:typecheck
pnpm --filter @senju/fire-tv bundle  # apps/fire-tv/build/index.android.bundle
pnpm tv:start               # Metro; manter em outro terminal
pnpm tv:android             # compilar/instalar no dispositivo conectado
pnpm tv:apk:debug
```

Debug: `apps/fire-tv/android/app/build/outputs/apk/debug/app-debug.apk`.
Debug depende do Metro. Para emulador Android TV API24+, criar AVD no Android Studio,
iniciar e usar a arquitetura correspondente:

```bash
cd apps/fire-tv/android
./gradlew assembleDebug -PreactNativeArchitectures=x86_64
```

A flag de emulador deve refletir a imagem instalada. Não foi executado emulador neste ambiente.
No Linux, se necessário: `chmod +x apps/fire-tv/android/gradlew`.

## Conexão Fire Stick e sideload

Ative as opções de desenvolvedor e a depuração ADB no Fire TV.
O IP aparece em Configurações → Meu Fire TV → Sobre → Rede.
Se as opções de desenvolvedor estiverem ocultas, selecione o nome do dispositivo em Sobre
e pressione o botão central sete vezes. Depois volte uma tela.
Conecte o computador à mesma rede, aceite a autorização na TV e confirme o dispositivo:

```bash
adb connect IP_DO_FIRE_STICK:5555
adb devices
adb shell getprop ro.product.model
adb shell getprop ro.build.version.sdk
adb shell getprop ro.product.cpu.abilist
adb reverse tcp:8081 tcp:8081
adb install -r apps/fire-tv/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.senju.tv/.MainActivity
```

Para conexão sem `adb reverse`, configure o servidor Metro no menu de desenvolvimento
com IP_DO_COMPUTADOR:8081. Não exponha Metro ou ADB à internet.

## APK autônomo para teste por sideload

```bash
pnpm tv:apk:sideload
adb connect IP_DO_FIRE_STICK:5555
adb -s IP_DO_FIRE_STICK:5555 install -r apps/fire-tv/android/app/build/outputs/apk/sideload/app-sideload.apk
adb -s IP_DO_FIRE_STICK:5555 shell am start -n com.senju.tv.sideload/com.senju.tv.MainActivity
```

A variante `sideload` inclui JavaScript/Hermes, funciona sem Metro e usa a chave pública
de desenvolvimento. O nome é **Senju Player (Teste)**, com identificador `com.senju.tv.sideload`.
Sua instalação e seus dados são separados do app `com.senju.tv`. Ela serve para testes;
o build release continua usando uma chave privada própria para distribuição.

## Release sem Metro

`pnpm tv:apk:release` inclui o bundle JS. Sem variáveis de assinatura gera APK **unsigned**,
que precisa ser assinado antes da instalação. Para gerar um APK release instalável, crie
sua chave privada fora do repositório e forneça as quatro variáveis de ambiente:

- `SENJU_UPLOAD_STORE_FILE`: caminho absoluto do keystore.
- `SENJU_UPLOAD_STORE_PASSWORD`: senha do keystore.
- `SENJU_UPLOAD_KEY_ALIAS`: alias da chave.
- `SENJU_UPLOAD_KEY_PASSWORD`: senha da chave.

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore /CAMINHO/PRIVADO/senju-upload.keystore \
  -alias senju -keyalg RSA -keysize 2048 -validity 10000
# Defina as variáveis acima no ambiente local de forma privada.
pnpm tv:apk:release
adb install -r apps/fire-tv/android/app/build/outputs/apk/release/app-release.apk
```

Não usar a chave debug como assinatura de distribuição. Atualizações exigem mesma chave;
Android não instala release assinado com chave diferente sobre a versão debug existente.

## Fluxo entregue no código

Lista M3U ou Xtream salva no Keychain/Keystore; selecionar/remover listas; autenticação;
catálogo de canais/filmes/séries; filtro de grupo e busca; seleção de episódios por temporada
em lista; player nativo; voltar mantendo categoria, busca, rolagem e índice de foco.
D-pad e seleção usam Pressable, foco branco/verde e TVFocusGuideView. FlatList virtualiza
catálogo e grupos, rola ao foco e reposiciona a linha ao retornar. Botão Voltar cancela carga,
fecha player, retorna das séries ou abre listas; na raiz delega ao sistema.
Favoritos e 50 recentes por playlist; progresso VOD/episódios salvo a cada 5 segundos.
Controles de pausa, ±30s, retry manual; pausa em background. Fechar desmonta o componente
Video e permite ao módulo nativo liberar ExoPlayer. Isso ainda exige validação em execução.

Keystore guarda credenciais e URLs M3U (que também podem conter tokens), sem autenticação
biométrica obrigatória para TV. AsyncStorage guarda apenas IDs/progresso, sem URLs ou senha.
Backup Android está desativado. Catálogos ficam em memória e Xtream carrega um tipo por vez.
O app não escreve logs com credenciais/URLs; inspecionar logs nativos de terceiros antes de
compartilhá-los. A persistência web original ainda contém credenciais em texto claro e não
foi migrada para outra solução nesta etapa.

## Reprodução e limites

RN Video reutiliza Media3/ExoPlayer. HLS habilitado; MPEG-TS progressivo, MP4/MKV dependem
dos extratores e dos decodificadores instalados. Decodificação por hardware é selecionada
pelo player/plataforma quando disponível; não é garantida para todo perfil/codec.
O sucesso no HLS.js/MPEGTS.js não prova sucesso nativo. Validar H.264/AAC, HEVC, AC3/EAC3,
resoluções, áudio e legendas em cada modelo. Sem FFmpeg ou decodificador customizado.
Sem DRM, RTSP/UDP, multicast, DASH ou SmoothStreaming nesta primeira configuração.
HTTPS é preferível; HTTP está habilitado explicitamente porque listas IPTV existentes usam
HTTP. TLS inválido não é ignorado. Redirecionamento entre protocolos, cookies/autenticação
não padrão e servidores com proteção específica precisam de testes próprios.

Headers User-Agent/Referer do parser e sufixos `|user-agent=...&referer=...` são traduzidos
na TV; links HLS sem extensão dependem da detecção do servidor/player. Não há editor de
headers, EPG, catch-up ou garantia para todas as diretivas M3U. A classificação M3U continua
heurística; M3U não tem os metadados/temporadas garantidos pela API Xtream.

## Pendências reais

- Instalação, inicialização e testes reais de foco/D-pad/Voltar no Fire Stick.
  Debug, release unsigned e sideload já foram compilados; consultar VALIDACAO.md.
- Medir memória, tempo de entrada e estabilidade com playlists e dispositivos representativos.
- M3U ainda é baixado e parseado inteiro em JS (parser original altera String.prototype).
  Virtualização reduz a UI, não o pico de memória de parsing. Não há streaming de parsing.
- Xtream carrega um tipo inteiro por vez; sem paginação por provedor nem cache de catálogo em disco.
- O serviço Xtream preserva o fallback web: falha no endpoint de categorias gera mapa vazio;
  o catálogo pode aparecer em "Outros". Não interpretar isso como categorias completas do provedor.
- IDs M3U herdados podem colidir; não alterar silenciosamente IDs que indexam favoritos do web.
- Grupos muito longos, teclado TV, saltos de foco e restauração precisam de ensaio no controle real.
- UI TV inicial usa texto sem posters, seleção de episódios em lista, idioma português;
  paridade visual completa, arte/cache e demais traduções ficam pendentes.
- Recentes/favoritos são filtrados no tipo carregado; episódios aparecem no seletor da série,
  sem biblioteca global de episódios recentes. Sem sincronização web/TV ou retomada entre dispositivos.
- Recuperação de stream por tentativa manual; não há estratégia automática de reconexão ao vivo.
- Nenhuma playlist ou credencial de usuário foi fornecida para teste contra um provedor real.
- Lint web já tinha violações; consultar relatório de validação. Build não valida comportamento no navegador.

## Referências oficiais consultadas

- https://github.com/react-native-tvos/react-native-tvos/releases/tag/v0.81.5-0
- https://github.com/react-native-tvos/react-native-tvos (foco, BackHandler, APIs TV, mínimo Android)
- https://reactnative.dev/docs/0.81/set-up-your-environment
- https://docs.thewidlarzgroup.com/react-native-video/docs/v6/intro/
- https://docs.thewidlarzgroup.com/react-native-video/docs/v6/component/props/
- https://github.com/TheWidlarzGroup/react-native-video/blob/v6.19.0/android/build.gradle
- https://developer.android.com/media/media3/exoplayer/supported-formats
- https://developer.amazon.com/docs/fire-tv/fire-os-overview.html
- https://developer.amazon.com/docs/device-specs/identify-fire-tv-devices.html
- https://oblador.github.io/react-native-keychain/docs/usage/

Arquivos Android derivados de @react-native-community/template 0.81.5 (MIT).

## Ajustes verificados durante o build Android

O filtro de ABIs é explícito em defaultConfig.ndk: a propriedade reactNativeArchitectures
isoladamente não filtrava todas as bibliotecas do APK na arquitetura antiga.
O caminho do compilador Hermes é explícito no Gradle para o node_modules da raiz do monorepo.
O Metro exclui o cache local de SDK/Gradle da varredura. O manifesto declara Leanback,
touchscreen e faketouch como opcionais, conforme o guia React Native da Amazon:
https://developer.amazon.com/docs/fire-tv/add-tv-support-to-an-existing-react-native-project.html

A dependência Git transitiva de MPEGTS.js (`webworkify-webpack`) foi fixada por override
no mesmo commit já resolvido no lock, usando HTTPS. Isso evita resolução SSH/HEAD em novas
instalações sem trocar a implementação do player web.

Testes da TV executam no Node, com fetch simulado: cancelamento e limpeza de listeners,
erros HTTP genéricos, tradução de headers e seleção de fonte. Não substituem testes do
ExoPlayer, da Keystore ou do foco em execução Android.

Referências de ferramentas utilizadas nesta validação:
- https://developer.android.com/tools/sdkmanager
- https://developer.android.com/tools/apksigner
- https://developer.amazon.com/docs/fire-tv/connecting-adb-to-device.html

## Tela de entrada TV

O formulário nativo foi separado em PlaylistSetup.tsx. A entrada usa apresentação à esquerda
e um painel de cadastro à direita, com abas M3U/Xtream, rótulos e credenciais lado a lado.
Button.tsx e Input.tsx acompanham o foco nativo com useTVFocus.ts (eventos focus/blur
de useTVEventHandler e o tag do controle). O foco usa verde vivo, texto escuro e borda
branca; seleção de aba e foco são estados visuais diferentes. Input.tsx encaminha o
teclado entre os campos. A atividade usa adjustResize.

A nova tela foi compilada e ainda depende de teste visual/controle no aparelho, suspenso
a pedido do usuário em 28/10. O APK anterior já havia sido instalado e iniciado no AFTSSS.

O destaque de foco da entrada foi validado posteriormente no AFTSSS: foco inicial,
direita/baixo/esquerda entre botões, entrada no campo e retorno para cima ao M3U.
Na automação Android, usar `input dpad keyevent`, pois o input padrão simula teclado
e as setas podem mover o cursor de edição do TextInput em vez do foco do controle.

O reforço visual do seletor adiciona borda branca de5dp e seta ▶ aos controles focados.
A seleção permanente da aba continua discreta e diferente do foco do controle. A seta
não participa da acessibilidade nem recebe foco separado. Botões compactos mantêm
o ícone centralizado; a lista virtualizada usa a mesma altura88dp no layout e no cálculo
de scroll. O APK atualizado foi instalado e a borda/seta foram observadas na TV.

## Catálogo e controle remoto

A grade usa logos de canais e capas de filmes/séries fornecidos pela playlist, com
nome abaixo. Quando uma imagem falta ou falha, aparecem as iniciais do item.
O número de colunas acompanha a largura disponível; as linhas são virtualizadas.

- Abra ☰ à esquerda da marca Senju na navbar para escolher Ao vivo, Filmes ou Séries no drawer esquerdo; use o campo de busca para filtrar.
- Na primeira coluna, pressione esquerda para focar ☰ e OK para abrir o drawer de categorias.
  Escolha uma categoria/filtro ou pressione direita/Voltar para fechar.
- OK abre o conteúdo; segure OK para adicionar/remover favorito.
- O ícone de perfil no canto superior direito abre as opções: trocar/adicionar lista,
  atualizar catálogo, configurações e sair da lista (sem apagar o cadastro).
- Voltar no catálogo também abre as opções. Nos episódios, retorna às séries;
  no player, retorna ao catálogo.
- Com exatamente uma lista salva, o app entra nela automaticamente. É possível
  desativar em Perfil → Configurações → Entrada automática. Com mais de uma lista,
  permanece a seleção no cadastro. Se a conexão inicial falhar, volta ao cadastro
  com erro; não fica preso na entrada automática.

A tela de cadastro mantém o layout aprovado. As preferências ficam no AsyncStorage;
credenciais continuam no armazenamento seguro do dispositivo.

## Controles do player

O vídeo continua nativo em react-native-video/Media3, sem controles padrão ou WebView.
A interface própria mostra título, logo (quando fornecido) e a identificação AO VIVO
nos canais. Filmes/episódios mostram tempo e duração informada pelo stream, barra de
progresso e botões de −30/+30 segundos, habilitados após o player informar seek disponível.

Os controles somem após cinco segundos sem interação durante reprodução. OK ou uma
seta mostra novamente; Play/Pause alterna a pausa. Ao pausar, os controles permanecem
visíveis. D-pad navega pelos botões, com borda branca/fundo verde. O botão ⌄ permite
ocultar manualmente, inclusive em pausa. Voltar retorna diretamente ao catálogo.

O relógio da interface atualiza somente o overlay enquanto visível; não atualiza o
estado do componente de vídeo a cada segundo. O progresso é persistido a cada cinco
segundos e ao sair; timers são cancelados ao desmontar. Erro desmonta a instância de
vídeo e apresenta tentar novamente/voltar. O vídeo é pausado quando o app perde atividade.
Não há animações, novas dependências ou cache de catálogo nesta alteração.

### Navbar e plataformas

A navbar reúne menu, marca, seleção atual/quantidade, busca e perfil; a grade não tem
um segundo cabeçalho. O drawer usa recuo maior e linhas sem caixas/bordas permanentes.
No topo, Ao vivo/Filmes/Séries abrem todos os itens do tipo, limpando busca e filtros.
Abaixo do separador, OK expande/recolhe cada plataforma. Seus filhos mostram somente
os tipos encontrados nas categorias da fonte. A seleção de um filho filtra os itens
pelas categorias dessa plataforma, inclusive se houver vários grupos de idiomas.

A identificação usa aliases em nomes de categorias (Globoplay, Netflix, Prime Video,
Disney+, HBO/Max e outros reconhecidos). Não se infere plataforma pelo título, imagem
ou URL do vídeo. Grupos não reconhecidos ficam em Outras categorias, para o tipo atual.
Não existe integração oficial ou catálogo próprio dessas plataformas.

Xtream consulta as categorias dos outros tipos em segundo plano, sem antecipar os
catálogos completos; ao mudar de tipo, a requisição anterior é cancelada. M3U usa os
grupos já extraídos pelo parser. Essa descoberta fica apenas na memória da sessão.
Os accordions/grupos e a grade são virtualizados; o índice de grupos é calculado uma
vez por atualização e o filtro dos itens usa lookup em Map, sem classificar cada
item contra todas as marcas a cada pesquisa.

Cards sem foco não têm borda visível ou fundo verde; o foco usa contorno fino de 2dp
com escala estática de 1,025, sem animação contínua. A área da grade reserva espaço
para esse destaque. Fechar menu foi removido: use Voltar ou direita para fechar.

### Busca contextual e atualização de plataformas

Subir a partir da primeira linha aponta para a busca na navbar; focar o menu não o
abre automaticamente. A busca só reduz a seção selecionada (tipo/plataforma/grupo e
filtro atual). Ao trocar de seção, o texto é limpo. Confirmar pelo teclado direciona ao primeiro resultado (Avançar no teclado deste Fire Stick).

Filmes por plataforma já estão suportados quando o provedor informa essa classificação,
inclusive em categorias secundárias dos itens Xtream. Atualize o catálogo ou reabra o
app para descobrir categorias novas. Um filme disponível no catálogo geral não implica
que a lista informe sua plataforma. Sem essa informação, o app preserva o acesso pelos
tipos gerais e pelos grupos; não atribui filmes arbitrariamente a uma marca.

## Avanço automático de episódios

Ao terminar um episódio de uma série com fila estruturada (detalhes Xtream), o app
abre o próximo na ordem de temporada/episódio já normalizada pelo serviço. A fila é
a série completa, independente de filtros ou futuras tabs de temporadas. O próximo
começa do início; histórico e progresso são atualizados. No último, retorna à lista
com o episódio correto focado. Filmes avulsos e canais não iniciam outros conteúdos.

Somente o evento nativo onEnd dispara o avanço. Voltar/fechar não avança, callbacks
duplicados/tardios são ignorados e erro de reprodução mantém tentar novamente/voltar.
Se a URL do próximo estiver vazia, retorna à lista com erro sem pular vários episódios.
Cada episódio monta uma nova instância do player para reiniciar os estados e liberar
a anterior. Não há pré-carregamento de outro vídeo nem dependência nova.

Limitação: M3U sem metadados estruturados de episódios não fornece uma fila segura;
nessas fontes não se infere a ordem pelo nome do conteúdo. Validação real do avanço
fica pendente até a instalação autorizada, para não interromper quem estiver assistindo.

### Busca vazia e controles sobrepostos

O estado sem resultados é somente informativo, sem botão central. Na busca, com o
teclado fechado e a seção vazia, esquerda foca ☰; OK abre o menu. Confirmar no teclado
com zero resultados também direciona ao menu. Com resultados, segue para o primeiro card.

Play/pause é um ícone alternado em um botão circular no centro da faixa inferior,
entre retroceder/avançar 30s. As superfícies são translúcidas e não há card verde
contornando a faixa. O foco usa contorno branco; labels de acessibilidade continuam
descritivos. Barra interativa e anterior/próximo episódio permanecem pendentes.

Qualquer atualização do APK no Fire Stick exige confirmação do usuário antes de executar.

### Episódio anterior/próximo

Quando o conteúdo pertence à fila de uma série, o transporte mostra ícones de pular
para o episódio anterior/próximo nas extremidades, separados dos controles ±30s.
No primeiro/último, o respectivo botão fica desabilitado. Filmes avulsos e canais não
mostram esses botões. A fila mantém a ordem de temporada/episódio normalizada pela fonte.

Trocar manualmente salva a posição do episódio que estava sendo assistido, sem
marcá-lo como concluído. O destino começa do início. Foco de retorno, histórico e
progresso acompanham o item novo; a instância antiga é desmontada. Eventos tardios
do decoder anterior não devem iniciar outro salto. O avanço automático continua separado.

### Temporadas e posição do vídeo (30/10/2026)

A tela de episódios mostra abas horizontais de temporadas (temporada 0: Especiais).
OK seleciona a temporada; a grade virtualizada apresenta apenas seus episódios.
Voltar do player restaura temporada e episódio da fila completa. Avanço automático
ou manual atravessa temporadas sem depender da aba visível.

No player, subir dos controles permite focar a barra de progresso. Esquerda/direita
ajustam a prévia em passos de 10 segundos; OK confirma uma única chamada nativa de
seek. Sair da barra descarta a prévia. Os controles permanecem visíveis durante
a seleção. A barra é desabilitada em streams sem seek/duração disponível e não
aparece ao vivo. A precisão depende do índice/keyframes e do servidor.
A integração segue o método seek após onLoad da documentação v6:
https://docs.thewidlarzgroup.com/react-native-video/docs/v6/component/methods/#seek

Os botões mantêm verde translúcido do Senju e destaque de foco claro. Os saltos de
30 segundos mostram apenas ícones; o valor continua no rótulo de acessibilidade.

### Ordenação padrão e Adicionados recentemente

Filmes e séries sempre abrem por última atualização da fonte, com inclusão como
fallback. Vale para categorias/plataformas, busca e favoritos; itens sem datas ficam
no fim e empates preservam sequência da fonte. Histórico mantém a ordem de reprodução
e episódios mantêm a ordem de temporada/episódio. Canais sem datas mantêm a origem.
Não há mais opções Ordem original ou Ordenação no menu.

O menu esquerdo tem uma seção própria **Adicionados recentemente**, acessível de
qualquer tipo de conteúdo. Ela reúne filmes e séries dos últimos30dias (limite
inclusivo, excluindo datas futuras), com identificação Filme/Série na capa. Usa a
data de inclusão; para séries sem inclusão, usa última atualização, explicado na
própria tela. Uma atualização de série não garante episódio novo. Filmes sem data
de inclusão e itens sem datas válidas não são apresentados como novas adições.

A busca fica restrita à seção. Ao entrar, limpa escopo de categoria/plataforma e
carrega somente filmes/séries ausentes ou antigos, um tipo por vez para conter
pico de memória. Cache recente/memória são reaproveitados; M3U é carregada no máximo
uma vez. A grade combinada aparece após concluir a carga para não deslocar foco com
inserções entre tipos. Falha parcial mantém dados disponíveis e avisa; navegar para
outra seção cancela o restante. Atualizar catálogo nesta seção atualiza os dois tipos.

O pacote IPTV preserva addedAt/updatedAt opcionais em milissegundos. Não inventa
datas por título, ID ou posição, nem chama detalhes individuais para ordenar.
M3U sem metadados de data pode ter esta seção vazia; o catálogo normal segue usável.
Não há endpoint ou dependência nova. Referência dos campos do provedor:
https://github.com/euzu/tuliprox/discussions/134

### Cache de catálogo

Catálogos persistidos e criptografados, por lista/tipo; cache recente evita baixar
novamente, cache antigo é mostrado enquanto atualiza. Atualização manual no perfil
e limpeza nas configurações. Política, limites, referências e roteiro de testes:
[CACHE-TV.md](CACHE-TV.md). Não inclui vídeos nem detalhes/episódios de séries.

### Home de plataformas

Ao abrir uma lista, a primeira tela é Início. Mostra exatamente os atalhos Netflix,
Globoplay, Prime Video, Disney+ e HBO solicitados pelo usuário, com logos PNG locais
(~59 KB no total), sem baixar imagens no início nem depender de app externo.
Plataformas sem categorias reconhecidas na lista ficam indisponíveis; não se infere
origem pelo nome de filmes. Ao escolher uma, abre seu catálogo: Filmes por padrão
quando disponíveis, senão Séries ou Ao vivo. Abas mostram somente os tipos reais
informados pela fonte. HBO usa os grupos HBO/Max já reconhecidos no catálogo.

Os atalhos gerais Ao vivo/Filmes/Séries/Novidades continuam disponíveis. No catálogo,
Voltar retorna à Home (primeiro fecha um drawer ou uma tela de episódios, quando
aplicável). Início também está no menu esquerdo. A plataforma focada é restaurada
ao retornar. Perfil/listas/configurações são os mesmos do catálogo.

A Home reaproveita categorias e cache existentes; não baixa todos os filmes/séries
para desenhar cinco atalhos. A disponibilidade pode ser atualizada quando categorias
são descobertas. Não há integração comercial/assinatura com as marcas.

Grade: seis capas em960dp de largura; em telas menores o número se adapta. Nome
original fica na legenda do alvo; qualidade só é separada de tags explícitas como
[HD]/[FHD]/[HDR], sem modificar URL, identidade ou agrupar variantes. A dica de
favoritar aparece por quatro segundos só uma vez por sessão e fica documentada
nas configurações. A janela de30dias aparece junto à contagem; explicação de datas
é aberta pelo botão de informações. Busca de novidades usa texto compacto.

Créditos dos logos: apps/fire-tv/src/assets/platforms/SOURCES.md e sidecars de origem.


## Tela de detalhes de filmes e séries — 03/11/2026

Ao selecionar filme/série, o Fire TV abre uma página de detalhes com capa, título,
sinopse e informações fornecidas pela fonte. O fundo aparece somente quando há
backdrop HTTP(S) informado pelo provedor; sem nova consulta a serviços externos.
Filmes usam `get_vod_info`; séries mantêm `get_series_info`. Em M3U, apenas dados
existentes são exibidos e a reprodução é direta, sem episódios inventados.

Ações: assistir/continuar, favorito e leitura integral da sinopse. Filmes sem
metadados continuam reproduzíveis. Séries Xtream sem episódios não reproduzem a
URL genérica de série como se fosse um vídeo. Abaixo do cabeçalho, temporadas e
lista virtualizada de episódios com imagem, descrição e duração quando fornecidas.
A fila completa permanece disponível para próximo/anterior e avanço automático.

O botão Continuar busca o episódio mais recente com progresso positivo. Fechar
o player restaura o contexto dos detalhes, e Voltar aos detalhes retorna ao
catálogo. A navegação nativa e o visual desta tela ainda exigem teste em aparelho;
compilação e testes de regras não equivalem a aprovação visual ou de desempenho.
