/* quiz.js — Diagnóstico de Lançamento · lógica, score e relatório condicional */

// ============================================================
// DADOS DAS PERGUNTAS
// ============================================================
const QUESTIONS = [
  {
    id: 'P1', num: '01',
    text: 'Qual é o tamanho da tua lista de email activa?',
    options: [
      { label: 'Menos de 500',            value: 'menos_500' },
      { label: 'Entre 500 e 1.000',       value: '500_1k'   },
      { label: 'Entre 1.000 e 5.000',     value: '1k_5k'    },
      { label: 'Mais de 5.000',           value: 'mais_5k'  },
    ],
  },
  {
    id: 'P2', num: '02',
    text: 'Quantos seguidores activos tens no Instagram (pessoas que comentam, respondem às stories ou enviam DMs)?',
    options: [
      { label: 'Menos de 500',            value: 'menos_500' },
      { label: 'Entre 500 e 2.000',       value: '500_2k'   },
      { label: 'Entre 2.000 e 10.000',    value: '2k_10k'   },
      { label: 'Mais de 10.000',          value: 'mais_10k' },
    ],
  },
  {
    id: 'P3', num: '03',
    text: 'O que vendes como oferta principal?',
    options: [
      { label: 'Um curso ou programa online',              value: 'curso'     },
      { label: 'Uma mentoria de grupo',                    value: 'grupo'     },
      { label: 'Sessões ou serviço individual',            value: 'individual'},
      { label: 'Ainda não vendo nada',                     value: 'nada'      },
    ],
  },
  {
    id: 'P4', num: '04',
    text: 'A que preço vendes o teu produto ou programa principal?',
    options: [
      { label: 'Menos de 100€',           value: 'menos_100' },
      { label: 'Entre 100€ e 300€',       value: '100_300'  },
      { label: 'Entre 300€ e 1.000€',     value: '300_1k'   },
      { label: 'Mais de 1.000€',          value: 'mais_1k'  },
    ],
  },
  {
    id: 'P5', num: '05',
    text: 'Quantos lançamentos fazes por ano?',
    options: [
      { label: 'Nunca fiz um lançamento a sério', value: 'nenhum' },
      { label: '1 por ano',                        value: 'um'     },
      { label: '2 a 3 por ano',                    value: 'dois_tres'},
      { label: '4 ou mais por ano',                value: 'quatro' },
    ],
  },
  {
    id: 'P6', num: '06',
    text: 'Quanto faturou o teu último lançamento?',
    options: [
      { label: 'Não sei / nunca medi',    value: 'nao_sei'  },
      { label: 'Menos de 2.000€',         value: 'menos_2k' },
      { label: 'Entre 2.000€ e 10.000€',  value: '2k_10k'   },
      { label: 'Mais de 10.000€',         value: 'mais_10k' },
    ],
  },
  {
    id: 'P7', num: '07',
    text: 'Antes de abrires o carrinho, aqueces a lista (conteúdo, aulas, emails de antecipação)?',
    options: [
      { label: 'Sim, com uma sequência estruturada',       value: 'estruturado' },
      { label: 'Faço algo, mas informal',                  value: 'informal'    },
      { label: 'Não, abro o carrinho directamente',       value: 'direto'      },
      { label: 'Não tenho sequência de emails montada',    value: 'sem_seq'     },
    ],
  },
  {
    id: 'P8', num: '08',
    text: 'Como está montado o teu lançamento hoje?',
    options: [
      { label: 'Tenho um sistema/sequência montado que reutilizo', value: 'sistema'    },
      { label: 'Monto tudo à mão, de cada vez',                    value: 'mao'        },
      { label: 'Contrato uma agência ou lançador',                 value: 'agencia'    },
      { label: 'Não tenho processo: cada lançamento é diferente', value: 'sem_proc'   },
    ],
  },
  {
    id: 'P9', num: '09',
    text: 'O que mais te trava no próximo lançamento?',
    options: [
      { label: 'Falta de tempo para o montar',              value: 'tempo'     },
      { label: 'Não sei porque rende menos do que devia',   value: 'porque'    },
      { label: 'Faço tudo sozinho: depende todo de mim',   value: 'sozinho'   },
      { label: 'Falta-me a parte técnica / de IA',          value: 'tecnica'   },
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

  saveLeadToSystemeio(result, name, email);

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
    initReportAnimations(result.score, result.gapLancamento, email);
  }, 800);
}

