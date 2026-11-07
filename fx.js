/* Cabrera Elite — efectos suaves (solo estética). Respeta "reducir movimiento". */
(function(){
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var d=document,de=d.documentElement;
  var bar=d.createElement('div');bar.id='ce-progress';bar.setAttribute('aria-hidden','true');d.body.appendChild(bar);
  var nav=d.querySelector('nav.top'),plate=d.querySelector('.hero-plate'),ticking=false;
  function onScroll(){
    if(ticking)return;ticking=true;
    requestAnimationFrame(function(){
      var h=de.scrollHeight-innerHeight,y=scrollY||pageYOffset;
      bar.style.transform='scaleX('+(h>0?Math.min(1,y/h):0)+')';
      if(nav)nav.classList.toggle('scrolled',y>20);
      ticking=false;
    });
  }
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  if(reduce)return;
  de.classList.add('js-fx');
  // texto del hero entra por líneas
  d.querySelectorAll('.hero-eyebrow,.hero-free,h1.hero-title,.hero p.lead,.hero-actions').forEach(function(el,i){el.classList.add('hl');el.style.setProperty('--d',(.1+i*.14)+'s')});
  // reveals con escalonado
  var sel=['.section-head','.trust .wrap>div','.program','.player','.plan-card','.about .wrap>*','.faq details','.location .wrap>*','.free-eval .wrap>*','.safety .wrap>*','.cta-band .wrap>*','.team .wrap>*'];
  var seen=new Set();
  d.querySelectorAll(sel.join(',')).forEach(function(el){
    if(seen.has(el)||el.closest('.hero'))return;seen.add(el);
    el.classList.add('rv');
    var sib=el.parentElement?Array.prototype.indexOf.call(el.parentElement.children,el):0;
    el.style.setProperty('--d',Math.min(sib%6,5)*.08+'s');
  });
  if(!('IntersectionObserver' in window)){d.querySelectorAll('.rv').forEach(function(e){e.classList.add('in')});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){
    if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);count(e.target)}
  })},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  d.querySelectorAll('.rv').forEach(function(e){io.observe(e)});
  // contadores (18 years, etc.)
  function count(root){
    root.querySelectorAll&&root.querySelectorAll('.trust b').forEach(run);
    if(root.matches&&root.matches('.trust .wrap>div')){var b=root.querySelector('b');b&&run(b)}
  }
  function run(b){
    if(b._c)return;b._c=1;var t=b.textContent,m=t.match(/^(\d+)(.*)$/);if(!m)return;
    var n=+m[1],t0=null;
    (function step(ts){t0=t0||ts;var p=Math.min(1,(ts-t0)/1200),e=1-Math.pow(1-p,3);
      b.textContent=Math.round(n*e)+m[2];
      if(p<1)requestAnimationFrame(step);else b.textContent=t;})(performance.now());
  }
  // parallax suave del sello del hero (solo con puntero fino y pantallas grandes)
  if(plate&&matchMedia('(min-width:900px) and (pointer:fine)').matches){
    var hero=d.querySelector('.hero');
    hero.addEventListener('mousemove',function(e){
      var r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      plate.style.transform='translate3d('+(x*-22)+'px,'+(y*-16)+'px,0) rotate('+(x*3)+'deg)';plate.style.animation='none';
    });
    hero.addEventListener('mouseleave',function(){plate.style.transform='';plate.style.animation=''});
  }
})();
