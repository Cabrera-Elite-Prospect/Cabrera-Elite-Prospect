/* Cabrera Elite — anti-bot (Cloudflare Turnstile), compartido por el chat y los formularios.
   - Turnstile NO se descarga hasta que hace falta (el visitante empieza a escribir o a usar el chat).
   - Modo "interaction-only": casi siempre es invisible; solo aparece si Cloudflare sospecha de un bot.
   - La Site Key es pública. La Secret Key vive solo en el Worker y en Apps Script (nunca aquí). */
(function(){
var SITEKEY='0x4AAAAAAFvV0epFz9zFsEXB';
var queue=null, failed=false, handles=[];

function load(cb){
  if(window.turnstile){cb();return;}
  if(queue){queue.push(cb);return;}
  queue=[cb];
  window.__ceTsReady=function(){var q=queue;queue=null;q.forEach(function(f){try{f();}catch(e){}});};
  var s=document.createElement('script');
  s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__ceTsReady';
  s.async=true;s.defer=true;
  s.onerror=function(){queue=null;failed=true;handles.forEach(function(h){h.fail();});};
  document.head.appendChild(s);
}
function lang(){return document.documentElement.lang==='es'?'es':'en';}

/* mount(contenedor) -> { ensure(), token(ms), reset() } */
function mount(el){
  var h={tok:'',id:null,started:false,waiters:[]};
  handles.push(h);
  function got(t){h.tok=t||'';var w=h.waiters;h.waiters=[];w.forEach(function(f){f(h.tok);});}
  h.fail=function(){got('');};
  h.ensure=function(){
    if(h.started||!el)return;h.started=true;
    if(failed){setTimeout(h.fail,0);return;}
    load(function(){
      try{
        h.id=window.turnstile.render(el,{sitekey:SITEKEY,appearance:'interaction-only',theme:'dark',size:'flexible',language:lang(),
          callback:got,'expired-callback':function(){got('');},'error-callback':function(){got('');}});
      }catch(e){}
    });
  };
  /* Devuelve una promesa con el token ('' si no se pudo obtener a tiempo: el servidor decide qué hacer). */
  h.token=function(ms){
    h.ensure();
    return new Promise(function(res){
      if(h.tok)return res(h.tok);
      var t=setTimeout(function(){res('');},ms||12000);
      h.waiters.push(function(x){clearTimeout(t);res(x);});
    });
  };
  /* El token sirve una sola vez: pedir uno nuevo después de cada envío. */
  h.reset=function(){h.tok='';try{if(window.turnstile&&h.id!==null)window.turnstile.reset(h.id);}catch(e){}};
  return h;
}
window.ceCaptcha={siteKey:SITEKEY,mount:mount};
})();
