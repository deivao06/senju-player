# Fire TV — Cinema em casa

Modo de tarefa: Operate — encontrar conteúdo e assistir. Escopo: apps/fire-tv; construção code-first escolhida pelo usuário. A referência web permanece independente.

## Composição implementada

Login: coluna de biblioteca com marca e listas salvas; formulário à direita com modos segmentados. Introdução ocupa 34%; formulário tem largura máxima 580dp. Abaixo de 430dp de altura, padding vertical cai de 28 para 14dp e cabeçalho reduz; corpo do formulário rola na altura disponível. Abaixo de 760dp de largura, intervalo entre colunas reduz. A remoção de lista fica separada da ação de abri-la.

Catálogo: navbar única com menu, marca, contexto, busca e perfil. Tipos de conteúdo e biblioteca pessoal precedem plataformas no drawer; seção Adicionados recentemente reúne filmes e séries dos últimos30dias; a ordenação das categorias é sempre por atualização/inclusão. Busca limita largura entre 145 e 240dp. Linha contextual de 34dp mantém nome do alvo e ação de favorito sem reflow da grade. Drawer mede até 320dp ou 42% da janela. Não há instrução permanente no rodapé nem botão Fechar menu à esquerda.

Player: controles flutuantes com proteção verde escura localizada, sem card geral. Legenda aparece apenas no controle focado; barra apresenta marcador, tempos e instrução contextual. Informações do conteúdo têm sua própria proteção. Não usar capturas antigas como prova dessa versão.

## Verificação e limites

Alvos lógicos de revisão: 960x540 e 640x360. Revisão estática inicial encontrou overrides de placeholder com contraste insuficiente; foram removidos, restaurando o token muted do Input. A disposição inicial recapture foi sucedida pelas verificações nativas descritas abaixo; 640x360 permanece pendente.

Documentação baseada em leitura de theme.ts, Button, Input, PlaylistSetup, CatalogScreen, CatalogMenu, CatalogCard, FocusedItemInfo, PlayerControls, PlayerControlButton e SeekBar, acrescida de HomeScreen, homePlatforms e das capturas da Home abaixo. Exemplos HTML do sidecar são somente traduções ilustrativas; não substituem React Native nem demonstram D-pad. Aprovação visual e funcional limita-se às evidências explicitamente identificadas; performance, leitura à distância e contraste em outras cenas seguem sem validação. Nenhuma instalação, acesso ADB ou nova captura foi executada nesta passagem documental.


Atualização de evidência (30/10/2026): instalação autorizada e capturas nativas reais
em960x540 inspecionadas. Revisão independente: fix, pois botão secundário do login
apareceu sem texto. Ajuste de largura e retorno pelo Voltar estão apenas locais e
exigem novo APK autorizado. Catálogo/menu/perfil/player/seek sem outro defeito
material confirmado nas capturas.640x360, teclado e outras cenas seguem pendentes.


Verificação posterior do lote corretivo (30/10/2026): instalado após nova confirmação,
botão Catálogo e retorno pelo Back comprovados em960x540 lógico por capturas nativas
e registro funcional. Revisor: ship somente para essas duas correções; Cancelar em
carregamento,640x360,IME,outras cenas e performance continuam fora do escopo validado.

## Home de plataformas

Nova composição autorizada no mesmo sistema: Início com atalhos gerais e cinco
logos locais (Netflix, Globoplay, Prime Video, Disney+ e HBO). Estados indisponíveis
refletem categorias reais da lista. Plataforma abre catálogo com abas só para tipos
existentes; Voltar retorna à Home e restaura foco. Layout de5colunas em960dp e3em640dp,
com rolagem para a segunda linha e menor altura de tile em janelas baixas. O código
usa cinco colunas a partir de860dp e três abaixo disso; tiles têm142dp de altura,
ou112dp abaixo de430dp de altura da janela. Entrada automática da lista chega à
Home; atalhos globais são Ao vivo, Filmes, Séries e Novidades. Os cinco PNG locais
somam59.119bytes, com procedência Commons nos arquivos assets/platforms/*.png.json.

Catálogo agora usa seis capas em960dp, dicas transitórias e explicação de datas sob
demanda (janela de30dias). A dica de favorito aparece uma vez por sessão durante
quatro segundos. Nenhuma animação contínua, fonte nova ou imagem remota para a Home.

Evidência atual inspecionada: `.impeccable/review/fire-tv-home.png`,
`fire-tv-home-netflix.png`, `fire-tv-home-prime.png`,
`fire-tv-home-platform-tabs.png` e `fire-tv-home-prime-return.png`, no mesmo diretório.
Capturas físicas1920x1080 correspondem a960x540 lógico: Home com as cinco marcas,
Netflix com1.963séries, Prime Video com607séries, abas Séries/Ao vivo, foco em Séries
ao pressionar Up sem abrir drawer e retorno à Home com foco no tile Prime Video.
Contagens refletem a lista capturada, não catálogo fornecido pelo Senju.

Revisor independente fresh home_finish_reviewer: SHIP somente para o escopo
capturado, sem defeito material confirmado.640x360, IME, desempenho e estado de
plataforma ausente não foram validados. Essa evidência substitui a pendência anterior
de produzir capturas da Home; não constitui aprovação geral de todas as telas.
