/**
 * Cabrera Elite - Registro de atletas, evaluaciones gratis, waivers y pagos -> Google Sheets
 *
 * Recibe los POST de:
 *  - register.html                          -> una fila por registro en la hoja de REGISTROS
 *                                              (la primera hoja que NO se llame "Evaluaciones" ni "Pagos sin registro").
 *  - index.html (form: 'free_evaluation')   -> una fila en la hoja "Evaluaciones" + correo de aviso.
 *  - waiver.html (form: 'waiver_signoff')   -> registra el waiver firmado de una evaluacion ya recibida (por token).
 *  - Make (evento: paid | failed | canceled | plan_changed) -> actualiza el estado/plan de un registro.
 *
 * PRIMERA VEZ: ejecuta la funcion setupAll() una vez desde el editor.
 *   Crea/actualiza encabezados, listas desplegables y genera la clave secreta para Make
 *   (la clave aparece en Ver > Registros de ejecucion).
 * Despues: Implementar > Administrar implementaciones > Editar > Nueva version > Implementar.
 *
 * EVALUACIONES YA RECIBIDAS (sin waiver):
 *   1) verWaiverPendientes()   -> solo muestra en el registro a quien se le pediria (no envia nada).
 *   2) pedirWaiverPendientes() -> marca "Pendiente" y envia a cada familia un correo con su enlace para firmar.
 */

const TZ = 'America/New_York';            // zona horaria fija (no depende de la configuracion del proyecto)
const NOTIFY_EMAIL = 'cabreraeliteprospect@gmail.com';
const REPLY_TO = 'cabreraeliteinfo@gmail.com';
const EVAL_SHEET_NAME = 'Evaluaciones';
const UNMATCHED_SHEET_NAME = 'Pagos sin registro';
const WAIVER_PAGE_URL = 'https://cabreraelite.com/waiver.html';

// Monto mensual en centavos (Stripe) -> plan. Se usa cuando un cliente cambia de plan en el portal.
const PLANES_POR_MONTO = {
  5000:  ['Single Practice', '50'],
  28000: ['Plan 2 Days', '280'],
  40000: ['Plan 3 Days', '400'],
  60000: ['Plan 5 Days', '600']
};

function now_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function out_(s) { return ContentService.createTextOutput(s); }
function norm_(x) { return String(x || '').trim().toLowerCase().replace(/\s+/g, ' '); }

// Acepta formulario (x-www-form-urlencoded) y tambien JSON (por si Make envia JSON).
function parseParams_(e) {
  const p = Object.assign({}, (e && e.parameter) || {});
  try {
    if (e && e.postData && /json/i.test(e.postData.type || '') && e.postData.contents) {
      Object.assign(p, JSON.parse(e.postData.contents));
    }
  } catch (err) { /* ignorar JSON invalido */ }
  return p;
}

// ====================== REGISTRO DE ATLETAS ======================

const COLUMNS = [
  'fecha_registro', 'referencia', 'estado', 'fecha_pago',
  'nombre', 'fnac', 'age', 'is_minor', 'posicion',
  'tutor', 'tel', 'email', 'em_nombre', 'em_tel',
  'plan', 'price',
  'consent', 'guardian_confirmed', 'terms_accepted', 'waiver_accepted', 'media_consent',
  'signature', 'sig_matches_guardian', 'consent_at',
  'terms_v', 'waiver_v', 'privacy_v', 'lang',
  'stripe_customer_id', 'stripe_subscription_id', 'ultimo_evento', 'ultimo_evento_fecha'
];
const ESTADOS = ['Pendiente', 'Pagado', 'Fallido', 'Cancelado'];

// Hoja de registros: la primera hoja que no sea "Evaluaciones" ni "Pagos sin registro".
// (Asi no se rompe si alguien cambia el orden de las pestañas.)
function getSheet_() {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var n = sheets[i].getName();
    if (n !== EVAL_SHEET_NAME && n !== UNMATCHED_SHEET_NAME) return sheets[i];
  }
  return sheets[0];
}

// Asegura que existan todos los encabezados (sin borrar los que ya tienes).
function ensureHeaders_(sh) {
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    applyEstadoValidation_(sh, COLUMNS);
    return COLUMNS.slice();
  }
  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const lower = headers.map(h => h.toLowerCase());
  COLUMNS.forEach(c => {
    if (lower.indexOf(c.toLowerCase()) === -1) {
      headers.push(c);
      lower.push(c.toLowerCase());
      sh.getRange(1, headers.length).setValue(c).setFontWeight('bold');
    }
  });
  applyEstadoValidation_(sh, headers);
  return headers;
}

