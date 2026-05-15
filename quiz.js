/* quiz.js — lógica do quiz, score e relatório condicional */

// ============================================================
// DADOS DAS PERGUNTAS
// ============================================================
const QUESTIONS = [
  {
    id: 'P1', num: '01',
    text: 'Qual é a tua faturação mensal média com o teu negócio de coaching ou terapia?',
    options: [
      { label: 'Menos de 2.000€/mês',          value: 'menos_2k' },
      { label: 'Entre 2.000€ e 5.000€/mês',    value: '2k_5k'   },
      { label: 'Entre 5.000€ e 10.000€/mês',   value: '5k_10k'  },
      { label: 'Mais de 10.000€/mês',           value: 'mais_10k'},
    ],
  },
  {
    id: 'P2', num: '02',
    text: 'Quantos seguidores activos tens no Instagram — pessoas que comentam, respondem às stories ou enviam DMs regularmente?',
    options: [
      { label: 'Menos de 500',          value: 'menos_500' },
      { label: 'Entre 500 e 2.000',     value: '500_2k'   },
      { label: 'Entre 2.000 e 10.000',  value: '2k_10k'   },
      { label: 'Mais de 10.000',        value: 'mais_10k' },
    ],
  },
  {
    id: 'P3', num: '03',
    text: 'Quando alguém comenta um post teu ou envia uma DM com interesse, quanto tempo demoras normalmente a responder?',
    options: [
      { label: 'Até 5 minutos — tenho notificações activas',           value: 'ate_5min' },
      { label: 'Entre 5 minutos e 1 hora',                             value: '5min_1h'  },
      { label: 'Entre 1 hora e 4 horas',                               value: '1h_4h'   },
      { label: 'Entre 4 horas e 1 dia',                                value: '4h_1d'   },
      { label: 'Mais de 1 dia — ou às vezes não chego a responder',    value: 'mais_1d' },
    ],
  },
  {
    id: 'P4', num: '04',
    text: 'Quando alguém entra na tua lista de emails ou deixa o contacto, o que acontece a seguir?',
    options: [
      { label: 'Recebe uma sequência automática de emails que já escrevi', value: 'sequencia'  },
      { label: 'Recebo uma notificação e entro em contacto manualmente',   value: 'manual'     },
      { label: 'Fica na lista mas não recebe nada de imediato',            value: 'lista_fria' },
      { label: 'Não tenho lista de emails activa',                         value: 'sem_lista'  },
    ],
  },
  {
    id: 'P5', num: '05',
    text: 'Como acompanhas os potenciais clientes que já mostraram interesse mas ainda não compraram?',
    options: [
      { label: 'Tenho um CRM ou sistema próprio — sei exactamente em que fase está cada lead', value: 'crm_proprio'   },
      { label: 'Uso Notion ou Excel, mas não é consistente',                                   value: 'notion_excel'  },
      { label: 'Guardo mentalmente ou nas notas do telemóvel',                                 value: 'mental'        },
      { label: 'Não acompanho — se voltarem, bem; se não voltarem, perco-os',                 value: 'nao_acompanha' },
    ],
  },
  {
    id: 'P6', num: '06',
    text: 'Quanto tempo dedicas por semana a follow-up manual — DMs, respostas, mensagens de acompanhamento?',
    options: [
      { label: 'Quase não faço follow-up — não tenho processo para isso', value: 'quase_nao' },
      { label: 'Entre 1 e 3 horas — faço o essencial',                    value: '1_3h'      },
      { label: 'Entre 3 e 7 horas — já pesa na agenda',                   value: '3_7h'      },
      { label: 'Mais de 7 horas — ocupa demasiado tempo',                 value: 'mais_7h'   },
    ],
  },
  {
    id: 'P7', num: '07',
    text: 'Quantos potenciais clientes te contactam por mês com intenção real de compra — DMs, respostas a stories, pedidos de informação?',
    options: [
      { label: 'Menos de 5 por mês',    value: 'menos_5' },
      { label: 'Entre 5 e 15 por mês',  value: '5_15'    },
      { label: 'Entre 15 e 30 por mês', value: '15_30'   },
      { label: 'Mais de 30 por mês',    value: 'mais_30' },
    ],
  },
  {
    id: 'P8', num: '08',
    text: 'O que te trava mais, neste momento, em fechar mais clientes?',
    options: [
      { label: 'Não tenho tempo para responder a todas as mensagens',        value: 'tempo'            },
      { label: 'Os leads entram mas perco-os pelo caminho — não sei porquê', value: 'perda_silenciosa' },
      { label: 'Não tenho processo — cada venda é diferente',               value: 'sem_processo'     },
      { label: 'Tenho processo mas é tudo manual — é cansativo',            value: 'manual_cansativo' },
    ],
  },
  {
    id: 'P9', num: '09',
    text: 'O teu modelo de negócio principal é...',
    options: [
      { label: 'Sessões individuais',                        value: 'individual' },
      { label: 'Programa de grupo',                          value: 'grupo'      },
      { label: 'Produto digital (curso, ebook, assinatura)', value: 'digital'    },
      { label: 'Misto — várias fontes de receita',           value: 'misto'      },
    ],
  },
];

