/* Cabrera Elite — AI chat widget (EN/ES). Talks to the Cloudflare Worker in chat-worker/.
   Stays hidden until CHAT_URL is set. */
(function(){
var CHAT_URL = 'https://cabrera-elite-chat.elvisjunior090912.workers.dev';
if(!CHAT_URL)return;
// Cloudflare Turnstile (anti-bot). Pega aqui la "Site Key" publica; si queda vacio, el chat funciona sin el check.
var TURNSTILE_SITEKEY='';

var TXT={
 en:{open:'Chat with us',title:'Cabrera Elite Assistant',sub:'AI assistant · not a person',close:'Close',
     hello:"Hi! I'm the virtual assistant of Cabrera Elite. Ask me about plans, schedule, the free evaluation or how to register.",
     ph:'Type your question…',send:'Send',think:'Typing…',
     err:'Sorry, I could not answer right now. Please call +1 (863) 268-9210 or email cabreraeliteprospect@gmail.com.',
     lim:'Too many messages for now. Please try again later or call +1 (863) 268-9210.',
     cap:'Security check failed. Please reload the page and try again, or call +1 (863) 268-9210.',
     note:"AI replies can contain mistakes. Don't share card numbers or health details. Messages are processed by our AI provider.",priv:'Privacy Policy'},
 es:{open:'Chatea con nosotros',title:'Asistente Cabrera Elite',sub:'Asistente de IA · no es una persona',close:'Cerrar',
     hello:'¡Hola! Soy el asistente virtual de Cabrera Elite. Pregúntame por los planes, horarios, la evaluación gratis o cómo registrarte.',
     ph:'Escribe tu pregunta…',send:'Enviar',think:'Escribiendo…',
     err:'Lo siento, no pude responder ahora. Llama al +1 (863) 268-9210 o escribe a cabreraeliteprospect@gmail.com.',
     lim:'Demasiados mensajes por ahora. Intenta más tarde o llama al +1 (863) 268-9210.',
     cap:'No se pudo verificar la seguridad. Recarga la página e inténtalo de nuevo, o llama al +1 (863) 268-9210.',
     note:'Las respuestas de IA pueden tener errores. No compartas números de tarjeta ni datos de salud. Los mensajes los procesa nuestro proveedor de IA.',priv:'Política de privacidad'}
};
function lang(){var l=null;try{l=localStorage.getItem('ce_lang');}catch(e){}return l==='es'?'es':'en';}
function T(){return TXT[lang()];}

var st=document.createElement('style');
st.textContent=
'#ceChatBtn{position:fixed;right:14px;bottom:14px;z-index:280;background:#C9A15A;color:#0B0A0F;border:none;border-radius:28px;padding:13px 20px;font:700 14px Inter,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.45)}'+
'#ceChatBtn:hover{background:#E4C07C}'+
'#ceChat{position:fixed;right:14px;bottom:14px;z-index:285;width:min(380px,calc(100vw - 28px));height:min(560px,calc(100vh - 28px));display:none;flex-direction:column;background:#14111C;color:#F1EEE4;border:1px solid rgba(228,192,124,.45);border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.6);overflow:hidden;font:14px/1.5 Inter,sans-serif}'+
'#ceChat.open{display:flex}'+
'#ceChat header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;background:linear-gradient(160deg,#5B3A96,#241638);border-bottom:1px solid rgba(228,192,124,.3)}'+
'#ceChat header b{display:block;font:400 20px "Bebas Neue",Impact,"Arial Narrow",sans-serif;letter-spacing:.5px;color:#E4C07C;line-height:1.1}'+
'#ceChat header span{font-size:11.5px;color:rgba(241,238,228,.7)}'+
'#ceChat header button{background:none;border:none;color:#F1EEE4;font-size:24px;line-height:1;cursor:pointer;padding:4px 8px}'+
'#ceMsgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}'+
'#ceMsgs div{max-width:86%;padding:9px 12px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word}'+
'#ceMsgs .bot{align-self:flex-start;background:rgba(241,238,228,.08)}'+
'#ceMsgs .me{align-self:flex-end;background:#C9A15A;color:#0B0A0F}'+
'#ceMsgs .sys{align-self:center;max-width:100%;font-size:11.5px;color:rgba(241,238,228,.55);text-align:center;padding:2px}'+
'#ceChat form{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(241,238,228,.12)}'+
'#ceChat input{flex:1;min-width:0;background:rgba(241,238,228,.06);border:1px solid rgba(241,238,228,.2);color:#F1EEE4;border-radius:8px;padding:11px;font:14px Inter,sans-serif}'+
'#ceChat input:focus{outline:2px solid #E4C07C;outline-offset:1px}'+
'#ceChat form button{background:#C9A15A;color:#0B0A0F;border:none;border-radius:8px;padding:0 16px;font:700 13.5px Inter,sans-serif;cursor:pointer}'+
'#ceChat form button:disabled{opacity:.5;cursor:not-allowed}'+
'#ceChat .note{padding:0 12px 10px;font-size:10.5px;color:rgba(241,238,228,.45);line-height:1.4}#ceChat .note a{color:#E4C07C}'+
'@media (max-width:520px){#ceChatBtn{bottom:62px}#ceChat{bottom:8px;right:8px;width:calc(100vw - 16px);height:calc(100vh - 16px)}}';
document.head.appendChild(st);

var btn=document.createElement('button');btn.id='ceChatBtn';btn.type='button';btn.setAttribute('aria-haspopup','dialog');
var box=document.createElement('div');box.id='ceChat';box.setAttribute('role','dialog');box.setAttribute('aria-label','Chat');
box.innerHTML='<header><div><b></b><span></span></div><button type="button" id="ceChatX">&times;</button></header>'+
 '<div id="ceMsgs" aria-live="polite"></div>'+
 '<div id="ceCap" style="padding:0 10px"></div>'+
 '<form id="ceChatForm"><input id="ceChatIn" type="text" maxlength="800" autocomplete="off"><button type="submit"></button></form>'+
 '<div class="note"></div>';
document.body.appendChild(btn);document.body.appendChild(box);

var msgs=box.querySelector('#ceMsgs'),form=box.querySelector('#ceChatForm'),inp=box.querySelector('#ceChatIn'),send=form.querySelector('button');
var history=[],busy=false,started=false;

function labels(){
  var t=T();btn.textContent=t.open;
  box.querySelector('header b').textContent=t.title;box.querySelector('header span').textContent=t.sub;
  box.querySelector('#ceChatX').setAttribute('aria-label',t.close);
  inp.placeholder=t.ph;inp.setAttribute('aria-label',t.ph);send.textContent=t.send;
  var n=box.querySelector('.note');n.textContent=t.note+' ';
  var a=document.createElement('a');a.href='terms.html#privacy'+(lang()==='es'?'-es':'');a.target='_blank';a.rel='noopener';a.textContent=t.priv;n.appendChild(a);
}
function add(cls,text){var d=document.createElement('div');d.className=cls;d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;return d;}

var capId=null,capToken='',capWaiters=[];
function capDone(tok){capToken=tok||'';var w=capWaiters;capWaiters=[];w.forEach(function(f){f(capToken);});}
function loadCap(){
  if(!TURNSTILE_SITEKEY||capId!==null)return;
  capId='loading';
  window.__ceCapReady=function(){
    try{
      capId=window.turnstile.render('#ceCap',{sitekey:TURNSTILE_SITEKEY,appearance:'interaction-only',size:'flexible',theme:'dark',language:lang(),
        callback:capDone,'expired-callback':function(){capDone('');},'error-callback':function(){capDone('');}});
    }catch(e){capId=null;}
  };
  var sc=document.createElement('script');
  sc.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__ceCapReady';
  sc.async=true;sc.defer=true;document.head.appendChild(sc);
}
function getCap(){
  return new Promise(function(res){
    if(!TURNSTILE_SITEKEY)return res('');
    if(capToken)return res(capToken);
    var t=setTimeout(function(){res('');},15000);
    capWaiters.push(function(tok){clearTimeout(t);res(tok);});
  });
}
function resetCap(){capToken='';try{if(window.turnstile&&capId&&capId!=='loading')window.turnstile.reset(capId);}catch(e){}}
function open(){
  labels();loadCap();box.classList.add('open');btn.style.display='none';
  if(!started){started=true;add('bot',T().hello);}
  setTimeout(function(){inp.focus();},50);
}
function close(){box.classList.remove('open');btn.style.display='';btn.focus();}
btn.addEventListener('click',open);
box.querySelector('#ceChatX').addEventListener('click',close);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&box.classList.contains('open'))close();});
window.addEventListener('langchange',labels);

form.addEventListener('submit',function(e){
  e.preventDefault();if(busy)return;
  var text=inp.value.trim();if(!text)return;
  inp.value='';add('me',text);history.push({role:'user',content:text});
  busy=true;send.disabled=true;var wait=add('bot',T().think);
  getCap().then(function(tok){
  var ctrl=new AbortController(),to=setTimeout(function(){ctrl.abort();},25000);
  return fetch(CHAT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history.slice(-12),lang:lang(),cf_token:tok}),signal:ctrl.signal})
   .then(function(r){return r.json().then(function(j){return {s:r.status,j:j};});})
   .then(function(x){
     if(x.s===429){wait.textContent=T().lim;return;}
     if(x.s===403){wait.textContent=T().cap;return;}
     if(x.s!==200||!x.j.reply){wait.textContent=T().err;return;}
     wait.textContent=x.j.reply;history.push({role:'assistant',content:x.j.reply});
   })
   .catch(function(){wait.textContent=T().err;})
   .then(function(){clearTimeout(to);resetCap();busy=false;send.disabled=false;msgs.scrollTop=msgs.scrollHeight;inp.focus();});
  });
});
labels();
})();
