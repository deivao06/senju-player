# Projeto
Senju Player é um monorepo pnpm para listas próprias M3U/Xtream: web preservado
em apps/web, Fire TV nativo em apps/fire-tv e LG/Samsung em apps/smart-tv.
Serviços e regras reutilizáveis em packages/iptv. Não fornece conteúdo.
Consulte README.md e docs/VALIDACAO.md para o estado atual e limites reais.

## Foco: Self-Hosted
- O projeto deve ser fácil de rodar localmente (Docker ou NPM).
- Manter o proxy funcional para evitar problemas de CORS em redes locais ou internet.

## Stack
- React
- Typescript
- Docker
- Docker Compose
- Tailwindcss

## Regras
- Utilizar código simples e limpo
- Fazer bom uso do Clean Code
- Evitar repetição de código
- Layout web responsivo

## Regras para o Gemini
- Priorize TypeScript e as stacks existentes. Kotlin é usado na integração Android/cache; Python3 somente no empacotamento técnico Samsung. Não adicionar linguagens sem necessidade.
- Mantenha a facilidade de rodar o projeto via Docker Compose
- Sempre teste a build antes de considerar que está funcionando
- Resolva os problemas de build antes de considerar que está funcionando
- Só comite e dê push quando o usuário mandar explicitamente
- Sempre tente buildar após as alterações no código
