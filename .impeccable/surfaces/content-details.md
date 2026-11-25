# Fire TV — Detalhes de filmes e séries

Modo: Operate — escolher um título, entender o conteúdo e assistir. Escopo nativo
em `apps/fire-tv`, com metadados do serviço compartilhado em `packages/iptv`.
Extensão do mundo verde Senju definido em `DESIGN.md`; não altera o sistema global.

## Composição implementada

Composição fixada pelo usuário: pôster, título, sinopse fornecida pela lista e
backdrop opcional; temporadas e episódios ficam abaixo. Navbar reúne Voltar,
marca e contexto. O hero usa capa à esquerda e texto/ações à direita, com proteção
escura sobre o backdrop. Assistir/Continuar é a ação principal, acompanhada de
favorito e Sinopse. Filmes passam por esta tela antes da reprodução; canais
continuam abrindo diretamente no player.

Filmes usam pôster de 150×225dp e hero com altura mínima de 70% da janela;
séries usam 120×180dp. Abaixo de 430dp de altura, capa cai para 88×132dp,
título para 20sp e sinopse para duas linhas. Temporadas rolam horizontalmente;
episódios da temporada selecionada formam linhas verticais virtualizadas via
FlatList, de 98dp ou 82dp na composição compacta. Cada linha apresenta número,
imagem, título e, quando disponíveis, sinopse, duração e indicação de progresso.
Foco combina contorno claro e preenchimento, conforme o sistema existente.

## Conteúdo, estados e navegação

Somente dados da fonte: Xtream fornece detalhes de filme/série pelo serviço
compartilhado; M3U conserva os dados disponíveis no item. Nome e capa podem cair
para o catálogo; imagem ausente ou inválida apresenta placeholder, e backdrop
ausente é omitido. Metadados opcionais não são inventados. A falta de sinopse
é explicada no próprio hero. Há carregamento, erro com Tentar novamente e estado
de série sem episódios. Falha ao obter detalhes de filme preserva a reprodução
quando existe URL; séries Xtream dependem dos episódios carregados.

Sinopse abre painel com texto integral e créditos disponíveis. O código prende
o foco no painel, oferece controles explícitos para rolar e retorna ao botão
Sinopse ao fechar ou pressionar Voltar. Temporadas filtram apenas a apresentação:
a fila de reprodução conserva todos os episódios ordenados da série, permitindo
avanço manual e automático entre temporadas. Continuar usa o episódio recente
com progresso válido, ou o primeiro episódio; filmes usam seu próprio progresso.
Favorito pertence ao título. O código registra foco e restaura o episódio e sua
temporada ao voltar do player; sair dos detalhes retorna ao contexto do catálogo.

## Evidência e pendências

Leitura de fonte: `ContentDetailsScreen.tsx`, `contentDetails.ts`, `App.tsx` e
`packages/iptv/src/XtreamService.ts`, confrontada com `DESIGN.md` e `PRODUCT.md`.
Verificação reportada nesta implementação: 47 testes aprovados (10 IPTV,
24 runtime, 6 cache e 7 smart TV), typecheck e builds web/smart TV aprovados.
APK sideload compilado (BUILD SUCCESSFUL), assinatura e alinhamento verificados. Revisão independente de
fonte levou à correção do foco da sinopse; isso não constitui aprovação visual.

Sem novas capturas desta tela e sem teste nativo de foco. Permanecem pendentes
inspeção em 960×540 e 640×360 lógico, D-pad/Voltar e restauração
de foco no aparelho, legibilidade à distância e desempenho com séries extensas.
Capturas e aprovações anteriores da Home não validam esta superfície.
