# SPEC.md — Diagnóstico de Leads · Celso Pereira
> Documento de referência completo para o Claude Code.
> Gerado em sessão de trabalho com o Celso Pereira.
> Português de Portugal absoluto. Nunca PT-BR.

---

## TOKENS DE MARCA

```css
--forest:     #2C3E2D
--cream:      #F5F0E8
--ink:        #1A1A1A
--terracotta: #8B6F47
--forest-mid: #4A6741
--sand:       #C8B89A
--beige:      #E8DDD0
--ink-deep:   #0D0D0D
--fg-muted:   #5A5A5A
--border:     rgba(200,184,154,0.5)

--font-logo:    'Gloock', serif
--font-serif:   'Lora', Georgia, serif
--font-sans:    'Work Sans', sans-serif
--font-caption: 'Instrument Sans', sans-serif

--r-md: 14px
--r-sm: 8px
--sh-1: 0 1px 2px rgba(26,26,26,0.06)
--sh-2: 0 4px 12px rgba(26,26,26,0.08)

--diagonal-pattern: repeating-linear-gradient(
  135deg, transparent 0, transparent 18px,
  rgba(245,240,232,0.035) 18px, rgba(245,240,232,0.035) 19px
)
```

---

## ARQUITECTURA — 8 SECÇÕES (ordem final)

```
1. Hero                          id: hero
2. AuthorityStrip                id: authority
3. GapsPreview                   id: gaps
4. DiagnosticQuiz                id: quiz
5. DiagnosticReport              id: report   (aparece pós-submit, mesma página)
6. CalendlySection               id: calendly
7. FaqSection                    id: faq
8. FooterMinimal                 id: footer
```

---

## SECÇÃO 1 — HERO

**Fundo:** `--forest` + `--diagonal-pattern`
**Padding:** 80px top/bottom desktop · 56px mobile

### Componentes

```
[eyebrow]
  conteúdo:   "DIAGNÓSTICO GRATUITO · 90 SEGUNDOS"
  font:       Work Sans 700, 11px, uppercase, letter-spacing 0.12em
  cor:        --sand

[divider]
  48px × 2px, --terracotta, margin 16px 0

[h1]
  conteúdo:   "O teu próximo cliente já entrou em contacto contigo.
               Só não sabes quem foi."
  font:       Lora Bold Italic, clamp(28px, 4vw, 42px)
  cor:        --cream, line-height 1.15

[subtítulo]
  conteúdo:   "A maior parte dos leads não diz adeus. Simplesmente
               deixa de responder. Este diagnóstico identifica onde
               o teu funil tem fugas — e quanto te estão a custar
               por mês."
  font:       Work Sans 400, 16px
  cor:        rgba(245,240,232,0.85), max-width 560px

[CTA]
  label:      "Descobre os teus 3 gaps →"
  estilo:     botão terracotta, 48px height, border-radius 999px
  href:       âncora #quiz
  margin-top: 32px
```

**Mobile:** H1 máx 32px. CTA full-width abaixo de 480px.
**Tracking:** `hero_cta_click`

---

## SECÇÃO 2 — AUTHORITY STRIP

**Fundo:** `--cream`
**Separador:** linha 1px `--border` acima e abaixo

### Componentes

```
[eyebrow]
  conteúdo:   "QUEM FAZ ESTE DIAGNÓSTICO"
  font:       Work Sans 700, 11px, uppercase
  cor:        --fg-muted

[corpo]
  conteúdo:   "Sou o Celso Pereira. Nos últimos 7 anos construí
               sistemas de captação e follow-up para empreendedores
               em terapias, coaching, finanças, línguas e
               alimentação saudável.

               O padrão que vi repetir-se em quase todos os casos:
               a oferta era boa. O problema estava no que acontecia
               depois do primeiro contacto."
  font:       Work Sans 400, 15px, --ink, line-height 1.6

[tags]
  conteúdo:   "Terapias · Coaching · Finanças · Línguas · Alimentação"
  estilo:     pill, fundo --beige, border --border, texto --fg-muted

[quote]
  conteúdo:   "Não vendo ferramentas. Construo o sistema à volta
               de como já trabalhas."
  font:       Lora Bold Italic, 17px, --forest
  border-left: 3px solid --terracotta
  padding-left: 16px, margin-top: 24px

[foto]
  placeholder circular 72px × 72px, --beige
  substituir quando disponível
```

---

## SECÇÃO 3 — GAPS PREVIEW

**Fundo:** `--beige`

### Componentes