// Lista desplegable en la columna "estado" (Pendiente / Pagado / Fallido / Cancelado).
function applyEstadoValidation_(sh, headers) {
  try {
    const idx = headers.map(h => String(h).toLowerCase()).indexOf('estado');
    if (idx === -1) return;
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(ESTADOS, true).setAllowInvalid(true).build();
    sh.getRange(2, idx + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(rule);
  } catch (err) { /* no es critico */ }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const p = parseParams_(e);
    if (p.evento) return handleStripeEvent_(p);          // llamado desde Make
    if (p.form === 'free_evaluation') return handleEval(p);
    if (p.form === 'waiver_signoff') return handleWaiverSignoff_(p);
    return handleRegistro_(p);
  } catch (err) {
    return out_('error: ' + err);
  } finally {
    lock.releaseLock();
  }
}

function handleRegistro_(p) {
  // Validacion minima (la web siempre envia estos campos).
  if (!p.nombre || !p.email || !p.referencia) return out_('invalid');

  const sh = getSheet_();
  const headers = ensureHeaders_(sh);
  const lower = headers.map(h => h.toLowerCase());

  // Anti-duplicados: si ya existe esa referencia, no agregar otra fila.
  const refCol = lower.indexOf('referencia') + 1;
  if (sh.getLastRow() > 1) {
    const refs = sh.getRange(2, refCol, sh.getLastRow() - 1, 1).getValues().flat();
    if (refs.indexOf(p.referencia) !== -1) return out_('duplicate');
  }

  const row = headers.map((h, i) => {
    const key = lower[i];
    if (key === 'fecha_registro') return now_();
    if (key === 'estado') return 'Pendiente';
    if (key === 'fecha_pago') return '';
    return p[h] !== undefined ? String(p[h]) : (p[key] !== undefined ? String(p[key]) : '');
  });

  const newRow = sh.getLastRow() + 1;
  const range = sh.getRange(newRow, 1, 1, headers.length);
  range.setNumberFormat('@');      // todo como texto (telefonos +1 407... no se vuelven numeros ni formulas)
  range.setValues([row]);
  return out_('ok');
}

// Para probar que el despliegue esta vivo: abre la URL /exec en el navegador.
function doGet() {
  return out_('Cabrera Elite registro: activo');
}

// ====================== EVALUACION GRATIS ======================

const EVAL_HEADERS = [
  'Fecha', 'Atleta', 'Edad', 'Posición', 'Padre/Tutor',
  'Teléfono', 'Email', 'Horarios preferidos', 'Idioma', 'Consentimiento',
  // --- seguimiento y waiver ---
  'Estado', 'Menor de edad', 'Tutor confirmado', 'Waiver aceptado',
  'Firma', 'Firma coincide con tutor', 'Versión waiver', 'Versión privacidad',
  // --- waiver de evaluaciones anteriores ---
  'Token waiver', 'Waiver solicitado', 'Waiver firmado en'
];
const EVAL_ESTADOS = ['Nuevo', 'Contactado', 'Agendada', 'Asistió', 'Se inscribió', 'No respondió'];

function evalCol_(name) { return EVAL_HEADERS.indexOf(name) + 1; }

// Obtiene (o crea) la hoja "Evaluaciones" y se asegura de que tenga encabezados.
function ensureEvalSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(EVAL_SHEET_NAME) || ss.insertSheet(EVAL_SHEET_NAME);
  const firstRow = sh.getLastRow() > 0
    ? sh.getRange(1, 1, 1, Math.min(EVAL_HEADERS.length, sh.getLastColumn())).getValues()[0]
    : [];
  const hasData = firstRow.some(v => String(v).trim() !== '');
  if (hasData && String(firstRow[0]).trim() !== 'Fecha') {
    sh.insertRowBefore(1); // hay datos sin encabezado: sube todo una fila
  }
  sh.getRange(1, 1, 1, EVAL_HEADERS.length).setValues([EVAL_HEADERS]).setFontWeight('bold');
  sh.setFrozenRows(1);
  const rows = Math.max(sh.getMaxRows() - 1, 1);
  try {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(EVAL_ESTADOS, true).setAllowInvalid(true).build();
    sh.getRange(2, evalCol_('Estado'), rows, 1).setDataValidation(rule);
  } catch (err) { /* no es critico */ }
  try {
    // Resalta en rojo claro los waivers pendientes.
    const cf = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Pendiente').setBackground('#f4c7c3')
      .setRanges([sh.getRange(2, evalCol_('Waiver aceptado'), rows, 1)]).build();
    sh.setConditionalFormatRules([cf]);
  } catch (err) { /* no es critico */ }
  return sh;
}

