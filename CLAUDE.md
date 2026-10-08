# Diagnóstico de Lançamento — Celso Pereira

## O que é este projecto
Landing page de diagnóstico self-serve para o **Sistema de Lançamento com IA**.
Descobre quanto o especialista deixa em cima da mesa em cada lançamento (a conta:
potencial da lista × conversão × preço, menos o último lançamento) e agenda um
Diagnóstico de Lançamento. Página HTML/CSS/JS estática, sem framework.

> Reposicionada em 2026-07-23: de "Sistema de Leads Qualificadas" (coaches) para
> "Sistema de Lançamento com IA" (especialistas com audiência). A lógica autoritativa
> vive em `quiz.js`.

## Stack
- HTML5 semântico
- CSS com variáveis custom (tokens de marca definidos abaixo)
- JavaScript vanilla (sem React, sem Vue)
- Fontes: Lora + Work Sans · Gloock para logo · IBM Plex Mono, self-hosted em
  `fonts/` e declaradas no `fonts.css` local (sem Google Fonts)
- Ícones: Lucide em **SVG inline** no HTML (desde 2026-09-30). Sem CDN nem biblioteca:
  o `unpkg.com/lucide@latest` saiu (versão não fixa, 663 KB, e um pedido a terceiros sem
  consentimento). Ícone novo → copiar o `<svg>` do lucide.dev (stroke 2, `currentColor`),
  com a classe do componente e `aria-hidden="true" focusable="false"`. O `quiz.js` não
  cria ícones; se passar a criar, vão como SVG na string do template.
- Agendamento: Cal.com (`https://cal.com/celso-pereira/diagnostico`), aberto num
  separador novo pelo botão `#ctaMarcacao` do relatório, com `name` e `email`
  pré-preenchidos. Sem widget embebido.
- WhatsApp no fim do relatório: **opcional de verdade** (desde 2026-09-29). O botão
  `#ctaMarcacao` está sempre activo e abre sempre o Cal.com; não há bloqueio nem nota.
  O número grava-se uma vez (acção `whatsapp`), no blur do campo ou no clique do CTA,
  o que vier primeiro (o Safari não tira o foco do campo ao clicar num botão).

## Domínios — REGRA
> Desde 2026-09-29.

- **A casa da página é `https://celsopereira.pt/diagnostico/`.** O site principal serve-a
  por proxy a partir de `landing-diagnostico-two.vercel.app`.
- **`gestoria.pt` e `www.gestoria.pt` redireccionam (308)** para
  `https://celsopereira.pt/mapa`, qualquer que seja o caminho (inclui `/api/*`).
  Está no `vercel.json` (`redirects` com `has` `type: "host"`). O redirect só depende do
  host, por isso não toca nos pedidos que chegam por `landing-diagnostico-two.vercel.app`.
  **Nunca** trocar para um redirect sem `has`: partia o `/diagnostico/` do site principal.
- **Canonical:** a página responde em celsopereira.pt/diagnostico/ e em
  `landing-diagnostico-two.vercel.app`. Para o Google não indexar o endereço da Vercel,
  o `index.html` tem `<link rel="canonical" href="https://celsopereira.pt/diagnostico/">`
  e o `privacidade.html` aponta para `https://celsopereira.pt/privacidade` (a página do
  site principal, de onde o texto é copiado). Página nova → canonical absoluto em celsopereira.pt.

## Open Graph e SEO — REGRA
> Desde 2026-09-30 (auditoria de SEO do site principal).

- **Open Graph e Twitter no `index.html`:** `og:title` e `og:description` iguais ao `<title>`
  e à meta description (se um mudar, muda o outro); `og:url` = canonical
  (`https://celsopereira.pt/diagnostico/`); `og:image` = `https://celsopereira.pt/og.jpg`
  (1200×630, do site principal); `og:locale pt_PT`, `og:site_name "Celso Pereira"`,
  `og:type website`, `twitter:card summary_large_image`. URLs sempre absolutos em celsopereira.pt.
- **Nunca `X-Robots-Tag`/`noindex` neste projecto** (nem por host): o `/diagnostico/` de
  celsopereira.pt é um proxy desta página e o cabeçalho passava para lá. O canonical chega.
- **`apple-touch-icon.png`** (180×180) é cópia do `public/apple-touch-icon.png` do site principal.
- **FAQ sem `<dl>`:** os `<details>` vivem num `<div class="faq__list">`; a resposta é `<div>`.
- **Barra de progresso do quiz:** `role="progressbar"` com `aria-label`; o `quiz.js`
  (`setProgressValue`) actualiza `aria-valuenow` e `aria-valuetext`.