```
[eyebrow]     "O QUE VAIS DESCOBRIR"

[título]
  conteúdo:   "Três gaps que a maioria das coaches não sabe que tem"
  font:       Lora Bold Italic, clamp(22px, 3vw, 30px), --ink

[subtítulo]
  conteúdo:   "Não são problemas de conteúdo nem de oferta. São
               falhas no que acontece entre o primeiro contacto e
               a decisão de compra."
  font:       Work Sans 400, 15px, --fg-muted

[grid]        3 colunas desktop → 1 coluna mobile
```

### GAP 1 — Tempo de resposta
```
ícone:    lucide: clock, 20px, --terracotta
label:    "TEMPO DE RESPOSTA" · Work Sans 700, 11px, --terracotta
título:   "O momento certo dura menos do que pensas"
          Lora Bold Italic, 17px, --ink
corpo:    "Um lead que envia uma DM está, naquele momento, com
           atenção disponível. Segundo investigação em vendas B2C,
           após a primeira hora sem resposta a probabilidade de
           qualificação cai mais de 10×. Não por impaciência
           — por distracção."
          Work Sans 400, 14px, --fg-muted
```

### GAP 2 — Nutrição automática
```
ícone:    lucide: mail
label:    "NUTRIÇÃO AUTOMÁTICA"
título:   "O lead entrou. E depois?"
corpo:    "Sem sequência automática, o acompanhamento compete com
           a tua agenda — e perde sempre nas semanas mais cheias.
           Que são exactamente as semanas em que tens mais leads
           quentes."
```

### GAP 3 — Tracking de leads
```
ícone:    lucide: layout-list
label:    "TRACKING DE LEADS"
título:   "O que não está registado não existe"
corpo:    "Um pipeline invisível é um pipeline que não funciona.
           Sem saber onde está cada lead, as decisões de follow-up
           ficam sempre atrasadas — ou simplesmente não acontecem."
```

### CTA de transição
```
texto:    "Quanto te estão a custar estes três gaps este mês?"
          Lora Italic, 17px, --ink, text-align center
botão:    "Faz o diagnóstico — 90 segundos →"
          terracotta, margin-top 24px, centrado
```

**Tracking:** `gaps_preview_cta_click`

---

## SECÇÃO 4 — QUIZ

**id:** `quiz`
**Fundo:** `--cream`
**Card:** centrado, max-width 640px, fundo branco, --sh-2, --r-md

### Cabeçalho do quiz
```
[título]      "DIAGNÓSTICO DO TEU FUNIL"
              Work Sans 700, 11px, uppercase, --terracotta

[subtítulo]   "8 perguntas. 90 segundos. Relatório personalizado
               no final."
              Work Sans 400, 14px, --fg-muted

[progresso]   height 3px, fundo --beige, fill --forest
              label: "Pergunta X de 9"
              transition 0.3s ease
```

### Comportamento geral
- 1 pergunta visível de cada vez
- Transição: fade + slide-up (200ms)
- Ao seleccionar opção → avança automaticamente após 300ms
- Excepção: gate de email não avança automaticamente

### Estilo de cada step
```
[número]      "01" Lora Italic, 32px, --terracotta, opacity 0.4
[enunciado]   Work Sans 600, 18px, --ink, line-height 1.4
[opções]      botões pill, fundo --beige, border --border
              hover: fundo --forest, texto --cream
              selected: fundo --forest, texto --cream, border --forest
              flex-direction column, gap 10px
```

---

### P1 — Faturação (gate de qualificação)
```
enunciado:  "Qual é a tua faturação mensal média com o teu
             negócio de coaching ou terapia?"
tipo:       escolha única
opções:
  A) "Menos de 2.000€/mês"        → anti_fit flag
  B) "Entre 2.000€ e 5.000€/mês"  → score_base = 60
  C) "Entre 5.000€ e 10.000€/mês" → score_base = 75
  D) "Mais de 10.000€/mês"        → score_base = 85
```

### P2 — Audiência (gate de qualificação)
```
enunciado:  "Quantos seguidores activos tens no Instagram —
             pessoas que comentam, respondem às stories ou
             enviam DMs regularmente?"
tipo:       escolha única
opções:
  A) "Menos de 500"         → anti_fit flag
  B) "Entre 500 e 2.000"    → score += 0
  C) "Entre 2.000 e 10.000" → score += 5
  D) "Mais de 10.000"       → score += 10
```

### P3 — Tempo de resposta
```
enunciado:  "Quando alguém comenta um post teu ou envia uma DM
             com interesse, quanto tempo demoras normalmente a
             responder?"
tipo:       escolha única
opções:
  A) "Até 5 minutos — tenho notificações activas"  → score += 0
  B) "Entre 5 minutos e 1 hora"                    → score -= 5
  C) "Entre 1 hora e 4 horas"                      → score -= 10
  D) "Entre 4 horas e 1 dia"                       → score -= 15
  E) "Mais de 1 dia — ou às vezes não chego a responder" → score -= 20
```

