# Diagnóstico de Leads — Celso Pereira

## O que é este projecto
Landing page de diagnóstico self-serve para o Sistema de Leads Qualificadas.
Uma página HTML/CSS/JS estática, sem framework, compatível com Lovable.dev.

## Stack
- HTML5 semântico
- CSS com variáveis custom (tokens de marca definidos abaixo)
- JavaScript vanilla (sem React, sem Vue)
- Fontes: Lora + Work Sans via Google Fonts · Gloock para logo
- Ícones: Lucide (CDN)
- Embed: Calendly inline widget

## Tokens de marca
--forest: #2C3E2D
--cream: #F5F0E8
--ink: #1A1A1A
--terracotta: #8B6F47
--forest-mid: #4A6741
--sand: #C8B89A
--beige: #E8DDD0
--ink-deep: #0D0D0D
--fg-muted: #5A5A5A

## Voz e língua
Português de Portugal absoluto. Nunca PT-BR.
Frases curtas. Zero "incrível", "transformacional", "amigas".

## Estrutura da página (ordem)
1. Hero — fundo forest + padrão diagonal
2. AuthorityStrip — prova social mínima
3. GapsPreview — 3 gaps com dados
4. DiagnosticQuiz — 9 perguntas, 1 por vez, step-by-step
5. DiagnosticReport — relatório condicional pós-submit
6. CalendlySection — embed inline
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