function handleEval(p) {
  if (p.website) return out_('ok');                  // honeypot anti-spam
  if (!p.atleta || !p.email) return out_('invalid');

  // Anti-duplicados: la web reintenta si Google tarda; no guardar ni avisar dos veces la misma solicitud.
  const dupKey = 'evl_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5, p.sid ? String(p.sid) : norm_(p.email) + '|' + norm_(p.atleta)));
  const dupCache = CacheService.getScriptCache();
  if (dupCache.get(dupKey)) return out_('duplicate');

  const sh = ensureEvalSheet_();
  const row = sh.getLastRow() + 1;
  const range = sh.getRange(row, 1, 1, EVAL_HEADERS.length);
  range.setNumberFormat('@');
  const values = [
    now_(),
    p.atleta || '', p.edad || '', p.posicion || '', p.tutor || '',
    p.tel || '', p.email || '', p.horarios || '', p.lang || '', p.consent_at || '',
    'Nuevo', p.is_minor || '', p.guardian_confirmed || '', p.waiver_accepted || '',
    p.signature || '', p.sig_matches_guardian || '', p.waiver_v || '', p.privacy_v || ''
  ];
  while (values.length < EVAL_HEADERS.length) values.push('');
  range.setValues([values]);
  dupCache.put(dupKey, '1', 600);

  try {
    MailApp.sendEmail(NOTIFY_EMAIL,
      'Nueva solicitud de evaluación gratis: ' + p.atleta,
      'Atleta: ' + p.atleta + ' (' + p.edad + ' años, ' + p.posicion + ')\n' +
      'Padre/Tutor: ' + p.tutor + '\nTeléfono: ' + p.tel + '\nEmail: ' + p.email +
      '\nHorarios: ' + (p.horarios || '-') +
      '\nWaiver aceptado: ' + (p.waiver_accepted || 'No') + ' · Firma: ' + (p.signature || '-'));
  } catch (err) { /* el registro ya quedo guardado aunque falle el correo */ }
  return out_('ok');
}

// ====================== WAIVER DE EVALUACIONES YA RECIBIDAS ======================

// waiver.html envia aqui el waiver firmado. Se identifica la fila por el "token" del enlace del correo.
function handleWaiverSignoff_(p) {
  const token = String(p.token || '').trim();
  if (!/^[A-Za-z0-9]{16,64}$/.test(token)) return out_('invalid');
  if (p.guardian_confirmed !== 'Yes' || p.waiver_accepted !== 'Yes' || String(p.signature || '').trim().length < 3) {
    return out_('invalid');
  }
  const sh = ensureEvalSheet_();
  const last = sh.getLastRow();
  if (last < 2) return out_('not_found');
  const data = sh.getRange(2, 1, last - 1, EVAL_HEADERS.length).getValues();
  const tokCol = evalCol_('Token waiver') - 1;
  var idx = -1;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][tokCol]).trim() === token) { idx = i; break; }
  }
  if (idx < 0) return out_('not_found');

  const rowNum = idx + 2, rec = data[idx];
  const get = n => String(rec[evalCol_(n) - 1] || '').trim();
  const set = (n, v) => sh.getRange(rowNum, evalCol_(n)).setNumberFormat('@').setValue(String(v));
  const edad = parseInt(get('Edad'), 10);
  const sig = String(p.signature).trim();

  set('Menor de edad', (!isNaN(edad) && edad < 18) ? 'Yes' : 'No');
  set('Tutor confirmado', 'Yes');
  set('Waiver aceptado', 'Yes');
  set('Firma', sig);
  set('Firma coincide con tutor', norm_(sig) === norm_(get('Padre/Tutor')) ? 'Yes' : 'No');
  set('Versión waiver', p.waiver_v || '');
  set('Versión privacidad', p.privacy_v || '');
  set('Waiver firmado en', now_());

  try {
    MailApp.sendEmail(NOTIFY_EMAIL, 'Waiver firmado: ' + get('Atleta'),
      'Atleta: ' + get('Atleta') + '\nPadre/Tutor: ' + get('Padre/Tutor') + '\nFirma: ' + sig +
      '\nVersión: ' + (p.waiver_v || '-') + '\nFecha: ' + now_());
  } catch (err) { /* no es critico */ }
  return out_('ok');
}