### P4 — Sequência de email
```
enunciado:  "Quando alguém entra na tua lista de emails ou deixa
             o contacto, o que acontece a seguir?"
tipo:       escolha única
opções:
  A) "Recebe uma sequência automática de emails que já escrevi" → score += 0
  B) "Recebo uma notificação e entro em contacto manualmente"   → score -= 10
  C) "Fica na lista mas não recebe nada de imediato"            → score -= 15
  D) "Não tenho lista de emails activa"                         → score -= 20
```

### P5 — CRM / Tracking
```
enunciado:  "Como acompanhas os potenciais clientes que já
             mostraram interesse mas ainda não compraram?"
tipo:       escolha única
opções:
  A) "Tenho um CRM ou sistema próprio — sei exactamente em que
      fase está cada lead"                              → score += 0
  B) "Uso Notion ou Excel, mas não é consistente"      → score -= 8
  C) "Guardo mentalmente ou nas notas do telemóvel"    → score -= 12
  D) "Não acompanho — se voltarem, bem; se não voltarem,
      perco-os"                                        → score -= 15
```

### P6 — Esforço manual de follow-up
```
enunciado:  "Quanto tempo dedicas por semana a follow-up manual
             — DMs, respostas, mensagens de acompanhamento?"
tipo:       escolha única
opções:
  A) "Quase não faço follow-up — não tenho processo para isso" → score -= 10
  B) "Entre 1 e 3 horas — faço o essencial"                   → score += 0
  C) "Entre 3 e 7 horas — já pesa na agenda"                  → score -= 8
  D) "Mais de 7 horas — ocupa demasiado tempo"                → score -= 12
```

### P7 — Volume de leads
```
enunciado:  "Quantos potenciais clientes te contactam por mês
             com intenção real de compra — DMs, respostas a
             stories, pedidos de informação?"
tipo:       escolha única
opções:
  A) "Menos de 5 por mês"     → leads_mes = 3
  B) "Entre 5 e 15 por mês"   → leads_mes = 10
  C) "Entre 15 e 30 por mês"  → leads_mes = 22
  D) "Mais de 30 por mês"     → leads_mes = 35

NOTA: não afecta score — alimenta cálculo de custo
```

### P8 — Contexto qualitativo
```
enunciado:  "O que te trava mais, neste momento, em fechar mais
             clientes?"
tipo:       escolha única
opções:
  A) "Não tenho tempo para responder a todas as mensagens"
     → tag: tempo
  B) "Os leads entram mas perco-os pelo caminho — não sei porquê"
     → tag: perda_silenciosa
  C) "Não tenho processo — cada venda é diferente"
     → tag: sem_processo
  D) "Tenho processo mas é tudo manual — é cansativo"
     → tag: manual_cansativo
```

### P9 — Modelo de negócio
```
enunciado:  "O teu modelo de negócio principal é..."
tipo:       escolha única
opções:
  A) "Sessões individuais"
  B) "Programa de grupo"
  C) "Produto digital (curso, ebook, assinatura)"
  D) "Misto — várias fontes de receita"

NOTA: alimenta cálculo de custo (valor por cliente)
```

### Gate de email (entre P9 e submit)
```
título:     "O teu relatório está pronto."
            Lora Bold Italic, 22px, --ink

subtítulo:  "Onde o enviamos?"
            Work Sans 400, 15px, --fg-muted

campos:
  - Primeiro nome (autocomplete="given-name")
  - Email (type="email", autocomplete="email")

nota RGPD:  "Não partilho os teus dados. Não envio spam.
             Podes cancelar quando quiseres."
            Instrument Sans, 12px, --fg-muted, italic

botão:      "Ver o meu relatório →"
            terracotta, full-width, 52px height, --r-md
            Work Sans 700, 16px
```

**Tracking:** `quiz_started` · `quiz_step_N` · `quiz_email_submitted` · `quiz_completed`

---

## LÓGICA DE SCORE — PSEUDO-CÓDIGO COMPLETO

