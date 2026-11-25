# Pendências TV — 30/10/2026

## Atualização — 24/11/2026 (cache, harden e Impeccable)

O loading ao trocar de provedor no menu lateral foi corrigido no Fire TV: os
snapshots passam a ser reaproveitados em memória por provedor e tipo, sem nova
leitura do disco nem spinner quando o conteúdo já foi carregado. Biblioteca por
provedor e limpeza seletiva acompanham o mesmo mapa. Detalhes, episódios e a
primeira consulta continuam sob demanda. Ver `docs/CACHE-TV.md`.

Fases do Impeccable executadas em sequência, sem alterar o app web:
- **harden:** leitura de biblioteca tolerante a JSON corrompido, esquema inválido
  e limites nos dois apps; registro original é preservado/quarentenado antes de
  uma nova gravação. No Smart TV há opção explícita no perfil para descartar a
  biblioteca inválida e voltar a salvar.
- **typeset:** escala de leitura à distância aplicada em detalhes/player do Fire TV
  e variáveis `--type-*` no CSS do Smart TV.
- **optimize:** callbacks estáveis nos cards, chaves de lista por identidade,
  listener de teclado anexado uma vez no Smart TV e refs de callbacks no player.
- **layout:** tokens do `DESIGN.md` no CSS do Smart TV, preenchimento de foco em
  `.poster`/`.episode-row`, margem de segurança por overscan/cutout e oito colunas
  em telas muito largas; acento do Fire TV unificado ao token.
- **document:** `DESIGN.md`, `CACHE-TV.md`, `SMART-TV.md` e `VALIDACAO.md` atualizados.
- **polish:** verificação no navegador integrado com provedor fictício: lista
  restaurada após reload, uma ArrowDown de `#item-0` para `#item-6` com rolagem,
  foco com preenchimento/contorno e zero erros de console. Não é validação em TV.

Typecheck dos dois apps, 42 testes locais e build Vite do Smart TV passaram.
Nenhum APK/IPK/WGT foi gerado ou instalado nesta rodada, e nada foi testado em
hardware. O usuário tem somente Fire Stick: restam medir a troca de provedores no
AFTSSS, a navegação D-pad nas bordas da grade e a legibilidade em 960×540/640×360.
LG/Samsung seguem sem validação de D-pad, IME, decoder, persistência ou foco.

## Atualização — 24/11/2026

Navegação de grade dos apps de TV ajustada: uma única pressão de Baixo agora
seleciona o card/poster da linha seguinte e rola junto, sem exigir uma segunda
pressão apenas para rolar. Fire TV passa a declarar `nextFocusDown/Up/Left/Right`
calculados pela grade; Smart TV resolve o vizinho antes da navegação geométrica.
Testes locais, typecheck dos dois apps e build Smart TV passaram. Confirmação no
Fire Stick e em LG/Samsung reais continua pendente.

## Atualização — 03/11/2026

Tela Fire TV de detalhes de filmes/séries implementada: capa, sinopse, metadados,
fundo quando fornecido, ações assistir/continuar/favorito e temporadas com episódios
em lista virtualizada. Filme passa pelos detalhes antes do player. Fila completa
e continuidade de episódios preservadas. Typecheck,47 testes e builds web/Smart TV
passaram. Validação visual/D-pad desta tela em TV continua pendente.

## Resumo atual

- **Fire TV:** Home/UI/player/cache implementados; APK de teste instalado no AFTSSS e publicado. Validação de fluxos específicos registrada, sem certificação geral de desempenho/formatos/offline/auto-next natural.
- **Web:** preservado em apps/web, build operacional.
- **LG:** IPK de desenvolvimento publicado, guia de instalação disponível. CLI emitiu Success e saiu com134; estrutura/recursos conferidos, sem instalação/player em TV real.
- **Samsung:** WGT técnico publicado, SEM assinatura. Não instalável diretamente; faltam certificados e teste na TV alvo. Modelo/disponibilidade de computador ainda precisam ser informados para o teste.
- **Distribuição:** página e Releases públicos em deivao06/senju-player-tv; Fire TV, guia LG e arquivos verificados por HTTP/hash.
- **Próximo:** validar LG na viagem e preparar assinatura/instalação Samsung via ferramentas oficiais; depois persistência/biblioteca/cache nas Smart TVs.

Os registros abaixo são históricos. “Não instalado” e exigências antigas de
confirmação referem-se àquela etapa; consultar a autorização vigente do usuário.

## Histórico de implementação

Prioridade solicitada pelo usuário:

1. **Avanço automático entre episódios**: código e testes locais prontos. Ao receber
   o fim do episódio, inicia o próximo da fila completa da série, inclusive entre
   temporadas; no último, retorna à lista. Instalado no Fire Stick após autorização explícita do usuário.
   Falta validar o fim natural de um episódio e a troca automática em hardware.
2. **Tabs de temporadas implementadas**, com grade virtualizada por temporada,
   restauração pelo episódio e fila completa preservada para avanço automático.
   Validação no dispositivo registrada em docs/VALIDACAO.md.
3. **Busca sem resultados: implementada localmente**, com remoção do botão vazio,
   foco do menu por esquerda (teclado fechado) e fallback para o menu ao confirmar
   busca vazia. Instalado após autorização; pendente de validação funcional no Fire Stick.
