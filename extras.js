/* Renders optional content from site-config.js. Anything left empty in the config stays hidden. */
(function(){
  var C = window.CE_CONFIG || {};
  function lang(){
    var l=null; try{ l=new URLSearchParams(location.search).get('lang')||localStorage.getItem('ce_lang'); }catch(e){}
    return l==='es'?'es':'en';
  }
  function pick(o, base){ var l=lang(); return o[base+'_'+l] || o[base+'_en'] || o[base+'_es'] || ''; }
  function el(tag, cls, txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
  function safeUrl(u){ return /^https:\/\//i.test(u||''); }
  function safeImg(u){ return /^(images\/[\w\-\/.]+|https:\/\/[^\s"'<>]+)$/i.test(u||''); }
  function show(id, on){ var s=document.getElementById(id); if(s) s.hidden = !on; }

  function render(){
    // Google review + social links
    document.querySelectorAll('[data-ce="review"]').forEach(function(a){
      if(safeUrl(C.googleReviewUrl)){ a.href=C.googleReviewUrl; a.hidden=false; } else a.hidden=true;
    });
    document.querySelectorAll('[data-ce="facebook"]').forEach(function(a){
      if(safeUrl(C.facebookUrl)){ a.href=C.facebookUrl; a.hidden=false; } else a.hidden=true;
    });
    document.querySelectorAll('[data-ce="youtube"]').forEach(function(a){
      if(safeUrl(C.youtubeUrl)){ a.href=C.youtubeUrl; a.hidden=false; } else a.hidden=true;
    });

    // Athletes per coach (adds a card to the safety grid)
    var grid = document.querySelector('#safety .safe-grid');
    if(grid){
      var old = document.getElementById('ceCoachCard'); if(old) old.remove();
      var n = parseInt(C.athletesPerCoach, 10);
      if(n > 0){
        var es = lang()==='es', card = el('div','safe-card'); card.id='ceCoachCard';
        card.appendChild(el('h3','', es?'Atención personalizada':'Personal attention'));
        card.appendChild(el('p','', es?('Máximo '+n+' atletas por entrenador en cada sesión.'):('Up to '+n+' athletes per coach in each session.')));
        grid.appendChild(card);
      }
    }

    // Testimonials
    var t = (C.testimonials||[]).filter(function(x){ return pick(x,'text'); });
    var tw = document.getElementById('ceTestimonialsList');
    if(tw){ tw.textContent=''; t.forEach(function(x){
      var q=el('figure','ce-quote'); q.appendChild(el('blockquote','', '“'+pick(x,'text')+'”'));
      var cap=el('figcaption'); cap.appendChild(el('b','',x.name||'')); var r=pick(x,'role'); if(r) cap.appendChild(el('span','',' · '+r));
      q.appendChild(cap); tw.appendChild(q); }); }
    show('testimonials', t.length>0);

    // Gallery
    var g = (C.gallery||[]).filter(function(x){ return safeImg(x.src); });
    var gw = document.getElementById('ceGalleryList');
    if(gw){ gw.textContent=''; g.forEach(function(x){
      var i=el('img'); i.src=x.src; i.alt=pick(x,'alt'); i.loading='lazy'; gw.appendChild(i); }); }
    show('gallery', g.length>0);

    // Featured athletes
    var f = (C.featuredAthletes||[]).filter(function(x){ return x.name; });
    var fw = document.getElementById('ceFeaturedList');
    if(fw){ fw.textContent=''; f.forEach(function(x){
      var c=el('div','ce-ath'); if(safeImg(x.photo)){ var i=el('img'); i.src=x.photo; i.alt=x.name; i.loading='lazy'; c.appendChild(i); }
      c.appendChild(el('b','',x.name)); var d=pick(x,'detail'); if(d) c.appendChild(el('span','',d)); fw.appendChild(c); }); }
    show('featured', f.length>0);

    // Offers (referrals, siblings, camps...)
    var o = (C.offers||[]).filter(function(x){ return pick(x,'title'); });
    var ow = document.getElementById('ceOffersList');
    if(ow){ ow.textContent=''; o.forEach(function(x){
      var c=el('div','safe-card'); c.appendChild(el('h3','',pick(x,'title'))); var tx=pick(x,'text'); if(tx) c.appendChild(el('p','',tx)); ow.appendChild(c); }); }
    show('offers', o.length>0);
  }
  window.addEventListener('langchange', render);
  render();
})();
