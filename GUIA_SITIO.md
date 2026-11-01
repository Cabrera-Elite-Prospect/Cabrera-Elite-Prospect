# Guía del sitio — Cabrera Elite (actualizada 2026-11-01)

Lenguaje sencillo, sin tecnicismos. Lo que dice **[TÚ]** solo lo puedes hacer tú (cuentas tuyas); lo demás ya está hecho en el código.

## 1. Qué hay ahora en el sitio
- **Dos idiomas con dirección propia:** `cabreraelite.com/` (inglés) y `cabreraelite.com/es/` (español). Google ya puede indexar los dos. El botón EN/ES cambia de página.
- **Anti-bot Cloudflare Turnstile** en el chat, el formulario de evaluación gratis y el de registro. Casi siempre es invisible.
- **Seguridad en el navegador:** política de contenido (CSP), referrer limitado y `security.txt`.
- **Íconos** para celular y pantalla de inicio (`icons/`, `manifest.webmanifest`).
- **Barra de confianza** (18 años, ISSA, edades, evaluación gratis) y animaciones suaves.
- **Secciones nuevas que se muestran solas cuando llenas datos** en `site-config.js`: video con avance, horario semanal, botón de reserva, tienda, testimonios, galería, ofertas.

## 2. Cómo cambiar contenido
Edita **solo `site-config.js`** (vacío = no se muestra). Después ejecuta una vez `python3 tools/build_site.py` (o pídeselo a Claude) para regenerar las páginas en español y el sitemap, y sube todo a GitHub (incluida la carpeta `es/`).
> Si cambias `index.html`, `register.html`, `support.html`, `store.html` o textos de `lang.js`, también hay que volver a ejecutar `tools/build_site.py`.

## 3. Video (avance + resto en Instagram)
Ya está puesto el enlace del reel. Hoy se muestra una tarjeta que lleva a Instagram. Para que **una parte se vea en tu página**:
1. **[TÚ]** Descarga el video a tu celular y recorta los primeros 10–15 segundos (CapCut o el editor del teléfono). Expórtalo en MP4 liviano (menos de 5 MB) y saca una foto de portada.
2. **[TÚ]** Súbelos a GitHub, carpeta `images/`, como `teaser.mp4` y `teaser.jpg`.
3. En `site-config.js` pon `videoTeaser: 'images/teaser.mp4'`, `videoPoster: 'images/teaser.jpg'` y `videoSeconds: 10`. (Claude lo puede hacer si le avisas.)
Al llegar a esos segundos el video se detiene y aparece **"Ver el video completo en Instagram"**. Cada clic se mide en Analytics como `video_to_instagram` (solo con cookies aceptadas).

## 4. Activar el anti-bot en los formularios (una sola vez) **[TÚ]**
El sitio ya envía la verificación. Falta que Google Apps Script la compruebe:
1. Pega el `Code.gs` nuevo (versión 2026-11-01) en Apps Script.
2. Engranaje → Propiedades de la secuencia de comandos → agrega `TURNSTILE_SECRET` = Secret Key del widget.
3. Ejecuta `autorizarTurnstile()` y acepta el permiso.
4. Implementar → Administrar implementaciones → Editar → **Nueva versión** → Implementar.
5. Ejecuta `estadoTurnstile()`: debe decir ACTIVO.
Lo que no pase la verificación **no se pierde**: queda en la hoja **"Cuarentena"** (máx. 1000 filas). Si un cliente real quedó ahí, copia sus datos.
Los avisos de pago de Make **no** usan Turnstile (van protegidos con `WEBHOOK_SECRET`).

## 5. Cabeceras de seguridad en Cloudflare **[TÚ]** (GitHub Pages no las permite)
Cloudflare → tu dominio → **Rules → Transform Rules → Modify Response Header → Create rule** (todas las solicitudes) y agrega, como "Set static":
| Nombre | Valor |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
Además: **SSL/TLS → Edge Certificates**: Always Use HTTPS = On, Minimum TLS = 1.2, Automatic HTTPS Rewrites = On. **Security → Bots**: Bot Fight Mode = On. **Security → WAF → Rate limiting**: regla de 20 solicitudes por minuto por IP a `/*` con acción "Managed Challenge" (el plan gratis permite una regla).
La política de contenido (CSP) ya va dentro de cada página; si algún día agregas un servicio nuevo (otro mapa, otro analytics), hay que añadirlo en `tools/build_site.py` (variable `CSP`).

## 6. Correo con tu dominio (info@cabreraelite.com) **[TÚ]**
Cloudflare → **Email → Email Routing → Enable**. Crea la dirección `info@` y que reenvíe a tu Gmail (confirma el correo de verificación). Para **responder desde** `info@`: Gmail → Configuración → Cuentas → "Enviar como" → agregar `info@cabreraelite.com` (usa el servidor SMTP que Gmail te indique con una contraseña de aplicación). Después, cambia el correo público en el sitio (pídeselo a Claude).

## 7. Calendario y reserva **[TÚ]**
- **Días de sesión:** llena `schedule` en `site-config.js` con los días reales (hay un ejemplo en el archivo).
- **Reserva con fecha y hora:** crea cuenta gratis en Cal.com (o Calendly), crea un evento "Evaluación gratis" de 30 min con tus horarios, y pega el enlace en `bookingUrl`. Aparece el botón "Reserva tu evaluación gratis".

## 8. Tienda (uniformes y accesorios)
Ya existe `store.html` / `es/store.html`; el enlace "Tienda" del menú **aparece solo cuando agregues productos** en `products` (`site-config.js`).
Dos formas de cobrar:
- **Con Stripe (recomendado):** Stripe → Productos → crea el producto → "Crear enlace de pago" y pega la URL en `buyUrl`. Pide talla como campo personalizado.
- **Sin Stripe (provisional):** si dejas `buyUrl` vacío, el botón abre WhatsApp con el pedido ya escrito.
Antes de abrir: define política de envíos/retiro y cambios de talla, y revisa con tu abogado que "ventas finales" aplique también a la tienda. Cuando tengas productos, quita `store.html` de `NOINDEX_TWINS` en `tools/build_site.py` para que Google lo indexe.

## 9. Verificación en dos pasos (cuentas) **[TÚ]**
Revisa que cada una la tenga activa: Google (cabreraeliteprospect@gmail.com y cabreraeliteinfo@gmail.com), Cloudflare (elvisjunior090912@gmail.com), Stripe, Make, GitHub. Mejor con app autenticadora o llave de acceso que con SMS. Guarda los códigos de respaldo fuera del celular.

## 10. Si algún día cambias de cuenta de Cloudflare
Crea el Worker nuevo (pega `chat-worker/worker.js`, binding Workers AI = `AI`, KV `RATE`, secreto `TURNSTILE_SECRET`), crea el widget nuevo de Turnstile, y cambia en el código: `CHAT_URL` (`chat.js`), `SITEKEY` (`antibot.js`) y `CHAT_HOST` (`tools/build_site.py`). Ejecuta `python3 tools/build_site.py` y sube a GitHub.