4. **Ícones/transparência do player: implementados localmente**, com play/pause
   centralizado, ±30s nas laterais e controles sobre o vídeo sem card verde.
   Instalado após autorização; pendente de validação funcional no Fire Stick.
5. **Barra de progresso interativa implementada**: esquerda/direita ajustam prévia
   de 10s, OK confirma; sair descarta. Sem seeks repetidos durante a seleção.
   Validação no dispositivo registrada em docs/VALIDACAO.md.
6. **Anterior/próximo episódio: implementados localmente**, com ícones no player,
   limites desabilitados, posição atual preservada e episódio escolhido iniciado do zero.
   Instalado após autorização; pendente de validação funcional no Fire Stick.

O cache persistente continua reservado para depois destes ajustes.

Regra do usuário: sempre perguntar e aguardar confirmação antes de atualizar o APK no Fire Stick.


Última candidata: abas e barra de progresso compiladas em 30/10/2026, ainda não
instaladas. A revisão automática exigiu nova confirmação específica após os
ajustes do player; solicitação apresentada ao usuário. Nenhuma validação nova no
aparelho nesta rodada. Ver docs/VALIDACAO.md para resultados locais e pendências.


Atualização posterior: usuário confirmou a instalação específica. APK atualizado
com Success e atividade iniciada com Status: ok em 30/10/2026. Abas, barra e fluxo
completo de episódios aguardam teste funcional na TV; nenhuma reprodução foi
iniciada automaticamente nesta rodada.

## Novidades do catálogo

Ordenação por inclusão de filmes/atualização de séries implementada, separada de
Histórico e aplicada dentro do menu/plataforma selecionado. Sem datas, opção
indisponível sem inferir novidades. Fixtures e builds registrados em VALIDACAO.md.
Faltam confirmar metadados da fonte real, instalar mediante confirmação e validar
navegação/ordenação no dispositivo. Cache persistente segue adiado.


Novidades: APK instalado após confirmação específica em 30/10/2026 (Success),
atividade aberta (Status: ok). Restam validar datas do provedor e a ordenação
funcional no dispositivo.

## Cache de catálogo

Implementação local iniciada em 30/10/2026: cache criptografado/paginado por lista e
tipo, validade de seis horas, dados antigos com tentativa de atualização, refresh
manual e limpeza nas configurações. Ver CACHE-TV.md. Não instalado nesta rodada.
Faltam validação de Keystore, retomada, falta de rede, cancelamento e medições no
Fire Stick. Não considerar ganho de performance comprovado apenas pelos testes Node.


Cache: versão instalada após autorização específica do usuário em 30/10/2026,
com install -r Success e atividade aberta Status: ok. Validação funcional do
cache/Keystore e medições de abertura no hardware continuam pendentes.

## Redesign integral autorizado

Todas as telas, incluindo login, reformuladas localmente. Paleta/foco/ícones
coerentes, menu pessoal mais acessível, contexto do item na grade, feedback de cache,
player protegido e rótulos no foco. Typecheck, testes e builds registrados em
VALIDACAO.md. Ainda NÃO instalado; revisão visual/D-pad/teclado em hardware pendente
até autorização específica. Próxima sessão deve capturar as telas novas e comparar
com DESIGN.md, preservando a exigência de nova confirmação a cada APK.


Redesign instalado e inspecionado no Fire Stick após autorização. Capturas mostram
bom foco/menu/player em960x540, mas botão secundário do login estava vazio. Lote
local corrige largura de texto dos botões e Voltar do formulário; precisa de nova
confirmação para instalar e validar. Revisão visual independente: fix, sem aprovação
integral. Não reenviar APK sem perguntar ao usuário.


Lote corretivo instalado após nova confirmação: botão Catálogo agora legível na
captura real e Voltar do formulário retornou ao catálogo sem reinício. App deixado
no catálogo. Cancelar durante carregamento,640x360,IME e medições seguem pendentes.


Ordenação ajustada: padrão sempre por atualização/inclusão. Removidas opções de
configurar ordenação; seção Adicionados recentemente agora combina filmes+séries,
últimos30dias, com cache/cancelamento e busca próprios. Esta rodada tem autorização
explícita para atualização sem nova pergunta; consultar VALIDACAO.md para resultado.


Atualização instalada nesta rodada sob autorização explícita sem nova pergunta.
Seção nova conferida pelo D-pad no Fire Stick:1.424itens, filmes e séries com badges.
App deixado em Adicionados recentemente; nenhum vídeo iniciado nesta rodada.

## Home solicitada

Início com os cinco atalhos indicados, fonte real/tipos disponíveis, logos locais,
retorno/foco, mesmos drawers e atalhos gerais. Grade mais espaçada e metadados
sob demanda.34testes e typecheck aprovados; resultado no aparelho em VALIDACAO.md.


Home instalada e conferida por D-pad: Netflix e Prime Video abrem seus próprios
catálogos; Voltar restaura foco na plataforma, Up alcança abas. Cinco logos visíveis,
34testes e APKs aprovados. App deixado na Home, Prime Video focado, sem reprodução.
Limites de teste em VALIDACAO.md;640x360 e perfis de fonte ausente ainda pendentes.


03/11/2026: APK com detalhes instalado no Fire Stick a pedido do usuário
(install -r Success, Activity Status: ok). Validação visual/D-pad da nova tela
ainda pendente; nenhum vídeo iniciado automaticamente.