// ============================================================
// ESTADO
// ============================================================
const answers = {};
let currentStep = 0;
const TOTAL = QUESTIONS.length;
let submittedEmail = '';
let insertedLeadId = '';

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const quizSection = document.getElementById('quiz');
  if (!quizSection) return;

  renderSteps();
  showStep(0);

  const gateForm = document.getElementById('gateForm');
  if (gateForm) gateForm.addEventListener('submit', handleGateSubmit);

  initFaqTracking();
});

function initFaqTracking() {
  document.querySelectorAll('.faq__item[data-faq-slug]').forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open && typeof track === 'function') {
        track(`faq_item_opened_${item.dataset.faqSlug}`);
      }
    });
  });
}

// ============================================================
// RENDER STEPS
// ============================================================
function renderSteps() {
  const container = document.getElementById('quizSteps');

  QUESTIONS.forEach((q, i) => {
    const step = document.createElement('div');
    step.className = 'quiz__step';
    step.dataset.index = i;
    step.hidden = true;

    step.innerHTML = `
      <span class="quiz__step-num">${q.num}</span>
      <p class="quiz__question">${q.text}</p>
      <div class="quiz__options" role="group" aria-label="${q.text}">
        ${q.options.map(o => `
          <button class="quiz__option" type="button"
                  data-value="${o.value}" data-question="${q.id}">
            ${o.label}
          </button>
        `).join('')}
      </div>
    `;

    step.querySelectorAll('.quiz__option').forEach(btn => {
      btn.addEventListener('click', () => handleOption(btn, q.id, i));
    });

    container.appendChild(step);
  });
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
function showStep(index) {
  const steps = document.querySelectorAll('.quiz__step');

  steps.forEach(s => {
    s.hidden = true;
    s.classList.remove('quiz__step--enter');
  });

  const target = steps[index];
  if (!target) return;

  target.hidden = false;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => target.classList.add('quiz__step--enter'));
  });

  currentStep = index;
  updateProgress(index + 1);
}

function updateProgress(current) {
  const bar   = document.getElementById('quizProgress');
  const label = document.getElementById('quizProgressLabel');
  if (bar)   bar.style.width = ((current / TOTAL) * 100) + '%';
  if (label) label.textContent = `Pergunta ${current} de ${TOTAL}`;
}

function showGate() {
  document.querySelectorAll('.quiz__step').forEach(s => { s.hidden = true; });

  const bar   = document.getElementById('quizProgress');
  const label = document.getElementById('quizProgressLabel');
  if (bar)   bar.style.width = '100%';
  if (label) label.textContent = 'Quase lá!';

  const gate = document.getElementById('quizGate');
  if (!gate) return;
  gate.hidden = false;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => gate.classList.add('quiz__gate--enter'));
  });
}

// ============================================================
// HANDLERS
// ============================================================
function handleOption(btn, questionId, stepIndex) {
  const opts = btn.closest('.quiz__options').querySelectorAll('.quiz__option');
  opts.forEach(o => o.classList.remove('is-selected'));
  btn.classList.add('is-selected');

  answers[questionId] = btn.dataset.value;

  if (typeof track === 'function') {
    track(stepIndex === 0 ? 'quiz_started' : `quiz_step_${stepIndex + 1}`);
  }

  setTimeout(() => {
    if (stepIndex + 1 < TOTAL) showStep(stepIndex + 1);
    else showGate();
  }, 300);
}

