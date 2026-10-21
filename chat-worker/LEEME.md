# Chatbot con IA — cómo activarlo (una sola vez)

El chat de la página ya está listo pero **permanece oculto** hasta que pongas la dirección de tu Worker en `chat.js` (línea `var CHAT_URL = ''`).
La clave de la IA NUNCA va en la página: vive en un Worker de Cloudflare.

1. Crea una clave de API en console.anthropic.com (API Keys) y pon un **límite de gasto mensual** (Settings → Limits).
2. Cloudflare → Workers & Pages → Create → Create Worker. Nómbralo `cabrera-elite-chat` → Deploy → Edit code.
3. Borra el código y pega todo el contenido de `chat-worker/worker.js`. Deploy.
4. En el Worker: Settings → Variables and Secrets → Add → tipo **Secret**, nombre `ANTHROPIC_API_KEY`, valor = tu clave. Deploy.
5. Copia la URL del Worker (termina en `.workers.dev`) y dásela a Claude, o pégala en `chat.js` en `CHAT_URL`.
6. (Opcional, recomendado) Límite por visitante: Workers & Pages → KV → crea un namespace `cabrera-chat-rate`; en el Worker: Settings → Bindings → Add → KV namespace, variable `RATE`.

Para cambiar lo que sabe el asistente, edita el bloque `SYSTEM` de `worker.js` (precios, horarios, etc.) y vuelve a pegarlo en Cloudflare.
