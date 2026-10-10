# Cabrera Elite Baseball Development

Sitio web (GitHub Pages, dominio `cabreraelite.com`) + registro de atletas, evaluaciones gratis y confirmación de pagos.

## Cómo funciona

```
Web (index.html / register.html)
   │  POST (formulario)
   ▼
Google Apps Script  (Code.gs)  ──►  Google Sheets
   ▲                                  • 1ª hoja: registros de atletas (estado: Pendiente → Pagado…)
   │  POST (evento: paid|failed|canceled)  • "Evaluaciones": solicitudes de evaluación gratis
Make  ◄── eventos de Stripe             • "Pagos sin registro": pagos que no coincidieron con ninguna fila
```

| Archivo | Qué es |
|---|---|
| `index.html` | Página principal + formulario de evaluación gratis (con waiver y firma) |
| `register.html` | Registro en 3 pasos (atleta → plan → pago en Stripe) |
| `waiver.html` | Página para firmar el waiver (solo con enlace personal con token; no está enlazada desde la web) |
| `terms.html` | Términos, reembolsos, exención, privacidad y uso de imagen (EN/ES) |
| `lang.js` | Cambio EN/ES y traducciones |
| `support.html` | Página de soporte (correos, teléfono, portal del cliente) EN/ES; es la URL de soporte de Stripe |
| `robots.txt`, `sitemap.xml` | SEO básico (subir a la raíz del repo) |
| `Code.gs` | **No se sube a GitHub.** Se pega en Google Apps Script (ver abajo) |

## 1. Google Apps Script (`Code.gs`)

1. En el Google Sheet: **Extensiones → Apps Script**. Pega todo `Code.gs` y guarda.
2. Elige la función **`setupAll`** en el desplegable y pulsa **Ejecutar** (acepta los permisos).
   - Crea/completa encabezados, listas desplegables de estado y la hoja "Evaluaciones".
   - Genera la **clave secreta para Make**: mírala en **Ver → Registros de ejecución** (`WEBHOOK_SECRET ...`). Cópiala.
3. **Implementar → Administrar implementaciones → ✏️ Editar → Versión: Nueva versión → Implementar.**
   Ejecutar como **Yo**, acceso **Cualquier persona**. La URL `/exec` no cambia.
4. Cada vez que cambies `Code.gs` repite el paso 3.

La zona horaria está fija en `America/New_York` dentro del código (constante `TZ`).

### Seguridad de la clave (`WEBHOOK_SECRET`)
- La genera `setupAll` (o `setupWebhookSecret`) y vive en *Propiedades del script* de Google, **no** en el código ni en GitHub.
- Solo se muestra en **Ver → Registros de ejecución** de tu cuenta. Pégala en Make (campo `secret`) y no la compartas con nadie (tampoco en chats).
- Si sospechas que se filtró: ejecuta **`rotateWebhookSecret`**, copia la nueva y actualízala en Make. La anterior deja de funcionar.
- Sin la clave correcta, el script responde `unauthorized` y no cambia nada.

### Evaluaciones ya recibidas sin waiver
1. Haz el deploy y sube `waiver.html` a GitHub.
2. Ejecuta **`verWaiverPendientes`** y mira el resultado en *Ver → Registros de ejecución* (no envía nada ni cambia la hoja).
3. Ejecuta **`pedirWaiverPendientes`**: marca esas filas como `Pendiente` (se ven en rojo claro) y envía a cada familia un correo con su enlace personal. Se envía una sola vez por familia.
4. Cuando firman, la fila pasa a `Yes` y te llega un correo "Waiver firmado". Hasta entonces, ese atleta no debe participar en la evaluación.
- Cuota de correo de Gmail: unos 100 destinatarios por día en cuentas gratuitas.

### Estados de pago (columna `estado`)
`Pendiente` (al registrarse) → `Pagado` · `Fallido` · `Cancelado` (los cambia Make).
Columnas extra que llena Make: `fecha_pago`, `stripe_customer_id`, `stripe_subscription_id`, `ultimo_evento`, `ultimo_evento_fecha`.

### Estados de evaluación (hoja "Evaluaciones", columna `Estado`)
`Nuevo` → `Contactado` → `Agendada` → `Asistió` → `Se inscribió` (o `No respondió`).

## 2. Stripe

### Redirección después del pago (en CADA Payment Link)
Stripe → Payment Links → editar el link → **Después del pago → No mostrar página de confirmación → Redirigir a tu sitio web** y usa:

| Plan | URL de redirección |
|---|---|
| Single Practice | `https://cabreraelite.com/register.html?pago=ok&plan=Single%20Practice` |
| Plan 2 Days | `https://cabreraelite.com/register.html?pago=ok&plan=Plan%202%20Days` |
| Plan 3 Days | `https://cabreraelite.com/register.html?pago=ok&plan=Plan%203%20Days` |
| Plan 5 Days | `https://cabreraelite.com/register.html?pago=ok&plan=Plan%205%20Days` |

### Otros ajustes a verificar
- **Portal del cliente** activado y con cancelación permitida (los términos lo prometen). Su enlace está en `lang.js` (`CE_PORTAL_URL`).
- **Stripe Tax / impuestos**: confirmar con el contador si aplica.
- Los Payment Links reciben `client_reference_id` (la referencia `CE-...`) desde `register.html`; así Make sabe a qué fila corresponde el pago.