// Recorre "Evaluaciones" y gestiona las filas sin waiver. send=false solo registra en el log.
function waiverPendientes_(send) {
  const sh = ensureEvalSheet_();
  const last = sh.getLastRow();
  const res = { pendientes: 0, enviados: 0, yaSolicitados: 0, sinEmail: 0 };
  if (last < 2) return res;
  const data = sh.getRange(2, 1, last - 1, EVAL_HEADERS.length).getValues();
  const get = (rec, n) => String(rec[evalCol_(n) - 1] || '').trim();

  for (var i = 0; i < data.length; i++) {
    const rec = data[i], rowNum = i + 2;
    if (!get(rec, 'Atleta') && !get(rec, 'Email')) continue;      // fila vacia
    if (get(rec, 'Waiver aceptado') === 'Yes') continue;           // ya firmado
    res.pendientes++;
    const email = get(rec, 'Email');
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) res.sinEmail++;
    if (get(rec, 'Waiver solicitado')) res.yaSolicitados++;

    if (!send) {
      Logger.log('Pendiente fila %s: %s | tutor: %s | %s%s', rowNum, get(rec, 'Atleta'), get(rec, 'Padre/Tutor'), email,
        get(rec, 'Waiver solicitado') ? ' (ya se le pidio el ' + get(rec, 'Waiver solicitado') + ')' : '');
      continue;
    }
    sh.getRange(rowNum, evalCol_('Waiver aceptado')).setNumberFormat('@').setValue('Pendiente');
    if (!ok || get(rec, 'Waiver solicitado')) continue;

    var token = get(rec, 'Token waiver');
    if (!token) {
      token = Utilities.getUuid().replace(/-/g, '');
      sh.getRange(rowNum, evalCol_('Token waiver')).setNumberFormat('@').setValue(token);
    }
    try {
      sendWaiverEmail_(email, get(rec, 'Padre/Tutor'), get(rec, 'Atleta'), get(rec, 'Idioma'), token);
      sh.getRange(rowNum, evalCol_('Waiver solicitado')).setNumberFormat('@').setValue(now_());
      res.enviados++;
    } catch (err) {
      Logger.log('No se pudo enviar a %s: %s', email, err);
    }
  }
  Logger.log('Pendientes: %s | enviados ahora: %s | ya solicitados antes: %s | sin email valido: %s',
    res.pendientes, res.enviados, res.yaSolicitados, res.sinEmail);
  return res;
}

function sendWaiverEmail_(to, tutor, atleta, lang, token) {
  const es = String(lang).toLowerCase() === 'es';
  const link = WAIVER_PAGE_URL + '?t=' + token + (es ? '&lang=es' : '');
  const subject = es
    ? 'Cabrera Elite: firma la exención para la evaluación de ' + atleta
    : 'Cabrera Elite: please sign the waiver for ' + atleta + "'s evaluation";
  const body = es
    ? 'Hola ' + (tutor || '') + ',\n\n' +
      'Gracias por solicitar la evaluación gratis para ' + atleta + ' en Cabrera Elite Baseball Development. ' +
      'Antes de la evaluación necesitamos que el padre/madre o tutor (o el atleta, si tiene 18 años o más) ' +
      'lea y acepte la Asunción de riesgo y exención de responsabilidad. Toma un minuto:\n\n' + link + '\n\n' +
      'El atleta no podrá participar en la evaluación hasta que la exención esté firmada.\n\n' +
      '¿Preguntas? Responde este correo o llama al +1 (863) 268-9210.\n\nCabrera Elite Baseball Development'
    : 'Hello ' + (tutor || '') + ',\n\n' +
      'Thank you for requesting a free evaluation for ' + atleta + ' at Cabrera Elite Baseball Development. ' +
      'Before the evaluation, we need the parent/guardian (or the athlete, if 18 or older) to read and accept ' +
      'our Assumption of Risk & Liability Waiver. It takes about a minute:\n\n' + link + '\n\n' +
      'The athlete cannot take part in the evaluation until the waiver is signed.\n\n' +
      'Questions? Reply to this email or call +1 (863) 268-9210.\n\nCabrera Elite Baseball Development';
  MailApp.sendEmail({ to: to, subject: subject, body: body, replyTo: REPLY_TO, name: 'Cabrera Elite Baseball Development' });
}