```javascript
// INICIALIZAÇÃO
let score_base = 100
let anti_fit = false
let leads_mes = 0
let tag_contexto = ""
let modelo_negocio = ""

// P1 — faturação
if (P1 == "menos_2k")  { anti_fit = true }
if (P1 == "2k_5k")     { score_base = 60 }
if (P1 == "5k_10k")    { score_base = 75 }
if (P1 == "mais_10k")  { score_base = 85 }

let score = score_base

// P2 — audiência
if (P2 == "menos_500") { anti_fit = true }
if (P2 == "500_2k")    { score += 0 }
if (P2 == "2k_10k")    { score += 5 }
if (P2 == "mais_10k")  { score += 10 }

// P3 — tempo de resposta
if (P3 == "ate_5min")  { score += 0 }
if (P3 == "5min_1h")   { score -= 5 }
if (P3 == "1h_4h")     { score -= 10 }
if (P3 == "4h_1d")     { score -= 15 }
if (P3 == "mais_1d")   { score -= 20 }

// P4 — email
if (P4 == "sequencia")   { score += 0 }
if (P4 == "manual")      { score -= 10 }
if (P4 == "lista_fria")  { score -= 15 }
if (P4 == "sem_lista")   { score -= 20 }

// P5 — CRM
if (P5 == "crm_proprio")   { score += 0 }
if (P5 == "notion_excel")  { score -= 8 }
if (P5 == "mental")        { score -= 12 }
if (P5 == "nao_acompanha") { score -= 15 }

// P6 — follow-up manual
if (P6 == "quase_nao")  { score -= 10 }
if (P6 == "1_3h")       { score += 0 }
if (P6 == "3_7h")       { score -= 8 }
if (P6 == "mais_7h")    { score -= 12 }

// Garantir range 0-100
score = Math.max(0, Math.min(100, score))

// P7 — volume de leads (não afecta score)
if (P7 == "menos_5")   { leads_mes = 3 }
if (P7 == "5_15")      { leads_mes = 10 }
if (P7 == "15_30")     { leads_mes = 22 }
if (P7 == "mais_30")   { leads_mes = 35 }

// P8 — tag qualitativa
tag_contexto = P8.value
// valores: "tempo" | "perda_silenciosa" | "sem_processo" | "manual_cansativo"

// P9 — modelo de negócio
modelo_negocio = P9.value
// valores: "individual" | "grupo" | "digital" | "misto"

// CATEGORIAS
let categoria
if (score < 40)              { categoria = "critico" }
else if (score >= 40 && score < 70) { categoria = "em_margem" }
else                         { categoria = "solido" }

// CÁLCULO DE CUSTO
// valor_cliente por modelo + faixa P1
function getValorCliente(P1, P9) {
  const midpoints = { menos_2k: 1500, "2k_5k": 3500, "5k_10k": 7500, mais_10k: 15000 }
  const base = midpoints[P1]
  // ajuste por modelo
  if (P9 == "individual") return base * 1.0
  if (P9 == "grupo")      return base * 0.7   // ticket médio menor por pessoa
  if (P9 == "digital")    return base * 0.4   // ticket baixo
  if (P9 == "misto")      return base * 0.85
}

const valor_cliente = getValorCliente(P1, P9)
const leads_perdidos_mes = leads_mes * 0.30
const vendas_perdidas_mes = Math.round(leads_perdidos_mes * 0.20 * valor_cliente)

// SELECÇÃO DE 3 GAPS
// Calcular penalização de cada gap activo
const gaps_activos = []

if (["5min_1h","1h_4h","4h_1d","mais_1d"].includes(P3)) {
  const pen = { "5min_1h": 5, "1h_4h": 10, "4h_1d": 15, "mais_1d": 20 }
  gaps_activos.push({ id: "A", pen: pen[P3], versao: P3 })
}

if (["manual","lista_fria","sem_lista"].includes(P4)) {
  const pen = { "manual": 10, "lista_fria": 15, "sem_lista": 20 }
  gaps_activos.push({ id: "B", pen: pen[P4], versao: P4 })
}

if (["notion_excel","mental","nao_acompanha"].includes(P5)) {
  const pen = { "notion_excel": 8, "mental": 12, "nao_acompanha": 15 }
  gaps_activos.push({ id: "C", pen: pen[P5], versao: P5 })
}

if (["3_7h","mais_7h"].includes(P6)) {
  const pen = { "3_7h": 8, "mais_7h": 12 }
  gaps_activos.push({ id: "D", pen: pen[P6], versao: P6 })
}

if (P6 == "quase_nao") {
  gaps_activos.push({ id: "E", pen: 10, versao: "quase_nao" })
}

// Ordenar por penalização descendente, pegar os 3 primeiros
const gaps_a_mostrar = gaps_activos
  .sort((a, b) => b.pen - a.pen)
  .slice(0, 3)

// Edge case: menos de 3 gaps activos
// → mostrar apenas os que existem + mensagem especial (ver secção RELATÓRIO)

// ANTI-FIT
if (anti_fit) {
  mostrar_mensagem_anti_fit()
  // NÃO mostrar relatório, NÃO mostrar Calendly, NÃO mostrar WhatsApp
}
```