## Registo visual — ESCURO-QUENTE
> Re-vestido em 2026-09-20: de claro-quente para escuro-quente, para condizer com o
> site principal celsopereira.pt. A lógica do quiz (`quiz.js`), o agendamento, o tracking
> e o backend `api/` NÃO mudaram — só o visual (`styles.css` / `index.html`).
> A fonte de verdade dos tokens é o `styles.css`.

## Tokens de marca (escuro-quente)
Paleta literal:
--forest: #2C3E2D · --cream: #F5F0E8 · --ink: #1A1A1A · --terracotta: #8B6F47
--forest-mid: #4A6741 · --sand: #C8B89A · --beige: #E8DDD0 · --ink-deep: #0D0D0D

Aplicação (o que importa):
--bg: var(--ink-deep)   /* fundo base escuro */
--surface: var(--ink)   /* cartões / superfícies */
--fg: var(--cream)      /* texto principal */
--fg-muted: #A6A39E     /* texto secundário */
--fg-meta: #86837F      /* meta / labels */
--accent: var(--sand)   /* eyebrows, palavra-chave, links, ícones */
--cta: var(--terracotta) /* botões — texto cream, nunca forest como botão */

Regras:
- Fundo escuro sólido + brilho forest subtil (`--glow-forest`). SEM riscas diagonais.
- No máximo UMA secção cream em toda a página.
- Terracotta nunca em texto pequeno nem sobre forest; para score/estados usar as
  variantes claras (`--terracotta-lit`, `--forest-lit`, `--amber-lit`).
- Títulos Lora · corpo Work Sans · labels/números do relatório em mono.

## Consentimento de cookies — REGRA
> Desde 2026-09-28. Alinhado com o site principal (`src/scripts/consentimento.ts` em celsopereira.pt).

- **Nenhum script de marketing ou análise carrega sem consentimento.** O Meta Pixel vive em
  `pixel.js` e só carrega dentro de `cpConsentimento.quandoConsentir('marketing', …)`.
  Nunca pôr o código do Pixel inline no `<head>`, e **nunca o `<noscript>`** do Pixel
  (dispara sem JavaScript e sem consentimento).
- **`window.fbq` só existe depois de aceitar.** Qualquer chamada nova a `fbq` passa pelo
  `track()` do `tracking.js`, que também confirma `cpConsentimento.obter().marketing`.
- **Recusar depois de aceitar** chama `fbq('consent', 'revoke')` e apaga `_fbp` e `_fbc` no
  domínio actual e nos domínios acima (a Meta grava-os no domínio pai). Voltar a aceitar na
  mesma visita chama `fbq('consent', 'grant')`. (O site principal ainda não faz isto.)
- **A mesma chave que o site principal:** `localStorage` `cp-consentimento`, com
  `{ marketing, analise, data (ISO), versao: 1 }`, válido 12 meses. Em
  celsopereira.pt/diagnostico/ a escolha é partilhada com o site; no `*.vercel.app` o
  domínio é outro e o banner volta a perguntar (gestoria.pt já não serve a página, redirecciona).
- **Banner** (`consentimento.js` + CSS `.banner-cookies` no `styles.css`): barra fixa em baixo,
  não modal, ink com hairline sand. "Aceitar" e "Recusar" com exactamente o mesmo estilo
  (ghost, nunca terracotta). Texto do `specs/conteudo.md` do site principal, secção BANNER DE
  COOKIES, versão "só com Meta Pixel". Se entrar GA4: acrescentar `'analise'` a
  `CATEGORIAS_ACTIVAS` e trocar para o texto "se também houver GA4".
- **Rodapé:** "Política de privacidade" → `/privacidade` (absoluto: em celsopereira.pt abre a
  página do site principal) · "Preferências de cookies" (`data-cookies-abrir`, reabre o banner).
- **`privacidade.html`** é cópia do texto da `/privacidade` do site principal (`conteudo.md`).
  Se o texto lá mudar, muda aqui também.

## Mapa de automação (celsopereira.pt/mapa) — desde 2026-10-08
- O `/diagnostico` deixou de ser servido em celsopereira.pt: redirecciona para `/mapa`, que é
  página do site principal (Astro). Este projecto só fornece o servidor: `api/mapa.js`, chamado
  por rewrite `celsopereira.pt/api/mapa` → `/api/mapa`.
