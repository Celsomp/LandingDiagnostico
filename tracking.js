// Eventos que mapeiam para eventos standard do Meta Pixel (melhor para otimização de campanhas).
// Tudo o que não estiver aqui é enviado como evento custom com o mesmo nome.
var FB_STANDARD_EVENTS = {
  quiz_email_submitted: 'Lead',
  quiz_completed: 'CompleteRegistration',
  calendly_cta_click: 'Contact',
  calendly_event_scheduled: 'Schedule'
};

window.track = function track(eventName) {
  if (typeof window.plausible === 'function') {
    window.plausible(eventName);
  } else {
    console.log('[track]', eventName);
  }

  if (typeof window.fbq === 'function') {
    var standardEvent = FB_STANDARD_EVENTS[eventName];
    if (standardEvent) {
      window.fbq('track', standardEvent);
    } else {
      window.fbq('trackCustom', eventName);
    }
  }
};

window.addEventListener('message', function (e) {
  if (e.origin !== 'https://calendly.com') return;
  if (e.data && e.data.event === 'calendly.event_scheduled') {
    window.track('calendly_event_scheduled');
  }
});

document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-track]');
  if (el) window.track(el.dataset.track);
});