---

## SECÇÃO 5 — RELATÓRIO PERSONALIZADO

**Aparece:** imediatamente após submit do gate de email
**Comportamento:** scroll automático suave para `#report` após 800ms
**Fundo:** `--cream`

### Estrutura visual

```
1. Abertura contextual (por tag P8)
2. Score global + barra + categoria
3. Custo estimado
4. 3 gaps identificados
5. CTA pós-relatório (com campo WhatsApp)
```

---

### 5.1 — Abertura contextual (por tag P8)

**tag: `tempo`**
> "O teu problema não é falta de vontade. É falta de sistema. Quando tudo passa por ti, o tempo é o primeiro recurso a esgotar-se — e os leads são os primeiros a perder-se."

**tag: `perda_silenciosa`**
> "Os leads que perdes não te avisam que vão embora. Simplesmente deixam de responder. O problema raramente é o preço ou a oferta — é o silêncio que acontece entre o primeiro contacto e a decisão."

**tag: `sem_processo`**
> "Quando cada venda é diferente, é impossível saber o que está a funcionar. O que parece flexibilidade é, na prática, energia desperdiçada a reinventar o mesmo caminho."

**tag: `manual_cansativo`**
> "Tens processo — isso é raro. O problema é que o processo depende de ti para funcionar. Um sistema que para quando paras não é um sistema. É um emprego."

**Estilo:**
```
card --beige, border-left 3px --terracotta, padding 20px 24px
Lora Italic, 16px, --ink, line-height 1.6
```

---

### 5.2 — Score global

```
[label]       "PONTUAÇÃO DO TEU FUNIL"
              Work Sans 700, 11px, uppercase, --fg-muted

[número]      animado count-up (0→score, 1.2s, ease-out)
              Lora Bold Italic, 72px
              cor:  <40 → --terracotta
                    40-69 → #A0824A (âmbar)
                    ≥70 → --forest-mid

[barra]       height 12px, border-radius 999px
              fundo --beige, fill animado
              width = score% (transition 1s ease-out, delay 0.3s)

[categoria]   pill com fundo suave + parágrafo
```

### Textos de categoria

**Crítico (0–39)**
> **O teu funil tem fugas em múltiplos pontos.**
> Não é um problema — é um ponto de partida. Os sistemas com mais para corrigir são os que têm mais para ganhar. O que vês abaixo são os 3 gaps com maior impacto imediato.

**Em Margem (40–69)**
> **Tens estrutura, mas estás a deixar leads pelo caminho.**
> O problema não é o teu trabalho nem a tua oferta. É o que acontece entre o primeiro contacto e a chamada. Os gaps abaixo são corrigíveis — e o impacto é imediato quando o são.

**Sólido (70+)**
> **Estás acima da média — e isso torna os gaps mais caros.**
> Quando o resto do sistema funciona bem, uma fuga num ponto específico custa proporcionalmente mais. Os gaps abaixo são pequenos em esforço de correcção, grandes em impacto.

---

### 5.3 — Custo estimado

```
[card]        fundo --ink, --r-md, padding 24px

[label]       "CUSTO ESTIMADO EM LEADS PERDIDOS ESTE MÊS"
              Work Sans 700, 11px, --sand, uppercase

[valor]       "~[X]€/mês"
              Lora Bold Italic, 48px, --cream
              animado count-up

[nota]        "Calculado com base na tua faturação actual, no
               volume de leads que indicaste e numa taxa de perda
               de 30% por falta de follow-up estruturado.
               É uma estimativa conservadora."
              Instrument Sans, 12px, rgba(245,240,232,0.5), italic
```

**Edge case:** Se vendas_perdidas_mes < 200€:
> "O teu volume actual de leads é baixo — o custo visível ainda não é alto, mas o padrão que está a instalar-se é o que impede o crescimento."

---

### 5.4 — Os 3 gaps identificados

```
[label]       "OS TEUS 3 GAPS PRINCIPAIS"
              Work Sans 700, 11px, --terracotta, uppercase

[3 cards]     fundo branco, border --border, --r-md, --sh-1
              empilhados verticalmente, gap 12px

  cada card:
  [label gap] Work Sans 700, 11px, uppercase, --terracotta
  [título]    Lora Bold Italic, 19px, --ink
  [corpo]     Work Sans 400, 14px, --fg-muted, line-height 1.6
```

---

#### GAP A — Tempo de resposta
*Activa se P3 ≠ "ate_5min"*

**Título:** `Tempo de resposta — o gap invisível`