- `api/mapa.js` grava em `public.mapas` (projecto Supabase Claude) e, se o email for novo, cria a
  lead em `public.leads` com `origem = 'mapa'`. Sem `consentimento: true`, recusa. Os totais são
  recalculados aqui: a conta tem de bater com `src/scripts/mapa-calculo.ts` do site.
- O mapa **não** vai para o systeme.io (o consentimento não cobre listas de email).
- `gestoria.pt` redirecciona agora para `https://celsopereira.pt/mapa`.

## Leads — REGRA
> Desde 2026-09-28. As leads vão para `public.leads` do projecto Supabase **Claude**,
> sempre pelo servidor.

- **O browser nunca fala com o Supabase.** Nenhuma chave do Supabase (nem a pública)
  no front-end. O `quiz.js` chama `API_BASE + '/lead'` e `API_BASE + '/systemeio'`.
- **`API_BASE` e não um caminho fixo.** Em celsopereira.pt a página vive em `/diagnostico/`
  (`/diagnostico/api`); no `*.vercel.app` vive na raiz (`/api`). (Em gestoria.pt também
  vivia na raiz até 2026-09-29; agora esse domínio redirecciona, ver Domínios.)
  Um caminho fixo `/diagnostico/api/...` dá 404 fora de celsopereira.pt (foi o que partiu
  as leads de gestoria.pt para o systeme.io a partir de 2026-09-20).
- **`api/lead.js`** (Vercel serverless) lê `LEADS_SUPABASE_URL` e `LEADS_SUPABASE_SECRET`
  do ambiente, valida tudo no servidor e grava com `origem: 'diagnostico'`: nome, email,
  respostas (jsonb, P1 a P9), score, categoria, gap_lancamento, anti_fit.
  Upsert pelo email (índice único em `lower(email)`). Responde só `{ok:true}` / `{ok:false}`
  e rejeita corpos > 10 KB.
- **Anti-fit também fica guardada** (`anti_fit: true`, para a fase "Nutrir 90 dias"), mas
  **não vai para o systeme.io**: fica fora das sequências de email até decisão em contrário.
- **Acção `whatsapp`:** só junta o número se a lead ainda não tiver WhatsApp e tiver sido
  actualizada na última hora. Responde **sempre** `200 {ok:true}` (com email e número válidos),
  haja ou não lead, para não revelar que emails estão na tabela.
- **WhatsApp gravado em formato internacional** (`+351912345678`, igual ao que a Laura recebe
  no WhatsApp), nas duas acções: 9 dígitos a começar por 9 ou 2 → acrescenta `+351`;
  `00` inicial → `+`; já com `+` fica. Outros formatos sem `+` gravam-se como vieram.
- **`api/systemeio.js`** valida da mesma forma (JSON ≤ 10 KB, email válido, nome ≤ 120,
  só os 4 campos `quiz_*` e a tag `Lista_Celso`). Inválido → `400 {ok:false}` sem chamar o
  systeme.io. Se o quiz passar a enviar outro campo ou tag, acrescenta-o lá.
- **Se mudares as opções de uma pergunta no `quiz.js`**, muda também `RESPOSTAS_VALIDAS`
  no `api/lead.js`, senão o servidor rejeita a lead.
- Já não há `config.js` nem `build.js`: a página não tem passo de build.

## Voz e língua
Português de Portugal absoluto. Nunca PT-BR.
Frases curtas. Zero "incrível", "transformacional", "amigas".

## Estrutura da página (ordem)
1. Hero — fundo escuro + brilho forest ("quanto deixas na mesa por lançamento")
2. AuthorityStrip — prova social mínima (funis/lançamentos em 5 nichos)
3. GapsPreview — 3 falhas de lançamento (aquecimento, sequência, sistema vs à mão)
4. DiagnosticQuiz — 9 perguntas sobre o lançamento, 1 por vez
5. DiagnosticReport — score de prontidão + gap por lançamento + 3 falhas + CTA
   "Diagnóstico de Lançamento · 30 min" (abre o Cal.com)
6. Testemunhos
7. FaqSection — accordion, 5 perguntas
8. FooterMinimal

## Ficheiros
- index.html (página completa)
- styles.css (todos os estilos) · fonts.css (fontes self-hosted)
- quiz.js (lógica do quiz, score, relatório condicional, CTA do Cal.com)
- tracking.js (`track()`: Plausible se existir + Meta Pixel com consentimento;
  `marcacao_cta_click` → `Contact`)
- consentimento.js · pixel.js · privacidade.html · api/
