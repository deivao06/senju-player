---
name: Senju TV
description: Cinema em casa — interface nativa com identidade verde e foco preciso.
colors:
  background: "#060b09"
  surface: "#101b15"
  raised: "#17271e"
  stroke: "#2b4034"
  text: "#edf5ef"
  muted: "#a2b7a9"
  accent: "#34ef7d"
  onAccent: "#062012"
  focus: "#c2ffd8"
  selected: "#163b27"
  player: "#092619e8"
  button-focus: "#204c33"
  input-focus: "#172d20"
typography:
  display:
    fontSize: "32sp"
    fontWeight: 700
    lineHeight: 40
    letterSpacing: "-0.5sp"
  headline:
    fontSize: "22sp"
    fontWeight: 700
  body:
    fontSize: "14sp"
    lineHeight: 22
  label:
    fontSize: "15sp"
    fontWeight: 600
  card-title:
    fontSize: "12sp"
    fontWeight: 600
    lineHeight: 15
rounded:
  control: "10dp"
  surface: "16dp"
  card: "9dp"
  artwork: "4dp"
spacing:
  compact: "8dp"
  control: "14dp"
  panel: "18dp"
  screen: "24dp"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.onAccent}"
    rounded: "{rounded.control}"
    padding: "9dp 14dp"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "7dp 13dp"
  catalog-card:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
---
# Design System: Senju TV

## Overview

**Creative North Star: "Cinema em casa"**

Painel audiovisual doméstico: preto esverdeado, controles precisos e conteúdo em primeiro plano. A linguagem dos equipamentos de sala inspira separação tonal, espaçamento consistente e foco nítido.

Sistema nativo React Native TV, com tipografia do sistema e ícones locais; não exige novas fontes, imagens decorativas ou dependências. A documentação descreve o código atual, sem afirmar aprovação visual ou desempenho em hardware.

**Key Characteristics:**
- Identidade verde escura com acento luminoso reservado às ações.
- Contorno claro e preenchimento distinguem foco de seleção.
- Profundidade tonal, sem sombras decorativas ou blur.

## Colors

### Primary
Verde Senju (`accent`) identifica a ação principal e progresso; `onAccent` fornece texto escuro nessa ação. `focus` é o contorno luminoso; `selected` registra seleção sem competir com o alvo do controle.

### Neutral
`background`, `surface` e `raised` formam os planos verde-pretos. `text` sustenta leitura e `muted` informação auxiliar e placeholders. `stroke` separa campos; `player` protege controles sobre vídeo. Os preenchimentos `button-focus` e `input-focus` reforçam o contorno sem inverter texto para uma cor escura.

**The Focus Rule.** Foco deve combinar contorno claro e mudança de preenchimento; seleção permanece mais contida.

## Typography

Sistema sans nativo, sem família adicional carregada. Medidas tipográficas no frontmatter usam sp; dimensões de layout usam dp, não pixels físicos. A escala é contextual, sem razão matemática única. No Smart TV, `style.css` usa `--type-body`, `--type-label` e `--type-meta` sobre a mesma família.

Display serve à chamada do login; headline a títulos de painéis; body à descrição; label às ações; card-title aos nomes da grade. Botões pequenos usam 13sp/18, contexto focado 13sp/17 e dicas 11–12sp. Tempos usam 13sp/18 e números tabulares. Na tela de detalhes, o título usa 22–28sp/27–34, a sinopse 14sp/22, os metadados 12sp/17 e o texto auxiliar 13sp/19; no player, o título usa 20sp/26 e os rótulos 11–12sp. Esses valores descrevem o código atual; a leitura em TV real ainda não foi aprovada.

## Layout

Ritmo compacto, com intervalos de 8 e preenchimentos de controle de 14; superfícies maiores respiram com 18. A grade calcula dimensões a partir da janela e preserva legenda contextual de altura fixa. Controles mantêm contorno reservado em repouso para evitar reflow ao receber foco. No Smart TV, `--edge` combina `3vw` com `env(safe-area-inset-*)` como margem de segurança, e a grade passa a oito colunas em telas muito largas. Composição de telas e adaptações de janela ficam em `.impeccable/surfaces/fire-tv.md`.