// PASO 1: ejecuta esta primero. Solo escribe en Ver > Registros de ejecucion; NO envia correos ni cambia la hoja.
function verWaiverPendientes() { waiverPendientes_(false); }

// PASO 2: marca "Pendiente" en la hoja y envia el correo con el enlace a cada familia (una sola vez por familia).
function pedirWaiverPendientes() { waiverPendientes_(true); }

// ====================== PAGOS (Make / Stripe) ======================
// Make llama a esta URL (POST) con estos campos:
//   secret                 clave generada por setupWebhookSecret()
//   evento                 paid | failed | canceled | plan_changed
//   referencia             client_reference_id de Stripe (CE-...)  [solo en el primer pago]
//   stripe_subscription_id id de la suscripcion (sub_...)
//   stripe_customer_id     id del cliente (cus_...)
//   email                  email del cliente (ultimo recurso para encontrar la fila)
//   monto                  solo plan_changed: precio nuevo en centavos (ej. 40000)
//   event_id               id del evento de Stripe (evita avisos duplicados)  [opcional]

function handleStripeEvent_(p) {
  const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  if (!secret || String(p.secret) !== secret) return out_('unauthorized');

  const evento = String(p.evento || '').toLowerCase().trim();
  const estado = { paid: 'Pagado', failed: 'Fallido', canceled: 'Cancelado' }[evento];
  const isPlanChange = evento === 'plan_changed';
  if (!estado && !isPlanChange) return out_('error: evento invalido');

  // Evita procesar dos veces el mismo evento (reintentos).
  const cache = CacheService.getScriptCache();
  if (p.event_id) {
    if (cache.get('ev_' + p.event_id)) return out_('duplicate');
    cache.put('ev_' + p.event_id, '1', 21600);
  }

  const sh = getSheet_();
  const headers = ensureHeaders_(sh);
  const lower = headers.map(h => h.toLowerCase());
  const col = name => lower.indexOf(name) + 1;
  const last = sh.getLastRow();
  if (last < 2) return logUnmatched_(p, evento);

  const data = sh.getRange(2, 1, last - 1, headers.length).getValues();
  const val = (r, name) => String(data[r][col(name) - 1] || '').trim();
  const find = (name, v) => {
    if (!v) return -1;
    v = String(v).trim().toLowerCase();
    for (var r = data.length - 1; r >= 0; r--) {   // de la mas nueva a la mas antigua
      if (val(r, name).toLowerCase() === v) return r;
    }
    return -1;
  };

  // Orden de busqueda: referencia > suscripcion > cliente > email (ultimo recurso).
  var r = find('referencia', p.referencia), via = 'referencia';
  if (r < 0) { r = find('stripe_subscription_id', p.stripe_subscription_id); via = 'suscripcion'; }
  if (r < 0) { r = find('stripe_customer_id', p.stripe_customer_id); via = 'cliente'; }
  if (r < 0) { r = find('email', p.email); via = 'email'; }
  if (r < 0) return logUnmatched_(p, evento);

  const rowNum = r + 2;
  const set = (name, v) => {
    if (col(name) > 0 && v !== undefined && v !== '') {
      sh.getRange(rowNum, col(name)).setNumberFormat('@').setValue(String(v));
    }
  };
  const viaTxt = via === 'email' ? ' (match por email)' : '';
  const warnEmail = via === 'email' ? '\n\n⚠ La fila se encontró por email; revisa que sea el atleta correcto.' : '';

  set('stripe_customer_id', p.stripe_customer_id);
  set('stripe_subscription_id', p.stripe_subscription_id);
  set('ultimo_evento_fecha', now_());

  if (isPlanChange) {
    const plan = PLANES_POR_MONTO[parseInt(p.monto, 10)];
    const anterior = val(r, 'plan');
    if (plan) {
      set('plan', plan[0]);
      set('price', plan[1]);
      set('ultimo_evento', 'plan_changed: ' + anterior + ' -> ' + plan[0] + viaTxt);
    } else {
      set('ultimo_evento', 'plan_changed: monto desconocido (' + (p.monto || '-') + ')' + viaTxt);
    }
    try {
      MailApp.sendEmail(NOTIFY_EMAIL, 'Cambio de plan: ' + val(r, 'nombre'),
        'Atleta: ' + val(r, 'nombre') + '\nPlan anterior: ' + anterior +
        '\nPlan nuevo: ' + (plan ? plan[0] + ' ($' + plan[1] + ')' : 'NO RECONOCIDO (monto ' + (p.monto || '-') + ')') +
        '\nPadre/Tutor: ' + val(r, 'tutor') + '\nTeléfono: ' + val(r, 'tel') + '\nEmail: ' + val(r, 'email') +
        '\n\nRecuerda ajustar las sesiones del mes si corresponde.' + warnEmail);
    } catch (err) { /* no es critico */ }
    return out_('ok');
  }

  set('estado', estado);
  if (evento === 'paid') set('fecha_pago', now_());
  set('ultimo_evento', evento + viaTxt);

  try {
    MailApp.sendEmail(NOTIFY_EMAIL,
      'Pago ' + estado + ': ' + val(r, 'nombre'),
      'Atleta: ' + val(r, 'nombre') + '\nPlan: ' + val(r, 'plan') + ' ($' + val(r, 'price') + ')' +
      '\nPadre/Tutor: ' + val(r, 'tutor') + '\nTeléfono: ' + val(r, 'tel') + '\nEmail: ' + val(r, 'email') +
      '\nEstado nuevo: ' + estado + '\nReferencia: ' + val(r, 'referencia') + warnEmail);
  } catch (err) { /* no es critico */ }
  return out_('ok');
}

