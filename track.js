/* Conversion events for Google Analytics. gtag is only real after the visitor accepts cookies (see cookies.js);
   before that it is a no-op, so nothing is sent without consent. No personal data is sent. */
(function(){
  function ev(n, p){ try{ if(window.gtag) window.gtag('event', n, p || {}); }catch(e){} }
  window.ceTrack = ev;
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if(!a) return;
    var h = a.getAttribute('href') || '';
    if(h.indexOf('wa.me/') > -1) ev('contact', { method: 'whatsapp' });
    else if(h.indexOf('tel:') === 0) ev('contact', { method: 'phone' });
    else if(h.indexOf('mailto:') === 0) ev('contact', { method: 'email' });
    else if(h.indexOf('maps.app.goo.gl') > -1) ev('get_directions');
    else if(h.indexOf('register.html?plan=') > -1) ev('select_plan', { plan: decodeURIComponent(h.split('plan=')[1] || '') });
    else if(h.indexOf('register.html') > -1) ev('start_registration');
  }, true);
})();
