#!/usr/bin/env python3
"""
Cabrera Elite - herramienta de construcción del sitio (NO es parte de la página; no se publica nada por sí sola).

Qué hace, en este orden:
  1) Pone en el <head> de cada página inglesa un bloque común (seguridad CSP, íconos, manifest, hreflang).
     El bloque va entre marcas <!--ce:head--> ... <!--/ce:head--> y se puede ejecutar muchas veces sin duplicar.
  2) Genera las páginas en español (/es/...) a partir de las inglesas, usando el diccionario ES de lang.js.
  3) Escribe sitemap.xml con las dos versiones.

Cuándo ejecutarla: cada vez que cambies index.html, register.html, support.html, store.html o el diccionario de lang.js:
    python3 tools/build_site.py
Luego sube los cambios a GitHub (incluida la carpeta es/).

Si cambias de cuenta de Cloudflare: actualiza CHAT_HOST aquí abajo y vuelve a ejecutarla.
"""
import json, re, sys, copy
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Comment, Doctype

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://cabreraelite.com'
CHAT_HOST = 'https://cabrera-elite-chat.elvisjunior090912.workers.dev'

# Páginas con versión en español
TWINS = {
    'index.html': '/',
    'register.html': '/register.html',
    'support.html': '/support.html',
    'store.html': '/store.html',
}
OTHER_PAGES = ['terms.html', 'waiver.html', '404.html', 'maintenance.html']
NOINDEX_TWINS = {'store.html'}   # la tienda no se indexa hasta que tenga productos (ver GUIA_SITIO.md)

ES_META = {
    'index.html': ('Cabrera Elite Baseball Development — Entrenamiento de béisbol en Poinciana, FL',
                   'Entrenamiento diario de béisbol en Poinciana, FL, dirigido por un ex scout de los Colorado Rockies. Bateo, pitcheo, defensa, fuerza y juego mental. Primera evaluación gratis.'),
    'register.html': ('Registro — Cabrera Elite Baseball Development',
                      'Registra a tu atleta, elige un plan y paga de forma segura con Stripe.'),
    'support.html': ('Soporte — Cabrera Elite Baseball Development',
                     'Contacta a Cabrera Elite Baseball Development: teléfono, correo, ayuda con cobros y cómo administrar tu membresía.'),
    'store.html': ('Tienda — Cabrera Elite Baseball Development',
                   'Uniformes y accesorios de Cabrera Elite.'),
}

CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com",
    "font-src 'self'",
    f"connect-src 'self' https://script.google.com https://script.googleusercontent.com {CHAT_HOST} "
    "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
])

START, END = '<!--ce:head-->', '<!--/ce:head-->'


def head_block(page, with_theme):
    lines = [START,
             f'<meta http-equiv="Content-Security-Policy" content="{CSP}">',
             '<meta name="referrer" content="strict-origin-when-cross-origin">']
    if with_theme:
        lines.append('<meta name="theme-color" content="#0B0A0F">')
    lines += [
        '<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">',
        '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">',
        '<link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png">',
        '<link rel="manifest" href="manifest.webmanifest">',
    ]
    if page in TWINS:
        en = SITE + TWINS[page]
        es = SITE + '/es' + (TWINS[page] if TWINS[page] != '/' else '/')
        lines += [f'<link rel="alternate" hreflang="en" href="{en}">',
                  f'<link rel="alternate" hreflang="es" href="{es}">',
                  f'<link rel="alternate" hreflang="x-default" href="{en}">']
    lines.append(END)
    return '\n'.join(lines)