// Si no se encuentra la fila, el pago NO se pierde: queda en la hoja "Pagos sin registro" y llega un correo.
function logUnmatched_(p, evento) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(UNMATCHED_SHEET_NAME) || ss.insertSheet(UNMATCHED_SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 7).setValues([['Fecha', 'Evento', 'Referencia', 'Email', 'Cliente', 'Suscripción', 'Event ID']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  const cell = v => "'" + String(v || '');   // texto literal: evita que se interprete como formula
  sh.appendRow([now_(), evento, cell(p.referencia), cell(p.email), cell(p.stripe_customer_id), cell(p.stripe_subscription_id), cell(p.event_id)]);
  try {
    MailApp.sendEmail(NOTIFY_EMAIL, 'Pago sin registro encontrado (' + evento + ')',
      'Stripe notificó un evento que no coincide con ninguna fila.\nEmail: ' + (p.email || '-') +
      '\nReferencia: ' + (p.referencia || '-') + '\nRevisa la hoja "' + UNMATCHED_SHEET_NAME + '".');
  } catch (err) { /* no es critico */ }
  return out_('not_found');
}

// ====================== CONFIGURACION (ejecutar a mano) ======================

// Genera la clave secreta que Make debe enviar. Si ya existe, solo la muestra.
// Ver el resultado en: Ver > Registros de ejecucion. NO la compartas ni la subas a GitHub.
function setupWebhookSecret() {
  const props = PropertiesService.getScriptProperties();
  var s = props.getProperty('WEBHOOK_SECRET');
  if (!s) {
    s = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    props.setProperty('WEBHOOK_SECRET', s);
  }
  Logger.log('WEBHOOK_SECRET (pegala en Make): ' + s);
  return s;
}

// Si sospechas que la clave se filtro: genera una NUEVA (la anterior deja de funcionar) y actualizala en Make.
function rotateWebhookSecret() {
  const s = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('WEBHOOK_SECRET', s);
  Logger.log('NUEVA WEBHOOK_SECRET (actualizala en Make): ' + s);
  return s;
}

// Ejecuta ESTA una vez: prepara las dos hojas y genera la clave para Make.
function setupAll() {
  ensureHeaders_(getSheet_());
  ensureEvalSheet_();
  setupWebhookSecret();
}

// Se mantiene por compatibilidad.
function setupEvaluaciones() { ensureEvalSheet_(); }
