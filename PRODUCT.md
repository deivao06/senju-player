# Senju Player TV

<!-- impeccable:product-schema 1 -->

## Platform

android

Este registro tem como referência visual o app Android/Fire TV em `apps/fire-tv`.
O monorepo também inclui o web preservado, a adaptação React DOM LG/Samsung em
`apps/smart-tv` e a página de distribuição em `distribution/senju-player-tv`.
Cada superfície possui seu próprio escopo e evidências de validação.

## Users

Pessoas assistindo em televisores com Amazon Fire TV Stick e Fire OS, usando
controle remoto D-pad. O usuário relata TV pequena e quer aproveitar espaço sem
perder conforto de leitura à distância. Modelo de teste identificado: AFTSSS,
Android 9/API28, sistema ARM de 32 bits.

## Product Purpose

Player IPTV para listas próprias M3U e Xtream Codes: encontrar canais, filmes e
séries e assistir com reprodução nativa. O Senju não fornece nem hospeda conteúdo.

## Operating Context

Navegação pelo controle, botão central e Voltar. Interface de TV, com catálogos
extensos, categorias/plataformas no drawer esquerdo e opções da lista à direita.
Uma lista salva pode ser aberta automaticamente. O usuário autoriza implementação
local. Instalações na televisão devem respeitar a autorização vigente do usuário;
a autorização posterior dispensou nova pergunta para as atualizações daquela
etapa. Não interromper uso do aparelho sem autorização no contexto da tarefa.

## Capabilities and Constraints

React Native TV e react-native-video/Media3 existentes; sem WebView. Preservar M3U,
Xtream, busca contextual, favoritos, histórico, temporadas, progresso e avanço
manual/automático de episódios. Cache de catálogo criptografado já implementado;
validação de desempenho e ciclo completo em hardware ainda pendentes. Não adicionar
backend, pagamentos, Roku, Vega OS, serviços externos ou conteúdo comercial.
Não descartar alterações locais. Commits e pushes somente quando solicitados
pelo usuário. Não publicar credenciais, chaves privadas ou dados de listas.

## Brand Commitments

Nome Senju Player, identidade verde escura. O usuário quer player translúcido ainda
verde, ícones de avanço sem números e foco claramente visível. Quer uma reformulação
mais bonita em todas as telas, incluindo login, conforme autorização atual.
Navbar com menu, nome do app, contexto, busca e perfil. Tipos de conteúdo no drawer.
Sem rodapé persistente de instruções do controle e sem botão Fechar menu à esquerda.

## Product Principles

- Navegar e reproduzir rapidamente em hardware limitado.
- Clareza do foco e restauração previsível do contexto.
- Densidade útil com leitura confortável, evitando informação permanente desnecessária.
- Reaproveitar código e componentes existentes sem duplicar serviços IPTV.
- Informar limitações reais e distinguir testes locais de validação em dispositivo.

## Evidence on Hand

Fonte nativa em `apps/fire-tv/src`; capturas antigas em `apps/fire-tv/build` não
validam as versões posteriores. Capturas atuais de fluxos específicos ficam em
`.impeccable/review` (ignorado pelo Git), com escopo em `docs/VALIDACAO.md`.
Smart TV passou em testes Chromium com fixtures; nenhuma LG/Samsung real foi
validada. O IPK LG é de desenvolvimento; o WGT Samsung não tem assinatura.
Página pública e arquivos de release foram verificados por HTTP/hash.

## Accessibility & Inclusion

D-pad, seleção e Voltar devem alcançar todas as ações. Foco deve ser reconhecível
por mais de uma pista visual. Rótulos assistivos, contraste e leitura à distância
são requisitos da experiência de TV. Evitar efeitos e animações que prejudiquem
resposta do controle ou consumam recursos sem utilidade.

## Home confirmada pelo usuário

A lista abre em uma Home de plataformas com somente Netflix, Globoplay, Prime Video,
Disney+ e HBO. Os atalhos levam ao catálogo da fonte, não aos aplicativos externos.
Plataformas ausentes não devem apresentar conteúdo inventado. Atalhos gerais e
perfil continuam disponíveis. Construção direta em código permanece a preferência.
