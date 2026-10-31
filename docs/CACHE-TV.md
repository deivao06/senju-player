# Cache de catálogo no Fire TV

Implementação local de 30/10/2026. Instalação depende de confirmação específica do
usuário. Compilação/testes locais não comprovam funcionamento ou ganho no aparelho.

## Comportamento

- Primeiro acesso sem cache: consulta o provedor e mostra o catálogo; salva em segundo
  plano enquanto o catálogo já está navegável. Trocar de lista/tipo cancela trabalho obsoleto.
- Cache com menos de seis horas: lê o armazenamento local, sem autenticação/consulta
  do catálogo ao provedor nessa abertura. Imagens e reprodução continuam usando rede.
- Cache com seis horas ou mais: mostra o catálogo salvo e tenta atualizar em segundo
  plano. Se a rede/autenticação falhar, mantém o salvo e apresenta aviso. Não concede
  acesso a streams de uma conta expirada e não baixa vídeos.
- Validade verificada na abertura/seleção de tipo; não há polling nem timer durante
  a reprodução. Tipos já carregados e recentes ficam em memória.
- Perfil → Atualizar catálogo: ignora cache e consulta a fonte. Mantém catálogo/cache
  anteriores em caso de falha; uma atualização não fecha um vídeo aberto durante a consulta.
- Perfil informa a data do snapshot salvo do tipo atual. Configurações → Limpar cache
  dos catálogos remove somente os arquivos; listas, favoritos e progresso permanecem.
  O catálogo aberto continua em memória até atualização ou reinício.
- Remover uma lista também tenta remover seu cache. Falha de limpeza é informada.
- Xtream: snapshots independentes de canais, filmes e séries; só baixa o tipo solicitado.
  As categorias dos outros tipos são preservadas no snapshot para organizar o drawer.
- M3U: snapshot único com o catálogo completo, já que a origem é uma playlist única.
- Episódios/detalhes de séries ainda são consultados ao abrir a série. Cache de vídeo,
  download offline, cache adicional de imagens e sincronização remota estão fora desta etapa.

## Armazenamento e desempenho

Catálogos grandes não usam AsyncStorage: na versão instalada, Android tem limite
padrão total de 6 MB e limite por entrada de aproximadamente 2 MB. Favoritos/progresso
continuam no mecanismo existente. Credenciais de listas continuam no Keychain.

O módulo Android local SenjuCatalogCache usa cacheDir privado, GZIP e AES-256-GCM,
com chave gerada no Android Keystore, sem autenticação interativa exigida. Não depende
Google Play Services nem grava URLs/tokens/credenciais em texto puro no disco ou logs.
Diretórios usam SHA-256 de lista/identidade da fonte/tipo; mudar credenciais muda a
identidade do snapshot. Metadados e páginas são criptografados. Cada página tem nonce
novo e AAD com lista, identidade, geração e número da página para evitar troca entre
snapshots. Android pode remover cacheDir sob pressão de espaço; isso vira cache miss.

JSON é serializado/validado em páginas de até 500 itens, com pausas entre páginas
para devolver execução ao JS. Compressão, criptografia e disco usam executor nativo
serial fora da thread da interface. Não duplica todo o catálogo em um JSON gigante.
O array de itens completo ainda precisa ficar na memória para filtros/grade existentes;
a mudança não transforma o catálogo em banco de dados paginado.

Cada gravação usa diretório temporário e publica o snapshot completo por ponteiro
AtomicFile só depois das páginas e manifesto. Uma gravação interrompida/cancelada
não publica catálogo parcial. Leituras mantêm referência à geração até terminar.
Versão, contagem, tipos e grupos são validados; falhas de leitura recuperam pela rede.
Falha ao salvar avisa sem impedir navegação. Cache é descartável, não backup.

Limites: 2 MiB por página/manifesto, 64 MiB de JSON por snapshot e alvo de 96 MiB no
conjunto comprimido/criptografado, removendo os menos usados. Escritas temporárias e
snapshots fixados por uma leitura podem exceder o alvo temporariamente. Há reserva
mínima de 8 MiB de espaço livre para páginas. Se exceder limite ou houver problema
com disco/Keystore, mantém o catálogo funcionando pela rede e apresenta aviso.

## Validação

Testes TS usam armazenamento simulado para exercitar paginação (45.001 itens, >6 MiB),
catálogo vazio, isolamento por conta/credenciais/tipo, snapshot M3U completo, fronteira
de seis horas, gravação interrompida, cancelamento, esquema inválido/corrompido,
páginas ausentes e limpeza isolada/global. Não simulam o Android Keystore.

Roteiro no Fire Stick após instalação autorizada:
1. Abrir cada tipo uma vez, aguardar data de cache no perfil.
2. Encerrar e reabrir o app; medir tempo até catálogo e memória; confirmar cache local.
3. Abrir Filmes/Séries e verificar imagens, categorias, novidades e busca.
4. Testar sem rede: catálogo salvo aparece; reprodução não é offline.
5. Atualizar catálogo; conferir que data muda e falha de rede mantém itens anteriores.
6. Testar cache antigo, cancelamento, troca de listas, remoção e limpeza nas configurações.
7. Confirmar criptografia/ausência de URLs legíveis nos arquivos, isolamento das fontes
   e recuperação de arquivos ausentes/corrompidos sem registrar conteúdo sensível.

## Referências oficiais

- https://react-native-async-storage.github.io/2.0/advanced/Limits/
- https://developer.android.com/privacy-and-security/cryptography
- https://developer.android.com/privacy-and-security/keystore
- https://developer.android.com/reference/android/util/AtomicFile
- https://developer.android.com/training/data-storage/app-specific
- https://reactnative.dev/docs/0.81/legacy/native-modules-android

A integração usa módulo legado porque o projeto existente tem newArchEnabled=false.
Nenhuma dependência de runtime foi adicionada. O código web não utiliza esse cache.