async function handleGateSubmit(e) {
  e.preventDefault();

  const name  = document.getElementById('gateName').value.trim();
  const email = document.getElementById('gateEmail').value.trim();
  submittedEmail = email;
  if (!name || !email) return;

  const quizSection = document.getElementById('quiz');
  if (quizSection) quizSection.hidden = true;

  // Esconder secções superiores com fade
  const sectionsToHide = ['hero', 'authority', 'gaps'];
  sectionsToHide.forEach((id, index) => {
    const el = document.getElementById(id);
    if (el) {
      setTimeout(() => {
        el.classList.add('section-fade-out');
        setTimeout(() => {
          el.hidden = true;
          el.classList.remove('section-fade-out');
        }, 600);
      }, index * 100);
    }
  });

  if (typeof track === 'function') track('quiz_email_submitted');

  const result = calculateResult();

  if (result.anti_fit) {
    showAntiFit();
    return;
  }

  try {
    await saveLeadToSupabase(result, name, email);
  } catch (err) {
    console.error('[supabase] erro ao guardar lead:', err);
  }

  const reportSection = document.getElementById('report');
  if (!reportSection) return;

  reportSection.hidden = false;
  reportSection.innerHTML = renderReport(result);

  if (typeof track === 'function') {
    track('quiz_completed');
    track(`report_category_${result.categoria}`);
  }

  setTimeout(() => {
    reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (typeof lucide !== 'undefined') lucide.createIcons();
    initReportAnimations(result.score, result.vendasPerdidasMes, email);
  }, 800);
}

// ============================================================
// CÁLCULO DE SCORE
// ============================================================
function calculateResult() {
  const { P1, P2, P3, P4, P5, P6, P7, P8, P9 } = answers;

  let score_base = 100;
  let anti_fit   = false;

  if (P1 === 'menos_2k')  { anti_fit = true; }
  if (P1 === '2k_5k')     { score_base = 60; }
  if (P1 === '5k_10k')    { score_base = 75; }
  if (P1 === 'mais_10k')  { score_base = 85; }

  let score = score_base;

  if (P2 === 'menos_500') { anti_fit = true; }
  if (P2 === '2k_10k')    { score += 5;  }
  if (P2 === 'mais_10k')  { score += 10; }

  if (P3 === '5min_1h')  { score -= 5;  }
  if (P3 === '1h_4h')    { score -= 10; }
  if (P3 === '4h_1d')    { score -= 15; }
  if (P3 === 'mais_1d')  { score -= 20; }

  if (P4 === 'manual')     { score -= 10; }
  if (P4 === 'lista_fria') { score -= 15; }
  if (P4 === 'sem_lista')  { score -= 20; }

  if (P5 === 'notion_excel')  { score -= 8;  }
  if (P5 === 'mental')        { score -= 12; }
  if (P5 === 'nao_acompanha') { score -= 15; }

  if (P6 === 'quase_nao') { score -= 10; }
  if (P6 === '3_7h')      { score -= 8;  }
  if (P6 === 'mais_7h')   { score -= 12; }

  score = Math.max(0, Math.min(100, score));

  // Volume de leads (não afecta score)
  const leadsMes = { menos_5: 3, '5_15': 10, '15_30': 22, mais_30: 35 }[P7] || 0;

  // Categoria
  const categoria = score < 40 ? 'critico' : score < 70 ? 'em_margem' : 'solido';

  // Custo estimado
  const midpoint  = { menos_2k: 1500, '2k_5k': 3500, '5k_10k': 7500, mais_10k: 15000 }[P1] || 3500;
  const multiplier = { individual: 1.0, grupo: 0.7, digital: 0.4, misto: 0.85 }[P9] || 1.0;
  const valorCliente      = midpoint * multiplier;
  const vendasPerdidasMes = Math.round(leadsMes * 0.30 * 0.20 * valorCliente);

  // Gaps activos
  const gapsActivos = [];

  if (P3 && P3 !== 'ate_5min') {
    const pen = { '5min_1h': 5, '1h_4h': 10, '4h_1d': 15, 'mais_1d': 20 };
    gapsActivos.push({ id: 'A', pen: pen[P3] || 0, versao: P3 });
  }
  if (P4 && P4 !== 'sequencia') {
    const pen = { manual: 10, lista_fria: 15, sem_lista: 20 };
    gapsActivos.push({ id: 'B', pen: pen[P4] || 0, versao: P4 });
  }
  if (P5 && P5 !== 'crm_proprio') {
    const pen = { notion_excel: 8, mental: 12, nao_acompanha: 15 };
    gapsActivos.push({ id: 'C', pen: pen[P5] || 0, versao: P5 });
  }
  if (P6 === '3_7h' || P6 === 'mais_7h') {
    const pen = { '3_7h': 8, 'mais_7h': 12 };
    gapsActivos.push({ id: 'D', pen: pen[P6] || 0, versao: P6 });
  }
  if (P6 === 'quase_nao') {
    gapsActivos.push({ id: 'E', pen: 10, versao: 'quase_nao' });
  }

  const gapsMostrar = gapsActivos.sort((a, b) => b.pen - a.pen).slice(0, 3);

  return { score, categoria, vendasPerdidasMes, gapsMostrar, tag: P8, leadsMes, anti_fit };
}

