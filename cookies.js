/* Aviso de cookies opcional (EN/ES). Se carga en todas las páginas.
   - Sin elección: no se carga nada.
   - "Accept": se descarga y activa Google Analytics.
   - "Decline": Analytics no se descarga y no se vuelve a preguntar (se puede cambiar desde el pie de página). */
(function(){
var KEY='ce_cookie_consent'; // 'accepted' | 'declined'

var GA_ID='G-0Y1C5S67NL', gaLoaded=false;
/* Google Analytics NO se descarga ni se ejecuta hasta que el visitante acepta. */
function loadOptional(){
  if(gaLoaded)return;gaLoaded=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){dataLayer.push(arguments);};
  var s=document.createElement('script');s.async=true;
  s.src='https://www.googletagmanager.com/gtag/js?id='+GA_ID;document.head.appendChild(s);
  gtag('js',new Date());gtag('config',GA_ID);
}
/* Si rechaza (o cambia de opinión) se detienen las mediciones y se borran las cookies de Analytics. */
function stopOptional(){
  window['ga-disable-'+GA_ID]=true;
  var host=location.hostname.split('.'),doms=[location.hostname];
  for(var i=1;i<host.length-1;i++)doms.push('.'+host.slice(i).join('.'));
  document.cookie.split(';').forEach(function(k){
    var n=k.split('=')[0].trim();
    if(n==='_ga'||n.indexOf('_ga_')===0||n==='_gid'||n==='_gat')
      doms.concat(['']).forEach(function(d){document.cookie=n+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'+(d?';domain='+d:'');});
  });
}

var TXT={
 en:{title:'Cookies',
     body:'We use essential storage (like your language choice) and, only if you accept, Google Analytics cookies to understand how the site is used. You decide.',
     more:'Privacy Policy',accept:'Accept',decline:'Decline',prefs:'Cookie settings'},
 es:{title:'Cookies',
     body:'Usamos almacenamiento esencial (como tu idioma) y, solo si aceptas, cookies de Google Analytics para entender cómo se usa el sitio. Tú decides.',
     more:'Política de privacidad',accept:'Aceptar',decline:'Rechazar',prefs:'Configuración de cookies'}
};
function lang(){var l=null;try{l=localStorage.getItem('ce_lang');}catch(e){}return l==='es'?'es':'en';}
function get(){try{return localStorage.getItem(KEY);}catch(e){return null;}}
function set(v){try{localStorage.setItem(KEY,v);}catch(e){}}

var box;
function build(){
  if(box)return;
  var st=document.createElement('style');
  st.textContent='#ceCookie{position:fixed;left:14px;right:14px;bottom:60px;z-index:290;max-width:520px;background:#14111C;color:#F1EEE4;border:1px solid rgba(228,192,124,.45);border-radius:12px;padding:16px 18px;font:13.5px/1.55 Inter,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5)}'+
  '#ceCookie b{display:block;font:400 20px "Bebas Neue",Impact,"Arial Narrow",sans-serif;letter-spacing:.5px;color:#E4C07C;margin-bottom:4px}'+
  '#ceCookie p{margin:0 0 12px;color:rgba(241,238,228,.8)}#ceCookie a{color:#E4C07C}'+
  '#ceCookie .row{display:flex;gap:10px;flex-wrap:wrap}'+
  '#ceCookie button{font:700 13.5px Inter,sans-serif;border-radius:7px;padding:10px 18px;cursor:pointer;border:1.5px solid rgba(241,238,228,.35);background:transparent;color:#F1EEE4}'+
  '#ceCookie button.ok{background:#C9A15A;border-color:#C9A15A;color:#0B0A0F}';
  document.head.appendChild(st);
  box=document.createElement('div');box.id='ceCookie';box.setAttribute('role','dialog');box.setAttribute('aria-live','polite');
  box.innerHTML='<b></b><p></p><div class="row"><button class="ok" data-v="accepted"></button><button data-v="declined"></button></div>';
  box.addEventListener('click',function(e){
    var v=e.target&&e.target.getAttribute&&e.target.getAttribute('data-v');
    if(!v)return;set(v);hide();if(v==='accepted'){window['ga-disable-'+GA_ID]=false;loadOptional();}else stopOptional();
  });
  document.body.appendChild(box);
  text();
}
function text(){
  if(!box)return;var T=TXT[lang()];
  box.querySelector('b').textContent=T.title;
  var p=box.querySelector('p');
  p.innerHTML='';p.appendChild(document.createTextNode(T.body+' '));
  var a=document.createElement('a');a.href='terms.html#privacy'+(lang()==='es'?'-es':'');a.textContent=T.more;p.appendChild(a);
  box.querySelector('.ok').textContent=T.accept;
  box.querySelector('[data-v=declined]').textContent=T.decline;
  var pl=document.getElementById('cookiePrefs');if(pl)pl.textContent=T.prefs;
}
function show(){build();box.style.display='block';text();}
function hide(){if(box)box.style.display='none';}

function init(){
  var pl=document.getElementById('cookiePrefs');
  if(pl)pl.addEventListener('click',function(e){e.preventDefault();show();});
  var c=get();
  if(c==='accepted')loadOptional();
  else if(c!=='declined')show();
  text();
}
window.addEventListener('langchange',text);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