## Elevation & Depth

Separação por tom e contorno, sem sombras. A proteção translúcida verde do player é localizada nos elementos sobre vídeo. A escala imediata da capa focada (1.025) reforça seleção espacial sem animação contínua obrigatória.

**The Tonal Depth Rule.** Usar superfícies e contornos para hierarquia, sem blur ou brilho decorativo.

## Shapes

Controles e campos têm cantos suaves; superfícies de formulário são mais abertas. A capa implementada tem raio 9dp, com arte interna 4dp: estes valores substituem o raio aproximado da direção inicial. Transporte usa círculos de 48dp e ação central de 60dp. Bordas de foco são geralmente 2dp; a timeline usa 1dp.

## Components

### Home platform tiles
Extensão do mesmo shell e sistema de foco: tiles com raio 12dp, padding 12dp, contorno 2dp e escala imediata 1.025 ao foco. Nome usa 14sp/600 e tipos disponíveis 10sp; estado indisponível reduz opacidade a 0.45. Os cinco logos PNG locais identificam exatamente Netflix, Globoplay, Prime Video, Disney+ e HBO. Fundos próprios das marcas ficam restritos a esses tiles, sem substituir a paleta verde global. Prime Video, Disney+ e HBO usam tint claro; Netflix e Globoplay preservam suas cores. Procedência acompanha os assets em `src/assets/platforms/*.png.json`.

Não há nova dependência, fonte ou blur. Composição, comportamento e evidência específica da Home ficam no surface brief. A aprovação capturada dessa extensão não amplia os limites de validação das outras telas.

### Buttons
Ações precisas: primário verde com texto escuro; secundário elevado; quiet transparente e alinhado à esquerda na navegação. Altura mínima padrão 46dp, pequena 40dp. Foco aplica contorno claro, preenchimento verde e texto claro; pressionado reduz opacidade a 0.75 e desabilitado a 0.4. Seleção usa tom contido. Variantes icon-only conservam rótulo assistivo.

### Inputs / Fields
Campo escuro, borda discreta, altura mínima 44dp e texto 15sp. Placeholder herda `muted`; foco usa borda clara e preenchimento próprio. Ícone opcional desloca texto à direita, sem substituir o nome assistivo. Erros de formulário têm superfície avermelhada local; não são uma segunda cor de marca.

### Cards / Containers
Capas com imagem cover e logos contain. Falha de imagem mostra iniciais; favorito usa coração sobre proteção escura. Foco adiciona borda, superfície e escala, sem alterar a célula. Nome ocupa duas linhas em altura reservada; segurar OK alterna favorito.

### Navigation
Reutiliza botão quiet pequeno, com seleção e expansão distintas do foco. Linhas de 40dp e recuo de filhos; divisores discretos separam grupos. Os rótulos de seção são auxiliares existentes, sem promovê-los a padrão decorativo obrigatório.

### Player controls / Seek bar
Transporte circular, ícones locais sem números de avanço; somente o controle focado exibe legenda. Opacidade pressionada 0.7 e desabilitada 0.35. Timeline verde com trilho claro, marcador de foco e duração tabular. Setas pré-visualizam saltos de dez segundos; OK confirma e sair descarta a prévia, conforme implementação. A legibilidade sobre vídeo exige verificação nativa.

## Do's and Don'ts

### Do:
- Do preservar o foco por contorno e preenchimento em controles e campos.
- Do usar tipografia nativa e números tabulares nos tempos.
- Do manter informação contextual em espaço reservado, sem deslocar a grade.

### Don't:
- Don't saturar todas as superfícies com verde de ação.
- Don't adicionar blur, brilho decorativo ou animação contínua.
- Don't tratar exemplos HTML do sidecar como validação do aplicativo nativo.


Verificação posterior do lote corretivo (30/10/2026): instalado após nova confirmação,
botão Catálogo e retorno pelo Back comprovados em960x540 lógico por capturas nativas
e registro funcional. Revisor: ship somente para essas duas correções; Cancelar em
carregamento,640x360,IME,outras cenas e performance continuam fora do escopo validado.