def patch_head(page):
    p = ROOT / page
    s = p.read_text(encoding='utf-8')
    # quitar bloque anterior
    s = re.sub(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', '', s, flags=re.S)
    # quitar íconos viejos (los reemplaza el bloque)
    s = re.sub(r'<link rel="(?:icon|apple-touch-icon)"[^>]*>\n?', '', s)
    with_theme = 'name="theme-color"' not in s
    m = re.search(r'<meta charset="UTF-8">\n?', s)
    if not m:
        sys.exit(f'{page}: no se encontró <meta charset>')
    base = '<base href="/">\n' if page == '404.html' and '<base' not in s else ''
    s = s[:m.end()] + base + head_block(page, with_theme) + '\n' + s[m.end():]
    p.write_text(s, encoding='utf-8')


def load_es():
    js = (ROOT / 'lang.js').read_text(encoding='utf-8')
    m = re.search(r'^var ES=(\{.*\});$', js, re.M)
    return json.loads(m.group(1))


ABS_ATTRS = {'a': ['href'], 'link': ['href'], 'script': ['src'], 'img': ['src'], 'source': ['src'], 'video': ['src', 'poster']}
TWIN_LINK = {'index.html': '/es/', 'register.html': '/es/register.html', 'support.html': '/es/support.html', 'store.html': '/es/store.html'}


def fix_link(tag, cur_es_path):
    for attr in ABS_ATTRS.get(tag.name, []):
        v = tag.get(attr)
        if not v:
            continue
        if v.startswith('#'):                       # ancla de la misma página (con <base href="/"> hay que fijarla)
            if tag.name == 'a':
                tag[attr] = cur_es_path + v
            continue
        if re.match(r'^(?:[a-z][a-z0-9+.-]*:|//|/)', v, re.I):
            continue
        name = re.split(r'[?#]', v, maxsplit=1)[0]
        rest = v[len(name):]
        if tag.name == 'a' and name in TWIN_LINK:
            tag[attr] = TWIN_LINK[name] + rest


def translate_json(node, ES):
    if isinstance(node, dict):
        out = {}
        for k, v in node.items():
            if k == 'url' and isinstance(v, str) and v.startswith(SITE):
                out[k] = v if v.rstrip('/') == SITE else v
            else:
                out[k] = translate_json(v, ES)
        return out
    if isinstance(node, list):
        return [translate_json(x, ES) for x in node]
    if isinstance(node, str):
        return ES.get(node, node)
    return node


def build_es(page, ES, report):
    src = (ROOT / page).read_text(encoding='utf-8')
    soup = BeautifulSoup(src, 'html.parser')
    es_path = '/es/' if page == 'index.html' else '/es/' + page
    title, desc = ES_META[page]

    html = soup.find('html'); html['lang'] = 'es'
    if soup.body: soup.body['data-lang'] = 'es'

    # bloques bilingües (support): conservar solo el español
    for t in soup.select('.en'):
        t.decompose()

    # <base> para que las rutas relativas funcionen desde /es/
    head = soup.head
    if not head.find('base'):
        charset = head.find('meta', charset=True)
        b = soup.new_tag('base', href='/')
        (charset.insert_after if charset else head.insert)(b) if charset else head.insert(0, b)

    # texto
    skip = {'script', 'style'}
    for n in list(soup.find_all(string=True)):
        if isinstance(n, (Comment, Doctype)):
            continue
        if n.parent.name in skip:
            continue
        cur = str(n).strip()
        if not cur:
            continue
        if cur in ES:
            n.replace_with(NavigableString(str(n).replace(cur, ES[cur])))
        elif n.parent.name == 'title':
            pass
        elif re.search(r'[A-Za-z]{3,}', cur) and not n.parent.find_parent('div', class_='es'):
            report.setdefault(page, []).append(cur[:90])

    # atributos traducibles
    for tag in soup.find_all(True):
        for attr in ('placeholder', 'aria-label', 'alt'):
            v = tag.get(attr)
            if v and v in ES:
                tag[attr] = ES[v]
        fix_link(tag, es_path)

    # metadatos
    soup.title.string = title
    def setmeta(sel_attr, sel_val, content):
        m = soup.find('meta', attrs={sel_attr: sel_val})
        if m: m['content'] = content
    setmeta('name', 'description', desc)
    setmeta('property', 'og:title', title)
    setmeta('property', 'og:description', desc)
    setmeta('name', 'twitter:title', title)
    setmeta('name', 'twitter:description', desc)
    setmeta('property', 'og:locale', 'es_US')
    setmeta('property', 'og:url', SITE + es_path)
    alt = soup.find('meta', attrs={'property': 'og:locale:alternate'})
    if alt: alt['content'] = 'en_US'
    can = soup.find('link', rel='canonical')
    if can: can['href'] = SITE + es_path
    if page in NOINDEX_TWINS:
        pass

    # JSON-LD
    for sc in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(sc.string)
        except Exception:
            continue
        data = translate_json(data, ES)
        if isinstance(data, dict):
            data['inLanguage'] = 'es'
            if data.get('url') == SITE + '/':
                data['url'] = SITE + '/es/'
        sc.string = json.dumps(data, ensure_ascii=False)

    out = ROOT / 'es' / ('index.html' if page == 'index.html' else page)
    out.parent.mkdir(exist_ok=True)
    out.write_text(str(soup), encoding='utf-8')


def build_sitemap():
    today = __import__('datetime').date.today().isoformat()
    urls = []
    for page, path in TWINS.items():
        if page in NOINDEX_TWINS:
            continue
        en = SITE + path
        es = SITE + '/es' + (path if path != '/' else '/')
        for loc in (en, es):
            urls.append(
                f'  <url><loc>{loc}</loc><lastmod>{today}</lastmod>\n'
                f'    <xhtml:link rel="alternate" hreflang="en" href="{en}"/>\n'
                f'    <xhtml:link rel="alternate" hreflang="es" href="{es}"/>\n'
                f'    <xhtml:link rel="alternate" hreflang="x-default" href="{en}"/></url>')
    urls.append(f'  <url><loc>{SITE}/terms.html</loc><lastmod>{today}</lastmod></url>')
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
           + '\n'.join(urls) + '\n</urlset>\n')
    (ROOT / 'sitemap.xml').write_text(xml, encoding='utf-8')


def main():
    for page in list(TWINS) + OTHER_PAGES:
        patch_head(page)
    ES = load_es()
    report = {}
    for page in TWINS:
        build_es(page, ES, report)
    build_sitemap()
    print('Listo: páginas en inglés actualizadas, /es/ generado, sitemap escrito.')
    for page, items in report.items():
        seen = []
        for i in items:
            if i not in seen: seen.append(i)
        print(f'\n[{page}] textos sin traducir ({len(seen)}):')
        for i in seen[:40]: print('  -', i)


if __name__ == '__main__':
    main()