**Versão moderada** (P3 == "5min_1h" | "1h_4h"):
> "Respondes entre 5 minutos e 4 horas. Parece razoável — mas um lead que envia uma DM está, nesse momento, com atenção disponível. Passada a primeira hora, essa atenção foi para outro sítio. Não é sobre urgência — é sobre timing."

**Versão grave** (P3 == "4h_1d" | "mais_1d"):
> "Respondes passadas 4 horas ou mais. Nesse intervalo, o lead arrefece, distrai-se, ou simplesmente avança para outra opção. Não porque a tua oferta seja pior — porque foste a segunda a responder. O primeiro contacto é o momento de maior intenção de compra."

---

#### GAP B — Sequência de email
*Activa se P4 ≠ "sequencia"*

**Título:** `Nutrição ausente — leads que entram frios e saem sem decidir`

**Versão manual** (P4 == "manual"):
> "Tens lista mas o acompanhamento depende de ti. Isso significa que nos dias em que tens sessões, o follow-up não acontece. Um lead que não recebe nada nos primeiros 3 dias depois do primeiro contacto tem menos de metade das hipóteses de converter."

**Versão lista fria** (P4 == "lista_fria"):
> "Tens lista mas ela não trabalha. Uma lista que não recebe sequência automática é um activo parado. Cada lead que entrou e não recebeu acompanhamento imediato perdeu momentum."

**Versão sem lista** (P4 == "sem_lista"):
> "Não tens lista activa. Isso significa que cada lead que entra depende exclusivamente do teu timing para converter. A lista de emails é o único activo de captação que não depende do algoritmo do Instagram para existir amanhã."

---

#### GAP C — CRM / Tracking
*Activa se P5 ≠ "crm_proprio"*

**Título:** `Leads sem mapa — o que não está registado não existe`

**Versão inconsistente** (P5 == "notion_excel"):
> "Tens sistema mas não é consistente. O problema com tracking inconsistente é que cria uma falsa sensação de controlo. Um lead que ficou 'para contactar depois' e não tem data de follow-up registada é, na prática, um lead perdido com adiamento."

**Versão mental** (P5 == "mental"):
> "Acompanhas mentalmente. Isso funciona até 5 leads. Acima disso, começas a perder contexto — não sobre quem são, mas sobre onde estão no processo. O lead que 'fica para a semana' sem estar registado em lado nenhum raramente volta a aparecer na tua agenda."

**Versão sem acompanhamento** (P5 == "nao_acompanha"):
> "Não há tracking. Isso significa que o teu pipeline de vendas é invisível. Trabalhar sem CRM é como gerir um negócio sem saber o saldo bancário: as decisões ficam sempre atrasadas em relação à realidade."

---

#### GAP D — Esforço manual excessivo
*Activa se P6 == "3_7h" | "mais_7h" E os 3 slots ainda têm espaço*

**Título:** `O follow-up manual está a custar-te mais do que parece`

> "Passas entre 3 e 7 horas por semana (ou mais) em follow-up manual. Esse tempo tem dois custos: o óbvio, que é o tempo em si; e o invisível, que é a inconsistência. Follow-up manual depende da tua energia e disponibilidade — o que significa que nas semanas mais cheias é exactamente quando menos acontece."

---

#### GAP E — Abandono de follow-up
*Activa se P6 == "quase_nao" E os 3 slots ainda têm espaço*

**Título:** `Follow-up ausente — leads quentes a arrefecer sem razão`

> "Quase não fazes follow-up. Não por falta de intenção — por falta de processo. Sem sistema, o follow-up compete com tudo o resto na tua agenda e perde sempre. Os leads que entram com intenção real de compra precisam de 2 a 5 pontos de contacto antes de decidirem."

---

#### Edge case: menos de 3 gaps activos

Mostrar apenas os gaps existentes e adicionar:
> "Com um score de [X], os teus gaps são pontuais. Mesmo assim, cada um tem custo — e são corrigíveis rapidamente."

---

### 5.5 — CTA pós-relatório (com campo WhatsApp)

```
[bloco]       fundo --ink-deep + diagonal, --r-md, padding 32px

[título]      "Identificaste os gaps. O próximo passo é fechá-los."
              Lora Bold Italic, 24px, --cream

[corpo]       "Numa chamada de 30 minutos, analiso o teu caso
               específico e digo-te exactamente o que construir
               primeiro. Sem pitch agressivo. Se não fizer sentido
               para o teu momento, digo-te eu."
              Work Sans 400, 15px, rgba(245,240,232,0.8)

[label WA]    "WhatsApp (opcional — para te contactar directamente
               se preferires)"
              Instrument Sans, 12px, --sand

[campo WA]    input type="tel"
              placeholder: "O teu número de WhatsApp"
              fundo rgba(255,255,255,0.08)
              border rgba(245,240,232,0.2)
              cor texto --cream, --r-sm

[botão]       "Falar com o Celso — 30 min →"
              terracotta, full-width, 52px, --r-md
              Work Sans 700, 16px
              href: âncora #calendly

[nota]        "Sem pitch agressivo. Sem compromisso.
               Se não fizer sentido, digo-te eu primeiro."
              Instrument Sans, 12px, rgba(245,240,232,0.5)
              text-align center, margin-top 12px
```

