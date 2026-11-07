/* Transición suave al cambiar de página (se desvanece y entra la nueva). */
(function(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var de=document.documentElement;
  addEventListener('pageshow',function(){de.classList.remove('ce-leaving')});
  document.addEventListener('click',function(e){
    if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var a=e.target.closest&&e.target.closest('a[href]');
    if(!a||a.target&&a.target!=='_self'||a.hasAttribute('download'))return;
    var u;try{u=new URL(a.href,location.href)}catch(x){return}
    if(u.origin!==location.origin||!/^https?:$/.test(u.protocol))return;
    if(u.pathname===location.pathname&&u.search===location.search)return; // anclas internas: scroll suave
    e.preventDefault();
    de.classList.add('ce-leaving');
    setTimeout(function(){location.href=u.href},380);
    setTimeout(function(){de.classList.remove('ce-leaving')},4000);
  });
})();