## 3. Make (escenario "Stripe → Sheets")

**Módulo 1 – Stripe → Watch Events.** (Make lo expone como `event_type`, `event_id` y `object.*`, no como `type`/`data.object`.) Eventos: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`.

**Módulo 2 – Router con 4 rutas** (cada una con su filtro) y, en cada ruta, un módulo **HTTP → Make a request**:

| Ruta | Filtro | `evento` | `referencia` | `stripe_subscription_id` | `stripe_customer_id` | `email` |
|---|---|---|---|---|---|---|
| Primer pago | `event_type` = `checkout.session.completed` **y** `object.payment_status` = `paid` | `paid` | `object.client_reference_id` | `object.subscription` | `object.customer` | `object.customer_details.email` |
| Renovación | `event_type` = `invoice.paid` **y** `object.billing_reason` = `subscription_cycle` | `paid` | *(vacío)* | `object.subscription` | `object.customer` | `object.customer_email` |
| Pago fallido | `event_type` = `invoice.payment_failed` | `failed` | *(vacío)* | `object.subscription` | `object.customer` | `object.customer_email` |
| Cancelación | `event_type` = `customer.subscription.deleted` | `canceled` | *(vacío)* | `object.id` | `object.customer` | *(vacío)* |
| Cambio de plan *(solo si activas "Switch plan" en el portal)* | `event_type` = `customer.subscription.updated` **y** `raw.data.previous_attributes.items` *Exists* | `plan_changed` | *(vacío)* | `object.id` | `object.customer` | *(vacío)* + campo extra `monto` = `object.items.data[].price.unit_amount` (el precio del plan nuevo, en centavos, p. ej. 40000) |

Con "cancelar al final del período", cuando el cliente cancela en el portal Stripe solo programa la cancelación (`customer.subscription.updated`). La hoja pasa a `Cancelado` al terminar el mes pagado (`customer.subscription.deleted`), que es lo que prometen los términos. Para agregar la ruta de cambio de plan en Stripe Watch Events, incluye también el evento `customer.subscription.updated`.

Configuración del módulo HTTP (igual en las 4 rutas):
- **URL**: la URL `/exec` del Apps Script (la misma de `register.html`).
- **Method**: `POST` · **Body type**: `application/x-www-form-urlencoded` · **Follow redirect**: sí (por defecto).
- **Fields** (además de los de la tabla): `secret` = la clave de `setupAll`, y `event_id` = `event_id` (el id del evento de Stripe, módulo 1) (evita avisos duplicados).
- Si en tu versión de la API de Stripe `object.subscription` viene vacío en las facturas, usa `object.parent.subscription_details.subscription`.

### Respuestas del script
`ok` actualizado · `duplicate` evento repetido · `not_found` no hay fila (el pago queda en la hoja **"Pagos sin registro"** y llega un correo) · `unauthorized` clave incorrecta · `error: ...`.

### Probar sin pagar
```bash
curl -L -X POST "URL_DEL_SCRIPT" \
  -d "secret=TU_CLAVE" -d "evento=paid" -d "referencia=CE-XXXX-XXXX"
```
(usa una referencia real de una fila de prueba; debe responder `ok` y la fila pasa a `Pagado`).

Cada evento envía un correo de aviso a `cabreraeliteprospect@gmail.com`.

## 4. Versiones de documentos legales
`terms.html`, `register.html`, `index.html` y `waiver.html` comparten la versión (`2026-10-09d`). Si cambias los textos legales, sube la versión en: `terms.html` (2 lugares), `register.html` (`TERMS_VERSION`, `WAIVER_VERSION`, `PRIVACY_VERSION`), `index.html` (`EVAL_WAIVER_V`, `EVAL_PRIVACY_V`) y `waiver.html` (`WAIVER_V`, `PRIVACY_V`).

## 5. Revisión final antes de cobrar (verificado en Stripe el 2026-10-10)
- Payment Links en vivo con precios correctos ($50 / $280 / $400 / $600), redirección `register.html?pago=ok&plan=...` correcta e impuestos automáticos activos.
- Portal del cliente activo: cancelación al final del período y enlace igual al de `lang.js`. "Cambiar de plan" está desactivado, así que la ruta *plan_changed* de Make NO es necesaria.
- Pendiente en Stripe: poner las URL de Términos y Privacidad (`https://cabreraelite.com/terms.html` y `...#privacy`) en Configuración → Detalles públicos y en el portal (hoy están vacías); los Payment Links exigen aceptar términos.

## 6. Pendiente de revisión
- Un abogado de Florida debe revisar `terms.html` (secciones 1, 3 y 4), incluido el waiver de menores (s. 744.301(3) F.S.) y ahora su uso en la evaluación gratis.
- Los nombres de archivo en GitHub Pages distinguen mayúsculas y minúsculas: `images/Logo.jpg` no es lo mismo que `images/logo.jpg`.
- Mantener la hoja de Google con acceso restringido (contiene datos de menores). Ya está restringida.
