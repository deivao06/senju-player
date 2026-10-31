# Senju Player

Player IPTV para listas próprias M3U e Xtream Codes. Não fornece nem hospeda
canais, filmes ou séries. Monorepo pnpm, com o aplicativo web preservado e versões
para televisão em evolução. Roku e Vega OS estão fora do escopo.

## Aplicações e código compartilhado

| Diretório | Responsabilidade | Estado |
| --- | --- | --- |
| `apps/web` | React/Vite/Tailwind, proxy IPTV e persistência originais | Build validado |
| `apps/fire-tv` | React Native TV, reprodução Media3 e navegação por controle | APK de testes instalado e fluxos específicos conferidos no AFTSSS |
| `apps/smart-tv` | React DOM compartilhado entre LG webOS e Samsung Tizen | Prévia para modelos 2022+, sem validação em TV real |
| `packages/iptv` | M3U, Xtream, modelos, ordenação e regras de plataformas | Compartilhado entre as aplicações |
| `distribution/senju-player-tv` | Página pública estática de downloads e guia LG | Publicada em repositório separado |

## Desenvolvimento

Requer Node >=20.19.4 e pnpm 10.11.0. Para Fire TV, também JDK17, Android SDK/NDK e
as versões indicadas no [guia Fire TV](docs/FIRE-TV.md).

```bash
corepack enable
corepack prepare pnpm@10.11.0 --activate
pnpm install --frozen-lockfile
pnpm dev                       # web: http://localhost:5173
pnpm build                     # apps/web/dist
pnpm test                      # IPTV + Fire TV + Smart TV
pnpm tv:typecheck
pnpm smart:build
```

O web mantém os stores e comportamento originais: canais, filmes, séries/episódios
Xtream, busca, grupos, favoritos, recentes, paginação, idiomas PT/EN e persistência.
O proxy `/api-proxy` é servido pelo Vite; `vite preview` e hosting estático não
fornecem esse endpoint. Docker preserva o servidor: `docker compose up --build`.

### Fire TV / Fire OS

```bash
pnpm tv:start
pnpm tv:android
pnpm tv:apk:debug
pnpm tv:apk:sideload            # autônomo, sem Metro; assinatura de desenvolvimento
pnpm tv:apk:release             # assinatura release exige configuração própria
```

React Native TV + react-native-video/Media3, sem WebView. Home com cinco
plataformas, catálogo virtualizado, busca contextual, drawers, biblioteca pessoal,
temporadas, player com controle de progresso e avanço de episódios. Cache de
catálogo paginado e criptografado; credenciais no Keychain.

APK sideload: `apps/fire-tv/android/app/build/outputs/apk/sideload/app-sideload.apk`.
A prévia publicada tem 26,5 MiB, suporta ARM 32/64 bits e foi usada no Fire Stick
AFTSSS (Fire OS/API28). Isso não certifica todos os modelos, codecs, fluxo natural
completo de episódios, funcionamento offline ou ganhos de desempenho do cache.

### LG webOS / Samsung Tizen

```bash
pnpm smart:dev                 # http://localhost:5174
pnpm smart:build:webos         # recursos/metadados em apps/smart-tv/build/webos
pnpm smart:build:tizen         # recursos/metadados em apps/smart-tv/build/tizen
python3 apps/smart-tv/scripts/package-tizen.py  # WGT técnico SEM assinatura
```

Interface e regras compartilhadas, com AVPlay na Samsung e HTML video na LG.
Credenciais e catálogos somente na sessão. Favoritos, histórico, progresso e cache
persistente ainda não adaptados. Testes de navegador usam dados fictícios.

- **LG:** IPK de desenvolvimento gerado; exige Developer Mode e computador na mesma
  rede. Instalação e reprodução não testadas numa LG real.
- **Samsung:** WGT técnico não assinado; **não é diretamente instalável**. Faltam
  certificados apropriados, validação nas ferramentas Samsung e teste em TV real.
- Baixar arquivos por um navegador/Downloader não substitui a instalação e
  assinatura exigidas por webOS/Tizen. O APK do Fire TV não roda nesses sistemas.

Comandos, limites e ressalva da CLI LG em [SMART-TV.md](docs/SMART-TV.md).

## Downloads públicos

- [Página Senju Player TV](https://deivao06.github.io/senju-player-tv/)
- [Teste LG e instruções](https://deivao06.github.io/senju-player-tv/lg.html)
- [Releases e hashes](https://github.com/deivao06/senju-player-tv/releases)

O repositório de distribuição é `deivao06/senju-player-tv`. Os APK/IPK/WGT ficam nos
Releases, não no Git deste projeto. Certificados privados, credenciais, ferramentas
locais e capturas de dispositivo não são versionados. A chave Android debug incluída
é a chave de desenvolvimento, sem uso como assinatura de produção.

## Documentação

- [Auditoria da estrutura original](docs/AUDITORIA.md)
- [Fire TV: ambiente, builds, ADB e limitações](docs/FIRE-TV.md)
- [LG/Samsung: arquitetura, pacotes e instalação](docs/SMART-TV.md)
- [Cache do Fire TV](docs/CACHE-TV.md)
- [Pendências e estado atual](docs/TV-TODO.md)
- [Registro de validação](docs/VALIDACAO.md)
- [Identidade visual](DESIGN.md) e [contexto do produto](PRODUCT.md)

O histórico de implementação está preservado nos documentos; os resumos atuais
prevalecem sobre registros antigos de funcionalidades ainda não instaladas.
Desenvolvido originalmente como aplicativo web com Gemini CLI. O projeto declara licença MIT.
