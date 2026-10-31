# Auditoria inicial — 27/10/2026

Git inicialmente limpo; sem AGENTS.md. README e GEMINI.md lidos. Nenhum teste ou CI existente.

## Estado original

Aplicação única na raiz: React 19.2, TypeScript 5.9, Vite 6, Tailwind 4, Zustand 5.
App.tsx concentra autenticação, catálogo paginado, filtros, busca e navegação por estado
(react-router-dom está instalado, mas não participa do fluxo). Componentes DOM para cartões,
listas salvas, detalhes de séries e vídeo. Identidade: fundo escuro, verde #2ecc71.

M3UParserService usa axios + iptv-playlist-parser 0.15.2, classifica por palavras em grupo/nome.
XtreamService autentica, normaliza arrays/objetos, busca categorias, canais .ts, filmes por
container e séries/episódios. Catálogos Xtream carregados em paralelo por tipo na store web.
Serviços importam getProxyUrl, acoplado a import.meta.env e window.location.

Persistência web: IndexedDB/idb-keyval guarda catálogo, credenciais, favoritos e seis recentes;
localStorage guarda contas (incluindo senhas) e idioma. Não existe progresso de reprodução.
HLS.js, MPEGTS.js, HTMLVideoElement, React DOM, lucide-react, Tailwind e IndexedDB não são
reutilizáveis como interface/player nativo. Stores existentes dependem da persistência web.
O parser instalado não usa DOM nem APIs nativas Node na execução, mas modifica String.prototype
e materializa toda a playlist: risco conhecido para listas grandes; validar bundle Metro.

Proxy é plugin do servidor Vite (inclusive Docker), ausente no preview/hosting estático.
Logs originais do proxy/axios podem expor tokens. Não há backend obrigatório para TV: acesso
direto aos provedores evita CORS e proxy. Não compartilhar componentes DOM.

## Decisão mínima

pnpm workspaces, apps/web, apps/fire-tv e somente packages/iptv para entidades e serviços
existentes com transporte injetado. Sem core/shared vazios, sem apps futuros.
Manter stores e UX web; wrappers preservam assinaturas e proxy. Native usa fetch cancelável,
React Native TV + react-native-video/Media3, estado local por composição, listas virtualizadas.
Credenciais TV no Android Keystore via react-native-keychain, sem backend/sincronização.

## Riscos e baseline

Build original `npm run build` aprovado (Vite 6.4.1), bundle JS ~1.24 MB com aviso >500 kB.
`npm ci` reportou 16 vulnerabilidades (1 baixa, 3 moderadas, 12 altas); não executar atualização
major automática durante migração. Separar correção de dependências de mudanças funcionais.
Shell inicialmente sem Node/JDK/SDK/ADB; Node instalado temporariamente em /tmp para validar.
Dispositivo desconhecido: não é possível garantir codecs, Fire OS ou ABI. Base RN 0.81 tem
minSdk 24: Fire OS 5/API22 excluído; Fire OS 6/API25 ou superior é requisito, não validação.