---

### 5.6 — Mensagem anti-fit

*Activa quando anti_fit == true (P1 "menos_2k" OU P2 "menos_500")*
*Substitui TUDO o relatório. Sem score. Sem gaps. Sem Calendly. Sem WhatsApp.*

```
[card]        fundo --beige, border-left 3px --terracotta
              padding 32px, max-width 560px, centrado

[título]      "Este sistema não é para ti — ainda."
              Lora Bold Italic, 22px, --ink

[corpo]       "O que construo precisa de dois ingredientes que
               ainda estás a cultivar: uma audiência minimamente
               activa no Instagram e faturação que mostre que já
               tens clientes a pagar pelo teu trabalho.

               Sem esses dois elementos, o sistema fica vazio
               — não há leads para qualificar, e isso não seria
               justo para ti nem para mim.

               Quando estiveres a faturar 2.000€/mês com
               regularidade e tiveres 500+ seguidores activos,
               volta cá. Vou estar à espera — e o diagnóstico
               vai fazer muito mais sentido nessa altura.

               Até lá, o melhor investimento é na audiência e
               na oferta. Não no sistema."
              Work Sans 400, 15px, --fg-muted, line-height 1.7
```

**Tracking:** `report_viewed` · `report_category_{critico|em_margem|solido}` · `report_antifit` · `whatsapp_field_filled` · `calendly_cta_click`

---

## SECÇÃO 6 — CALENDLY

**id:** `calendly`
**Fundo:** `--forest` + diagonal

```
[eyebrow]     "A CHAMADA"
              Work Sans 700, 11px, --sand, uppercase

[título]      "30 minutos. Sem compromisso. Sem pitch."
              Lora Bold Italic, clamp(24px, 3.5vw, 36px), --cream

[corpo]       "Analiso o teu funil actual · Identifico a primeira
               alavanca a corrigir · Digo-te se faz sentido
               trabalharmos juntos — e se não fizer, digo-te também."
              Work Sans 400, 15px, rgba(245,240,232,0.85)
              interpunct · como separador

[anti-pressão]
              "Não há vagas artificiais. Não há urgência fabricada.
               Se o momento não for o certo para ti, a chamada
               ainda assim vale o tempo."
              Lora Italic, 15px, rgba(245,240,232,0.65)
              margin-top 16px

[embed]       Calendly inline widget (não popup)
              background transparent
              primary color: #8B6F47
              height ~650px desktop · scroll natural mobile
```

### Configuração Calendly (criar manualmente)
```
Nome do evento:   "Auditoria Sistema de Leads — 30 min"
Duração:          30 minutos
Buffer antes:     15 minutos
Buffer depois:    15 minutos
Fuso horário:     Europe/Lisbon

Perguntas pré-agendamento (obrigatórias):
  1. "Qual é a tua faturação mensal actual com coaching ou terapia?"
     tipo: dropdown
     opções: Menos de 2.000€ / 2.000–5.000€ / 5.000–10.000€ / Mais de 10.000€

  2. "Quantos leads te contactam por mês com intenção de compra?"
     tipo: dropdown
     opções: Menos de 5 / Entre 5 e 15 / Entre 15 e 30 / Mais de 30

  3. "O que te levou a marcar esta chamada?"
     tipo: texto livre · obrigatório

Email de confirmação:
  "Até amanhã. Lê o teu relatório antes da chamada — vamos partir daí."
```

**Tracking:** `calendly_widget_loaded` · `calendly_event_scheduled` (via postMessage)

---

## SECÇÃO 7 — FAQ

**Fundo:** `--cream`
**Componente:** accordion, 5 items, primeiro aberto por defeito

```
[título]      "PERGUNTAS FREQUENTES"
              Work Sans 700, 11px, uppercase, --fg-muted

estilo item:
  border-bottom 1px --border
  [pergunta]  Work Sans 700, 15px, --ink
              ícone chevron-down (lucide), anima 180° ao abrir
  [resposta]  Work Sans 400, 14px, --fg-muted, line-height 1.6
              padding-bottom 16px
```

### Copy das 5 perguntas