// ============================================================
// ANTI-FIT
// ============================================================
function showAntiFit() {
  const quizSection = document.getElementById('quiz');
  if (quizSection) quizSection.hidden = true;

  if (typeof track === 'function') {
    track('quiz_antifit_triggered');
    track('report_antifit');
  }

  const reportSection = document.getElementById('report');
  if (!reportSection) return;

  reportSection.hidden = false;
  reportSection.innerHTML = renderAntiFit();

  setTimeout(() => {
    reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 400);
}

// ============================================================
// RENDER — RELATÓRIO
// ============================================================
function renderReport({ score, categoria, vendasPerdidasMes, gapsMostrar, tag }) {
  const scoreColor = score < 40
    ? 'var(--terracotta)'
    : score < 70 ? '#A0824A' : 'var(--forest-mid)';

  const catLabel = { critico: 'Crítico', em_margem: 'Em Margem', solido: 'Sólido' }[categoria];
  const gapCount = gapsMostrar.length;

  const costBlock = vendasPerdidasMes < 200
    ? `<p class="report__cost-edge">O teu volume actual de leads é baixo — o custo visível ainda não é alto, mas o padrão que está a instalar-se é o que impede o crescimento.</p>`
    : `<span class="report__cost-value"></span>
       <p class="report__cost-note">Calculado com base na tua faturação actual, no volume de leads que indicaste e numa taxa de perda de 30% por falta de follow-up estruturado. É uma estimativa conservadora.</p>`;

  const gapsBlock = gapCount > 0
    ? gapsMostrar.map(renderGapCard).join('')
    : '';

  const edgeNote = gapCount < 3
    ? `<p class="report__gaps-edge">Com um score de ${score}, os teus gaps são pontuais. Mesmo assim, cada um tem custo — e são corrigíveis rapidamente.</p>`
    : '';

  return `
    <div class="report__inner">

      <div class="report__opening">
        <p>${getOpeningText(tag)}</p>
      </div>

      <div class="report__score-block">
        <p class="eyebrow report__score-eyebrow">Pontuação do teu funil</p>
        <div class="report__score-row">
          <span class="report__score-num" style="color:${scoreColor}">0</span>
          <span class="report__score-unit" style="color:${scoreColor}">/100</span>
        </div>
        <div class="report__score-track">
          <div class="report__score-bar" data-target="${score}" style="background:${scoreColor}"></div>
        </div>
        <span class="report__category-pill report__category-pill--${categoria}">${catLabel}</span>
        <p class="report__category-text">${getCategoryText(categoria)}</p>
      </div>

      <div class="report__cost">
        <p class="eyebrow report__cost-eyebrow">Custo estimado em leads perdidos este mês</p>
        ${costBlock}
      </div>

      <div class="report__gaps">
        <p class="eyebrow report__gaps-eyebrow">Os teus ${gapCount || 'principais'} gaps ${gapCount === 1 ? 'principal' : 'principais'}</p>
        <div class="report__gaps-list">
          ${gapsBlock}
          ${edgeNote}
        </div>
      </div>

      <div class="report__cta">
        <h3 class="report__cta-title">Identificaste os gaps. O próximo passo é fechá-los.</h3>
        <p class="report__cta-body">Numa chamada de 30 minutos, analiso o teu caso específico e digo-te exactamente o que construir primeiro. Sem pitch agressivo. Se não fizer sentido para o teu momento, digo-te eu.</p>
        <label class="report__wa-label" for="waField">WhatsApp (opcional — para te contactar directamente se preferires)</label>
        <input type="tel" id="waField" class="report__wa-input" placeholder="O teu número de WhatsApp">
        <button type="button" class="btn btn--primary report__cta-btn is-locked"
                id="ctaCalendly">
          Falar com o Celso — 30 min →
        </button>
        <p class="report__cta-note" id="ctaNote">
          Deixa o teu WhatsApp para activar o agendamento.
        </p>
      </div>

    </div>
  `;
}

// ============================================================
// RENDER — ANTI-FIT
// ============================================================
function renderAntiFit() {
  return `
    <div class="report__antifit-wrap">
      <div class="report__antifit">
        <h2 class="report__antifit-title">Este sistema não é para ti — ainda.</h2>
        <div class="report__antifit-body">
          <p>O que construo precisa de dois ingredientes que ainda estás a cultivar: uma audiência minimamente activa no Instagram e faturação que mostre que já tens clientes a pagar pelo teu trabalho.</p>
          <p>Sem esses dois elementos, o sistema fica vazio — não há leads para qualificar, e isso não seria justo para ti nem para mim.</p>
          <p>Quando estiveres a faturar 2.000€/mês com regularidade e tiveres 500+ seguidores activos, volta cá. Vou estar à espera — e o diagnóstico vai fazer muito mais sentido nessa altura.</p>
          <p>Até lá, o melhor investimento é na audiência e na oferta. Não no sistema.</p>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// HELPERS — TEXTO
// ============================================================
function getOpeningText(tag) {
  const texts = {
    tempo:
      'O teu problema não é falta de vontade. É falta de sistema. Quando tudo passa por ti, o tempo é o primeiro recurso a esgotar-se — e os leads são os primeiros a perder-se.',
    perda_silenciosa:
      'Os leads que perdes não te avisam que vão embora. Simplesmente deixam de responder. O problema raramente é o preço ou a oferta — é o silêncio que acontece entre o primeiro contacto e a decisão.',
    sem_processo:
      'Quando cada venda é diferente, é impossível saber o que está a funcionar. O que parece flexibilidade é, na prática, energia desperdiçada a reinventar o mesmo caminho.',
    manual_cansativo:
      'Tens processo — isso é raro. O problema é que o processo depende de ti para funcionar. Um sistema que para quando paras não é um sistema. É um emprego.',
  };
  return texts[tag] || texts.perda_silenciosa;
}

function getCategoryText(categoria) {
  const texts = {
    critico:
      '<strong>O teu funil tem fugas em múltiplos pontos.</strong> Não é um problema — é um ponto de partida. Os sistemas com mais para corrigir são os que têm mais para ganhar. O que vês abaixo são os 3 gaps com maior impacto imediato.',
    em_margem:
      '<strong>Tens estrutura, mas estás a deixar leads pelo caminho.</strong> O problema não é o teu trabalho nem a tua oferta. É o que acontece entre o primeiro contacto e a chamada. Os gaps abaixo são corrigíveis — e o impacto é imediato quando o são.',
    solido:
      '<strong>Estás acima da média — e isso torna os gaps mais caros.</strong> Quando o resto do sistema funciona bem, uma fuga num ponto específico custa proporcionalmente mais. Os gaps abaixo são pequenos em esforço de correcção, grandes em impacto.',
  };
  return texts[categoria] || texts.em_margem;
}

function getGapContent({ id, versao }) {
  const GAPS = {
    A: {
      label: 'TEMPO DE RESPOSTA',
      title: 'Tempo de resposta — o gap invisível',
      body: {
        moderate: ['5min_1h', '1h_4h'],
        moderateText:
          'Respondes entre 5 minutos e 4 horas. Parece razoável — mas um lead que envia uma DM está, nesse momento, com atenção disponível. Passada a primeira hora, essa atenção foi para outro sítio. Não é sobre urgência — é sobre timing.',
        severeText:
          'Respondes passadas 4 horas ou mais. Nesse intervalo, o lead arrefece, distrai-se, ou simplesmente avança para outra opção. Não porque a tua oferta seja pior — porque foste a segunda a responder. O primeiro contacto é o momento de maior intenção de compra.',
      },
    },
    B: {
      label: 'NUTRIÇÃO AUTOMÁTICA',
      title: 'Nutrição ausente — leads que entram frios e saem sem decidir',
      body: {
        manual:
          'Tens lista mas o acompanhamento depende de ti. Isso significa que nos dias em que tens sessões, o follow-up não acontece. Um lead que não recebe nada nos primeiros 3 dias depois do primeiro contacto tem menos de metade das hipóteses de converter.',
        lista_fria:
          'Tens lista mas ela não trabalha. Uma lista que não recebe sequência automática é um activo parado. Cada lead que entrou e não recebeu acompanhamento imediato perdeu momentum.',
        sem_lista:
          'Não tens lista activa. Isso significa que cada lead que entra depende exclusivamente do teu timing para converter. A lista de emails é o único activo de captação que não depende do algoritmo do Instagram para existir amanhã.',
      },
    },
    C: {
      label: 'TRACKING DE LEADS',
      title: 'Leads sem mapa — o que não está registado não existe',
      body: {
        notion_excel:
          'Tens sistema mas não é consistente. O problema com tracking inconsistente é que cria uma falsa sensação de controlo. Um lead que ficou "para contactar depois" e não tem data de follow-up registada é, na prática, um lead perdido com adiamento.',
        mental:
          'Acompanhas mentalmente. Isso funciona até 5 leads. Acima disso, começas a perder contexto — não sobre quem são, mas sobre onde estão no processo. O lead que "fica para a semana" sem estar registado em lado nenhum raramente volta a aparecer na tua agenda.',
        nao_acompanha:
          'Não há tracking. Isso significa que o teu pipeline de vendas é invisível. Trabalhar sem CRM é como gerir um negócio sem saber o saldo bancário: as decisões ficam sempre atrasadas em relação à realidade.',
      },
    },
    D: {
      label: 'FOLLOW-UP MANUAL',
      title: 'O follow-up manual está a custar-te mais do que parece',
      body: {
        default:
          'Passas entre 3 e 7 horas por semana (ou mais) em follow-up manual. Esse tempo tem dois custos: o óbvio, que é o tempo em si; e o invisível, que é a inconsistência. Follow-up manual depende da tua energia e disponibilidade — o que significa que nas semanas mais cheias é exactamente quando menos acontece.',
      },
    },
    E: {
      label: 'FOLLOW-UP AUSENTE',
      title: 'Follow-up ausente — leads quentes a arrefecer sem razão',
      body: {
        default:
          'Quase não fazes follow-up. Não por falta de intenção — por falta de processo. Sem sistema, o follow-up compete com tudo o resto na tua agenda e perde sempre. Os leads que entram com intenção real de compra precisam de 2 a 5 pontos de contacto antes de decidirem.',
      },
    },
  };

  const content = GAPS[id];
  if (!content) return null;

  let body = '';
  if (id === 'A') {
    body = content.body.moderate.includes(versao)
      ? content.body.moderateText
      : content.body.severeText;
  } else if (id === 'B' || id === 'C') {
    body = content.body[versao] || Object.values(content.body)[0];
  } else {
    body = content.body.default;
  }

  return { label: content.label, title: content.title, body };
}

function renderGapCard(gap) {
  const c = getGapContent(gap);
  if (!c) return '';
  return `
    <div class="gap-result-card">
      <p class="gap-result-card__label">${c.label}</p>
      <h3 class="gap-result-card__title">${c.title}</h3>
      <p class="gap-result-card__body">${c.body}</p>
    </div>
  `;
}

// ============================================================
// ANIMAÇÕES DO RELATÓRIO
// ============================================================
// ============================================================
// SUPABASE
// ============================================================
async function saveLeadToSupabase(result, nome, email) {
  try {
    const res = await fetch(CONFIG.supabase.url + '/rest/v1/leads?on_conflict=email', {
      method: 'POST',
      headers: {
        'apikey':        CONFIG.supabase.key,
        'Authorization': 'Bearer ' + CONFIG.supabase.key,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify({
        nome:           nome,
        email:          email,
        p1_faturacao:   answers.P1,
        p2_audiencia:   answers.P2,
        p3_resposta:    answers.P3,
        p4_email:       answers.P4,
        p5_crm:         answers.P5,
        p6_followup:    answers.P6,
        p7_leads_mes:   answers.P7,
        p8_contexto:    answers.P8,
        p9_modelo:      answers.P9,
        score:          result.score,
        categoria:      result.categoria,
        anti_fit:       result.anti_fit,
        gaps:           result.gapsMostrar.map(g => g.id),
        custo_estimado: result.vendasPerdidasMes
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && data[0].id) {
        insertedLeadId = data[0].id;
        console.log('[supabase] lead criada:', insertedLeadId);
      }
    }
  } catch (err) {
    console.error('[supabase] erro ao guardar lead:', err);
  }
}

function animateCountUp(el, target, duration, prefix, suffix) {
  const start = performance.now();
  function update(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = prefix + Math.round(eased * target).toLocaleString('pt-PT') + suffix;
    if (t < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function initReportAnimations(score, vendasPerdidasMes, email) {
  const scoreEl = document.querySelector('.report__score-num');
  if (scoreEl) animateCountUp(scoreEl, score, 1200, '', '');

  const bar = document.querySelector('.report__score-bar');
  if (bar) setTimeout(() => { bar.style.width = score + '%'; }, 300);

  const costEl = document.querySelector('.report__cost-value');
  if (costEl && vendasPerdidasMes >= 200) {
    animateCountUp(costEl, vendasPerdidasMes, 1200, '~', '€/mês');
  }

  const waField = document.getElementById('waField');
  if (waField) {
    waField.addEventListener('blur', async () => {
      const wa = waField.value.trim();
      if (!wa) return;

      if (typeof track === 'function') track('whatsapp_field_filled');

      try {
        const res = await fetch(
          CONFIG.supabase.url + '/rest/v1/leads?id=eq.' + insertedLeadId, {
          method: 'PATCH',
          headers: {
            'apikey':        CONFIG.supabase.key,
            'Authorization': 'Bearer ' + CONFIG.supabase.key,
            'Content-Type':  'application/json',
            'Prefer':        'return=minimal'
          },
          body: JSON.stringify({ whatsapp: wa })
        });
        console.log('[wa] status:', res.status);
      } catch (err) {
        console.error('[supabase] erro ao guardar whatsapp:', err);
      }
    }, { once: true });
  }

  const ctaBtn    = document.getElementById('ctaCalendly');
  const ctaNote   = document.getElementById('ctaNote');
  const waFieldBtn = document.getElementById('waField');

  if (waFieldBtn && ctaBtn) {
    waFieldBtn.addEventListener('input', () => {
      const hasValue = waFieldBtn.value.trim().length >= 9;
      ctaBtn.classList.toggle('is-locked', !hasValue);
      if (ctaNote) {
        ctaNote.textContent = hasValue
          ? 'Ótimo — clica para agendar a chamada.'
          : 'Deixa o teu WhatsApp para activar o agendamento.';
      }
    });

    ctaBtn.addEventListener('click', () => {
      if (ctaBtn.disabled) return;
      if (typeof track === 'function') track('calendly_cta_click');

      Calendly.initPopupWidget({
        url: 'https://calendly.com/d/cvwm-txr-qnh?background_color=2c3e2d&text_color=f5f0e8&primary_color=8b6f47'
      });
    });
  }
}
