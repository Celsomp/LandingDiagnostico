window.track = function track(eventName) {
  if (typeof window.plausible === 'function') {
    window.plausible(eventName);
  } else {
    console.log('[track]', eventName);
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