// ============================================================
// CÁLCULO DE SCORE E DA CONTA (gap por lançamento)
// ============================================================
function calculateResult() {
  const { P1, P2, P3, P4, P5, P6, P7, P8, P9 } = answers;

  let anti_fit = false;

  // Anti-fit: sem produto para lançar, ou sem audiência nenhuma
  if (P3 === 'nada') anti_fit = true;
  if (P1 === 'menos_500' && P2 === 'menos_500') anti_fit = true;

  // --- SCORE: prontidão do lançamento (0-100) ---
  let score = 100;

  // Aquecimento da lista (P7)
  if (P7 === 'informal') score -= 8;
  if (P7 === 'direto')   score -= 15;
  if (P7 === 'sem_seq')  score -= 18;

  // Montagem / dependência (P8)
  if (P8 === 'mao')      score -= 15;
  if (P8 === 'agencia')  score -= 5;
  if (P8 === 'sem_proc') score -= 20;

  // Trava principal (P9)
  if (P9 === 'porque')   score -= 10;
  if (P9 === 'sozinho')  score -= 8;
  if (P9 === 'tecnica')  score -= 8;
  if (P9 === 'tempo')    score -= 5;

  // Nunca mediu / nunca lançou
  if (P6 === 'nao_sei')  score -= 10;
  if (P5 === 'nenhum')   score -= 8;

  score = Math.max(0, Math.min(100, score));
  const categoria = score < 40 ? 'critico' : score < 70 ? 'em_margem' : 'solido';

  // --- A CONTA: potencial e gap por lançamento ---
  const listaMid = { menos_500: 300, '500_1k': 750, '1k_5k': 3000, mais_5k: 8000 }[P1] || 750;
  const precoMid = { menos_100: 60, '100_300': 200, '300_1k': 600, mais_1k: 1500 }[P4] || 200;
  const CONV = 0.015; // conversão modesta de 1,5%
  const potencial = Math.round(listaMid * CONV * precoMid);

  const ultimoMap = { menos_2k: 1000, '2k_10k': 6000, mais_10k: 15000 };
  const ultimoConhecido = P6 in ultimoMap;
  const ultimo = ultimoMap[P6] || 0;
  const gapLancamento = ultimoConhecido ? Math.max(0, potencial - ultimo) : 0;

  const lancAno = { nenhum: 0, um: 1, dois_tres: 2, quatro: 4 }[P5] || 0;

  // --- FALHAS DE LANÇAMENTO activas (mostrar top 3) ---
  const gapsActivos = [];

  if (P7 && P7 !== 'estruturado') {
    const pen = { informal: 8, direto: 15, sem_seq: 18 };
    gapsActivos.push({ id: 'A', pen: pen[P7] || 0, versao: P7 });
  }
  if (P8 === 'mao' || P8 === 'sem_proc') {
    const pen = { mao: 15, sem_proc: 20 };
    gapsActivos.push({ id: 'B', pen: pen[P8] || 0, versao: P8 });
  }
  if (P6 === 'nao_sei' || P9 === 'porque') {
    gapsActivos.push({ id: 'C', pen: 12, versao: P9 === 'porque' ? 'porque' : 'nao_sei' });
  }
  if (P9 === 'sozinho' || P9 === 'tecnica') {
    gapsActivos.push({ id: 'D', pen: 10, versao: P9 });
  }

  const gapsMostrar = gapsActivos.sort((a, b) => b.pen - a.pen).slice(0, 3);

  return {
    score, categoria, potencial, gapLancamento, ultimoConhecido,
    lancAno, gapsMostrar, tag: P9, anti_fit
  };
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
function renderReport({ score, categoria, potencial, gapLancamento, ultimoConhecido, lancAno, gapsMostrar, tag }) {
  const scoreColor = score < 40
    ? 'var(--terracotta)'
    : score < 70 ? '#A0824A' : 'var(--forest-mid)';

  const catLabel = { critico: 'Crítico', em_margem: 'Em Margem', solido: 'Sólido' }[categoria];
  const gapCount = gapsMostrar.length;

  // Bloco da conta
  let costEyebrow, costBlock;
  if (!ultimoConhecido) {
    costEyebrow = 'O potencial do teu próximo lançamento';
    costBlock = `<span class="report__cost-value"></span>
       <p class="report__cost-note">Com a tua lista e o teu preço, a uma conversão modesta de 1,5%, é este o tecto de um lançamento bem montado. Como nunca mediste o último, não dá para calcular o que ficou em cima da mesa, mas já vês o potencial que estás a deixar por explorar.</p>`;
  } else if (gapLancamento < 500) {
    costEyebrow = 'O que deixas em cima da mesa por lançamento';
    costBlock = `<p class="report__cost-edge">O teu último lançamento já anda perto do potencial da lista actual. O próximo salto não vem de espremer mais esta lista: vem de a fazer crescer e de montar o lançamento com mais sistema.</p>`;
  } else {
    const anual = lancAno >= 2 ? ` Multiplicado pelos teus lançamentos por ano, são milhares de euros por ano.` : '';
    costEyebrow = 'O que deixas em cima da mesa por lançamento';
    costBlock = `<span class="report__cost-value"></span>
       <p class="report__cost-note">Potencial da tua lista (a 1,5% de conversão, ao teu preço) menos o que o teu último lançamento faturou. É uma estimativa conservadora.${anual}</p>`;
  }

  const gapsBlock = gapCount > 0 ? gapsMostrar.map(renderGapCard).join('') : '';

  const edgeNote = gapCount > 0 && gapCount < 3
    ? `<p class="report__gaps-edge">Com um score de ${score}, as tuas falhas são pontuais. Mesmo assim, cada uma tem custo, e são corrigíveis rapidamente.</p>`
    : '';

  return `
    <div class="report__inner">

      <div class="report__opening">
        <p>${getOpeningText(tag)}</p>
      </div>

      <div class="report__score-block">
        <p class="eyebrow report__score-eyebrow">Prontidão do teu lançamento</p>
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
        <p class="eyebrow report__cost-eyebrow">${costEyebrow}</p>
        ${costBlock}
      </div>

      <div class="report__gaps">
        <p class="eyebrow report__gaps-eyebrow">${gapCount ? `As tuas ${gapCount} ${gapCount === 1 ? 'falha principal' : 'falhas principais'}` : 'As tuas falhas principais'}</p>
        <div class="report__gaps-list">
          ${gapsBlock}
          ${edgeNote}
        </div>
      </div>

      <div class="report__cta">
        <h3 class="report__cta-title">Identificaste as falhas. O próximo passo é montar o lançamento certo.</h3>
        <p class="report__cta-body">Num Diagnóstico de Lançamento de 30 minutos, olho para o teu caso específico e digo-te exactamente o que montar primeiro, e quanto podes recuperar. Sem pitch agressivo. Se não fizer sentido para o teu momento, digo-te eu.</p>
        <label class="report__wa-label" for="waField">WhatsApp (opcional, para te contactar directamente se preferires)</label>
        <input type="tel" id="waField" class="report__wa-input" placeholder="O teu número de WhatsApp">
        <button type="button" class="btn btn--primary report__cta-btn is-locked"
                id="ctaCalendly">
          Diagnóstico de Lançamento · 30 min →
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
        <h2 class="report__antifit-title">Ainda não é o momento, e digo-to com honestidade.</h2>
        <div class="report__antifit-body">
          <p>Um lançamento com sistema precisa de dois ingredientes que ainda estás a construir: uma audiência minimamente activa (lista e Instagram) e uma oferta que já vende.</p>
          <p>Sem esses dois, não há lançamento para montar, e não seria justo para ti nem para mim vender-te uma solução para um problema que ainda não tens.</p>
          <p>Quando tiveres uma lista a crescer e um produto que já vendes, volta cá. O diagnóstico vai fazer muito mais sentido, e o potencial vai ser real.</p>
          <p>Até lá, o melhor investimento é na audiência e na oferta. Não no lançamento.</p>
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
      'O teu problema não é falta de vontade. É que o lançamento depende todo de ti, e montá-lo à mão consome-te as semanas em que devias estar a criar e a vender.',
    porque:
      'Um lançamento que às vezes rende e às vezes não, sem saberes porquê, não é falta de sorte. É falta de sistema. Quando não sabes onde perdes, não sabes o que corrigir.',
    sozinho:
      'Fazes tudo sozinho. Isso é raro, e é também o teu limite. Um lançamento que só acontece quando tu o empurras não é um sistema. É um segundo emprego.',
    tecnica:
      'Sabes vender o que ensinas. O que te falta é a alavanca técnica: a IA que monta o lançamento em dias em vez de semanas. Não é a tua área, e não tem de ser.',
  };
  return texts[tag] || texts.porque;
}

function getCategoryText(categoria) {
  const texts = {
    critico:
      '<strong>O teu lançamento tem falhas em vários pontos.</strong> Não é um problema, é um ponto de partida. Os lançamentos com mais para corrigir são os que têm mais para ganhar. Em baixo estão as falhas com maior impacto imediato.',
    em_margem:
      '<strong>Tens audiência e oferta, mas estás a deixar dinheiro em cima da mesa.</strong> O problema não é o teu trabalho nem o teu produto. É o que acontece entre a lista e o carrinho. As falhas em baixo são corrigíveis, e o impacto é imediato.',
    solido:
      '<strong>Estás acima da média, e isso torna as falhas mais caras.</strong> Quando o resto funciona bem, uma falha num ponto específico custa proporcionalmente mais. Em baixo, pequenas em esforço de correcção, grandes em retorno.',
  };
  return texts[categoria] || texts.em_margem;
}

function getGapContent({ id, versao }) {
  const GAPS = {
    A: {
      label: 'AQUECIMENTO DA LISTA',
      title: 'Abres o carrinho a uma lista fria',
      body: {
        informal:
          'Fazes algum aquecimento, mas informal. O problema é que sem uma sequência estruturada de antecipação, a maior parte da lista chega ao dia da abertura sem contexto, e sem desejo. O lançamento vende-se antes de o carrinho abrir, não depois.',
        direto:
          'Abres o carrinho directamente, sem aquecer a lista. É o erro mais caro de todos: pedes a compra a pessoas que não foram preparadas para a querer. A conversão despenca, não porque a oferta é fraca, mas porque chegou fria.',
        sem_seq:
          'Não tens sequência de emails montada. Isso significa que o teu lançamento vive só do Instagram e do algoritmo, o único canal que não controlas. A lista é o activo que lança por ti, e está parado.',
      },
    },
    B: {
      label: 'MONTAGEM DO LANÇAMENTO',
      title: 'Montado à mão, e por isso inconsistente',
      body: {
        mao:
          'Montas tudo à mão, de cada vez. Isso tem dois custos: o tempo (semanas que te tiram de criar e ensinar) e a inconsistência (cada lançamento recomeça do zero, sem sistema que garanta o mesmo nível). Um lançamento que depende da tua energia disponível é uma lotaria.',
        sem_proc:
          'Não tens processo: cada lançamento é diferente. Sem sistema, é impossível saber o que funcionou e repetir. O que parece flexibilidade é, na prática, energia gasta a reinventar o mesmo caminho de cada vez.',
      },
    },
    C: {
      label: 'MEDIÇÃO E CAUSA',
      title: 'Não sabes onde o lançamento perde',
      body: {
        nao_sei:
          'Nunca mediste o que o lançamento faz. Sem números, não há diagnóstico, só sensações. Não dá para corrigir o que não se mede, e cada lançamento repete os mesmos buracos por não saberes onde eles estão.',
        porque:
          'Sentes que rende menos do que devia, mas não sabes porquê. Quase sempre a resposta está num de três sítios: aquecimento em falta, sequência fraca, ou oferta mal comunicada. O diagnóstico existe precisamente para isolar qual é o teu.',
      },
    },
    D: {
      label: 'DEPENDÊNCIA E ALAVANCA',
      title: 'O lançamento depende todo de ti',
      body: {
        sozinho:
          'Fazes tudo sozinho. Isso limita quantos lançamentos consegues fazer e a que qualidade, porque és tu o gargalo. Um sistema (com IA a montar as peças) tira-te do operacional e devolve-te ao que só tu podes fazer: criar e ensinar.',
        tecnica:
          'Falta-te a parte técnica e de IA. É exactamente aí que hoje se ganha velocidade: montar a sequência, a página e a qualificação em dias, não semanas. Não tens de ser tu a fazê-lo, tens de perceber o que está a ser feito e tê-lo feito por quem já o domina.',
      },
    },
  };

  const content = GAPS[id];
  if (!content) return null;

  const body = content.body[versao] || Object.values(content.body)[0];
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
// SUPABASE
// ============================================================
// Nota: os nomes de coluna (p1_faturacao, etc.) são herdados do diagnóstico
// antigo. Reutilizados por posição para não obrigar a migração da tabela.
// Mapeamento actual: p1=lista, p2=audiência, p3=oferta, p4=preço,
// p5=lançamentos/ano, p6=faturação último, p7=aquecimento, p8=montagem, p9=trava.
// custo_estimado = gap por lançamento. (Renomear colunas é opcional — ver SPEC.)
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
        custo_estimado: result.gapLancamento
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && data[0].id) {
        insertedLeadId = data[0].id;
      }
    }
  } catch (err) {
    console.error('[supabase] erro ao guardar lead:', err);
  }
}

// ============================================================
// SYSTEME.IO
// ============================================================
async function saveLeadToSystemeio(result, nome, email) {
  try {
    const gapsTexto = result.gapsMostrar.map(g => g.id).join(', ');

    const res = await fetch('/diagnostico/api/systemeio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        firstName: nome,
        fields: [
          { slug: 'quiz_score',     value: String(result.score) },
          { slug: 'quiz_categoria', value: result.categoria },
          { slug: 'quiz_custo',     value: String(result.gapLancamento) },
          { slug: 'quiz_gaps',      value: gapsTexto }
        ],
        tags: ['Lista_Celso']
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[systemeio] erro:', err);
    }
  } catch (err) {
    console.error('[systemeio] erro ao criar contacto:', err);
  }
}

// ============================================================
// ANIMAÇÕES DO RELATÓRIO
// ============================================================
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

function initReportAnimations(score, gapLancamento, email) {
  const scoreEl = document.querySelector('.report__score-num');
  if (scoreEl) animateCountUp(scoreEl, score, 1200, '', '');

  const bar = document.querySelector('.report__score-bar');
  if (bar) setTimeout(() => { bar.style.width = score + '%'; }, 300);

  const costEl = document.querySelector('.report__cost-value');
  if (costEl) {
    animateCountUp(costEl, gapLancamento, 1200, '~', '€ / lançamento');
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
          ? 'Ótimo, clica para agendar o diagnóstico.'
          : 'Deixa o teu WhatsApp para activar o agendamento.';
      }
    });

    ctaBtn.addEventListener('click', () => {
      if (ctaBtn.disabled) return;
      if (typeof track === 'function') track('calendly_cta_click');

      const nome = document.getElementById('gateName').value.trim();
      const email = submittedEmail;
      const baseUrl = 'https://calendly.com/celsop/auditoria';
      const params = new URLSearchParams({ name: nome, email: email });

      window.open(baseUrl + '?' + params.toString(), '_blank');
    });
  }
}
