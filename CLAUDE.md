# Landing_Page_Diagnostico (a retirar)

Desde 2026-10-24, este projecto já quase não serve para nada. A API do Mapa (`/api/mapa`) passou
para o site (`Site Celso Pereira`, `api/mapa.js`), com o código das Edge Functions do Supabase e as
migrações (`supabase/`). O Diagnóstico de Lançamento antigo (quiz, `api/lead.js`, `api/systemeio.js`,
página de privacidade) foi apagado, com o aval do Celso: o `/diagnostico` já redireccionava para o `/mapa`.

O que ainda fica aqui:
- `api/mapa.js`: a API antiga, só como recurso durante uns dias (se for preciso voltar atrás, o site
  volta a ter o rewrite `/api/mapa` → `landing-diagnostico-two.vercel.app/api/mapa`). Sai depois.
- `vercel.json`: `gestoria.pt` e `www.gestoria.pt` → `celsopereira.pt/mapa`; a raiz → `celsopereira.pt/mapa`;
  `/playbook` e `/auditoria` → `backoffice-auditoria` (por confirmar se ainda se usam).

O histórico de tudo o resto está no git deste repositório e no `memoria.md` do site.
