# Chatbot con IA (Cloudflare Workers AI, gratis)

Estado: ACTIVO. El Worker `cabrera-elite-chat` corre en Cloudflare y usa Workers AI
(modelo `@cf/google/gemma-4-26b-a4b-it`). No necesita clave de API.

- Gratis: 10,000 neurons por día (cientos de conversaciones). Al agotarse, el chat muestra
  un mensaje con el teléfono y el correo y se renueva a las 00:00 UTC.
- Límite por visitante: 30 mensajes por hora (almacén KV `RATE`).
- Para cambiar lo que sabe el asistente (precios, horarios): edita el bloque `SYSTEM`
  de `worker.js` y vuelve a subirlo al Worker.
- La dirección del Worker está en `chat.js` (`CHAT_URL`).
- Si algún día se borra la cuenta de Cloudflare, hay que mover el Worker a la cuenta nueva
  (crear Worker, pegar `worker.js`, agregar el binding "Workers AI" con nombre `AI` y el KV `RATE`).