**P1 — Isto é gratuito? Qual é o catch?**
O diagnóstico é gratuito e a chamada também. O catch honesto: se o sistema fizer sentido para o teu negócio, vou propor trabalharmos juntos. Se não fizer sentido, não proponho. Não há lista de espera artificial nem pressão de tempo.

**P2 — Vou receber spam depois?**
Não. Vais receber o relatório por email e, se agendares chamada, um lembrete. Se não quiseres mais nada depois disso, basta dizer — ou cancelar directamente na lista. Sem drama.

**P3 — Quanto tempo dura a chamada?**
30 minutos. Começo pela análise do teu caso específico — não por uma apresentação da minha oferta. Se houver fit, falo no final. Se não houver, também digo.

**P4 — Já tentei automação antes e não funcionou. Em que é diferente?**
Na maioria dos casos que vi, a automação falhou porque foi instalada sem perceber o processo da pessoa. Começou pelas ferramentas, não pelo negócio. O que faço é o inverso: começo pela auditoria do teu processo actual e só depois construo o sistema à volta disso. As ferramentas são as últimas a entrar.

**P5 — Não sou muito tech. É demasiado complicado para mim?**
Não é para ti que é complicado — é para mim. O teu papel depois da instalação é ler o CRM e fazer as chamadas. O sistema trabalha sem precisares de perceber como funciona por dentro. Se precisares de ajustar alguma coisa, estou cá.

**Tracking:** `faq_item_opened_{slug}` ao abrir cada pergunta

---

## SECÇÃO 8 — FOOTER

**Fundo:** `--ink`

```
[logo]        "CP" Gloock, 24px, --cream
              "Celso Pereira" Work Sans 400, 13px, --sand
              "Automação para Coaches · Portugal · 2026"
              Instrument Sans, 11px, --fg-muted

[handle]      "@celsopereira.ia"
              Instrument Sans, 12px, --sand

[legal]       "Política de Privacidade · RGPD"
              Work Sans 400, 12px, --fg-muted
              link para página separada
```

---

## MOBILE-FIRST — CHECKLIST

```
□ Breakpoint principal: 480px
□ Quiz card: padding 20px (vs 32px desktop)
□ H1 hero: máx 32px
□ Botões CTA: full-width abaixo de 480px
□ Grid gaps preview: 1 coluna
□ Score number: 56px (vs 72px)
□ Custo number: 36px (vs 48px)
□ Calendly embed: scroll natural (não altura fixa)
□ FAQ: toque em linha inteira, não só no chevron
□ Campo WhatsApp: input type="tel" → teclado numérico iOS/Android
□ Gate email: autocomplete="email" e autocomplete="given-name"
□ Barra progresso: sempre visível
```

---

## TRACKING — PLANO COMPLETO

| Evento | Gatilho |
|---|---|
| `hero_cta_click` | Clique no CTA do hero |
| `gaps_preview_cta_click` | Clique no CTA da secção 3 |
| `quiz_started` | Selecção na P1 |
| `quiz_step_2` … `quiz_step_9` | Cada pergunta completada |
| `quiz_antifit_triggered` | Anti-fit detectado |
| `quiz_email_submitted` | Submit do gate de email |
| `quiz_completed` | Relatório visível |
| `report_viewed` | Scroll até #report |
| `report_antifit` | Mensagem anti-fit mostrada |
| `report_category_critico` | Score < 40 |
| `report_category_em_margem` | Score 40–69 |
| `report_category_solido` | Score ≥ 70 |
| `whatsapp_field_filled` | Campo WA preenchido |
| `calendly_cta_click` | Clique no botão Calendly |
| `calendly_widget_loaded` | Widget Calendly renderizado |
| `calendly_event_scheduled` | Chamada agendada (via postMessage) |
| `faq_item_opened_{slug}` | Cada FAQ aberta |

---

## FICHEIROS A CRIAR

```
index.html      — estrutura HTML completa
styles.css      — todos os tokens + estilos por componente
quiz.js         — lógica do quiz, score, relatório condicional
tracking.js     — eventos Plausible/PostHog
```

## ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

```
1.  Tokens CSS + tipografia (base)
2.  Hero (estático)
3.  AuthorityStrip (estático)
4.  GapsPreview (estático)
5.  Quiz — estrutura visual step-by-step (sem lógica)
6.  Quiz — lógica de score + anti-fit
7.  Gate de email + submit
8.  Relatório — estrutura visual estática
9.  Relatório — lógica condicional (gaps + custo)
10. Campo WhatsApp + CTA pós-relatório
11. CalendlySection + embed
12. FAQ accordion
13. FooterMinimal
14. Tracking events
15. Testes mobile
```

---

*Fim do SPEC.md — Celso Pereira · Diagnóstico de Leads · 2026*
