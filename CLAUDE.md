# Diagnóstico de Lançamento — Celso Pereira

## O que é este projecto
Landing page de diagnóstico self-serve para o **Sistema de Lançamento com IA**.
Descobre quanto o especialista deixa em cima da mesa em cada lançamento (a conta:
potencial da lista × conversão × preço, menos o último lançamento) e agenda um
Diagnóstico de Lançamento. Página HTML/CSS/JS estática, sem framework.

> Reposicionada em 2026-07-23: de "Sistema de Leads Qualificadas" (coaches) para
> "Sistema de Lançamento com IA" (especialistas com audiência). A lógica autoritativa
> vive em `quiz.js`. O `SPEC.md` descreve a versão antiga e está desactualizado.

## Stack
- HTML5 semântico
- CSS com variáveis custom (tokens de marca definidos abaixo)
- JavaScript vanilla (sem React, sem Vue)
- Fontes: Lora + Work Sans via Google Fonts · Gloock para logo
  - (No site principal celsopereira.pt as fontes são self-hosted via Fontsource. Aqui ainda são CDN — alinhar quando houver tempo, não é bloqueante.)
- Ícones: Lucide (CDN)
- Embed: Calendly inline widget

## Registo visual — ESCURO-QUENTE
> Re-vestido em 2026-09-20: de claro-quente para escuro-quente, para condizer com o
> site principal celsopereira.pt. A lógica do quiz (`quiz.js`), o Calendly, o tracking
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

## Voz e língua
Português de Portugal absoluto. Nunca PT-BR.
Frases curtas. Zero "incrível", "transformacional", "amigas".

## Estrutura da página (ordem)
1. Hero — fundo escuro + brilho forest ("quanto deixas na mesa por lançamento")
2. AuthorityStrip — prova social mínima (funis/lançamentos em 5 nichos)
3. GapsPreview — 3 falhas de lançamento (aquecimento, sequência, sistema vs à mão)
4. DiagnosticQuiz — 9 perguntas sobre o lançamento, 1 por vez
5. DiagnosticReport — score de prontidão + gap por lançamento + 3 falhas
6. CalendlySection — CTA "Diagnóstico de Lançamento — 30 min"
7. FaqSection — accordion, 5 perguntas
8. FooterMinimal

## Ficheiros a criar
- index.html (página completa)
- styles.css (todos os estilos)
- quiz.js (lógica do quiz, score, relatório condicional)
- tracking.js (eventos Plausible/PostHog)

## Referência completa
Ver SPEC.md para copy completo, lógica de score, textos condicionais do relatório,
pseudo-código do quiz e especificações visuais por componente.
