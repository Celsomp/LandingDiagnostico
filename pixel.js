// Meta Pixel — só carrega depois de consentimento de marketing (consentimento.js).
// Antes disso, window.fbq não existe e tracking.js não envia nada para a Meta.
// Sem <noscript>: a imagem de fallback disparava sem JavaScript e sem consentimento.
(function () {
  var PIXEL_ID = '1411141222388292';

  function carregarPixel() {
    if (window.fbq) return;
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  if (window.cpConsentimento) window.cpConsentimento.quandoConsentir('marketing', carregarPixel);
})();
