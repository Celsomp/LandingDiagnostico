// Consentimento de cookies, sem bibliotecas. Espelha src/scripts/consentimento.ts do
// site principal (celsopereira.pt): a mesma chave, o mesmo formato, a mesma API.
// Em celsopereira.pt/diagnostico/ (mesmo domínio), a escolha feita num lado vale no
// outro. Em www.gestoria.pt e no *.vercel.app o localStorage é outro: pergunta de novo.
//
// Guarda { marketing, analise, data, versao: 1 } em localStorage ('cp-consentimento')
// durante 12 meses e expõe window.cpConsentimento (obter, definir, abrir, quandoConsentir).
// Nenhum script de marketing carrega sem passar por quandoConsentir().
(function () {
  var CHAVE = 'cp-consentimento';
  var VERSAO = 1;
  var VALIDADE_MESES = 12;
  var EVENTO = 'cp:consentimento';
  // Esta página só tem o Meta Pixel. Se entrar análise (GA4), junta-se 'analise'.
  var CATEGORIAS_ACTIVAS = ['marketing'];

  // Se o localStorage estiver bloqueado, a escolha vale só para esta visita.
  var emMemoria = null;

  function expirou(escolha) {
    var limite = new Date(escolha.data);
    limite.setMonth(limite.getMonth() + VALIDADE_MESES);
    return isNaN(limite.getTime()) || limite.getTime() <= Date.now();
  }

  function obter() {
    var escolha = emMemoria;
    try {
      var guardado = localStorage.getItem(CHAVE);
      if (guardado) escolha = JSON.parse(guardado);
    } catch (e) {
      // Sem acesso ou valor corrompido: fica o que houver em memória.
    }
    if (!escolha || typeof escolha !== 'object' || escolha.versao !== VERSAO || expirou(escolha)) {
      try { localStorage.removeItem(CHAVE); } catch (e) {}
      emMemoria = null;
      return null;
    }
    return escolha;
  }

  function definir(escolha) {
    escolha = escolha || {};
    var valor = {
      marketing: escolha.marketing === true,
      analise: escolha.analise === true,
      data: new Date().toISOString(),
      versao: VERSAO
    };
    emMemoria = valor;
    try { localStorage.setItem(CHAVE, JSON.stringify(valor)); } catch (e) {}
    esconderBanner();
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: valor }));
    return valor;
  }

  /** Corre o callback uma vez, agora ou quando a pessoa aceitar a categoria. */
  function quandoConsentir(categoria, callback) {
    var escolha = obter();
    if (escolha && escolha[categoria]) {
      callback();
      return;
    }
    function ouvir(e) {
      if (!e.detail[categoria]) return;
      window.removeEventListener(EVENTO, ouvir);
      callback();
    }
    window.addEventListener(EVENTO, ouvir);
  }

  // ── Banner ────────────────────────────────────────────────────

  var banner = document.querySelector('[data-banner-cookies]');
  /** Quem abriu o banner pelo rodapé, para lhe devolver o foco no fim. */
  var quemAbriu = null;

  // Enquanto o banner está à vista, o fim da página sobe o suficiente para nada ficar tapado.
  var folga = typeof ResizeObserver === 'function'
    ? new ResizeObserver(function () {
        document.body.style.paddingBottom = banner && !banner.hidden ? banner.offsetHeight + 'px' : '';
      })
    : null;

  function mostrarBanner(focar) {
    if (!banner) return;
    banner.hidden = false;
    if (folga) folga.observe(banner);
    else document.body.style.paddingBottom = banner.offsetHeight + 'px';
    if (focar) banner.focus();
  }

  function esconderBanner() {
    if (!banner || banner.hidden) return;
    var tinhaFoco = banner.contains(document.activeElement);
    banner.hidden = true;
    if (folga) folga.disconnect();
    document.body.style.paddingBottom = '';
    // O foco não pode ficar num elemento escondido: volta a quem abriu o banner.
    if (tinhaFoco && quemAbriu) quemAbriu.focus({ preventScroll: true });
    quemAbriu = null;
  }

  function abrir() {
    if (CATEGORIAS_ACTIVAS.length === 0) return;
    quemAbriu = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    mostrarBanner(true);
  }

  if (banner) {
    banner.querySelector('[data-cookies-aceitar]').addEventListener('click', function () {
      var tudo = {};
      CATEGORIAS_ACTIVAS.forEach(function (c) { tudo[c] = true; });
      definir(tudo);
    });
    banner.querySelector('[data-cookies-recusar]').addEventListener('click', function () {
      definir({});
    });
  }
  document.querySelectorAll('[data-cookies-abrir]').forEach(function (botao) {
    botao.addEventListener('click', abrir);
  });

  window.cpConsentimento = { obter: obter, definir: definir, abrir: abrir, quandoConsentir: quandoConsentir };

  // Primeira visita (ou escolha expirada): o banner aparece sem roubar o foco.
  if (CATEGORIAS_ACTIVAS.length > 0 && !obter()) mostrarBanner(false);
})();
