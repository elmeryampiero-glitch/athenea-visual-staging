/* ATHENEA VISUAL — SERVICE WORKER INDUSTRIAL VERSIONADO
   ======================================================
   Orden: AV-P2B2-SW-001. Regla principal: VERSIÓN CORRECTA > OFFLINE AGRESIVO.

   Fuente única de versión: el SHA de origen que el workflow de staging ya
   sella en version.json. El mismo paso de sellado sustituye el marcador
   718c23ce0 de este archivo — un solo origen, cero divergencia.

   Ciclo de vida:
     publicación N → el navegador ve un sw.js distinto en bytes → install
     precachea el shell de N (atómico: si falta un recurso, el install FALLA
     y la versión anterior sigue sirviendo) → activate borra las cachés
     athenea-sw-* que no son de N y toma los clientes → los clientes pasan a N.

   Este archivo NO decide apariencia, datos ni navegación: solo transporte. */

"use strict";

const VERSION = "718c23ce0";
const PREFIJO = "athenea-sw-";
const CACHE_SHELL   = PREFIJO + "shell-"   + VERSION;
const CACHE_RUNTIME = PREFIJO + "runtime-" + VERSION;

/* base-path real (GitHub Pages sirve bajo /athenea-visual-staging/):
   se deriva de la URL del propio worker — jamás se escribe en duro. */
const BASE = new URL("./", self.location).pathname;

/* APP SHELL CRÍTICO — lo mínimo para que ATHENEA arranque sin red.
   Los 15 fondos y el arte cinematográfico NO van aquí: se cachean bajo
   demanda (política de assets pesados). */
const SHELL = [
  "index.html",
  "version.json",
  "platform/brand/athenea-theme.css",
  "platform/brand/adn-nucleo.css",
  "platform/brand/fuentes/fuentes.css",
  "platform/brand/fuentes/inter-var.woff2",
  "platform/brand/fuentes/cinzel-var.woff2",
  "platform/brand/fuentes/playfair-regular.woff2",
  "platform/brand/estudio/athenea.webmanifest",
  "platform/brand/estudio/piloto-apertura.html",
  "platform/brand/estudio/piloto-home.html",
  "platform/brand/iconos/athenea-icono-192.png",
  "platform/brand/iconos/athenea-icono-512.png",
].map((r) => BASE + r);

/* ---------- install: shell completo o nada ---------- */
self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const t0 = Date.now();
      const cache = await caches.open(CACHE_SHELL);
      /* REP-002: cache:"reload" — la instalación de una versión NUEVA exige
         bytes de la red real; el caché HTTP del CDN (10 min) no puede
         envenenar la versión nueva con archivos de la anterior */
      await cache.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))); // atómico: un 404 aborta la instalación
      console.info(`[athenea-sw ${VERSION}] shell instalado: ${SHELL.length} recursos en ${Date.now() - t0} ms`);
      await self.skipWaiting(); // frescura: la versión nueva no espera
    })()
  );
});

/* ---------- activate: solo sobrevive la versión actual ---------- */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const t0 = Date.now();
      const claves = await caches.keys();
      const viejas = claves.filter(
        (k) => k.startsWith(PREFIJO) && k !== CACHE_SHELL && k !== CACHE_RUNTIME
      );
      await Promise.all(viejas.map((k) => caches.delete(k))); // SOLO cachés ATHENEA
      await self.clients.claim();
      console.info(`[athenea-sw ${VERSION}] activo · cachés obsoletas eliminadas: ${viejas.length} en ${Date.now() - t0} ms`);
    })()
  );
});

/* ══════════════════════ ESTRATEGIAS DE FETCH (SW2) ══════════════════════
   Matriz — tipo de recurso · estrategia · razón · fallback:
   · NAVEGACIÓN/HTML     red-primero (4 s)   una página vieja no debe
                                             sobrevivir a una publicación;
                                             fallback: copia → portada → aviso.
     La verdad de la red manda: un 404 real se muestra, no se disfraza.
   · version.json        red-primero (4 s)   es el latido de la versión.
   · CSS/JS/fuentes/     copia-y-renueva     apariencia instantánea; la red
     manifest             (SWR)              refresca en segundo plano; la
                                             caché runtime muere con la versión.
   · IMÁGENES (fondos    bajo demanda        no se precachean 15 fondos: se
     y arte pesado)       (cache-first)      guardan al primer uso; el sello
                                             ?v= del arte se respeta como
                                             parte de la clave.
   · Otro mismo-origen   copia-y-renueva     por defecto seguro.
   · Cruzado / no-GET    NO SE TOCA          política de privacidad: solo
                                             persiste lo mismo-origen bajo el
                                             base-path (todo dato sellado).
   Limpieza/TTL: las cachés llevan la versión en el nombre; cada publicación
   nueva elimina TODAS las anteriores en activate — nada queda para siempre. */

const TIEMPO_RED_MS = 4000;

/* REP-002: toda ida a la red del worker revalida contra el servidor
   (cache:"no-cache" → condicional con ETag). Sin esto, el caché HTTP del
   CDN podía mezclar versiones: página nueva + módulo viejo (el espejo de
   la Agenda murió así en el dispositivo del Director, 2026-08-20). */
const fresco = (req) => fetch(req.url, { cache: "no-cache", credentials: "same-origin" });

function conTiempo(promesa, ms) {
  return new Promise((cumple, falla) => {
    const t = setTimeout(() => falla(new Error("tiempo de red agotado")), ms);
    promesa.then((v) => { clearTimeout(t); cumple(v); },
                 (e) => { clearTimeout(t); falla(e); });
  });
}

function respuestaSinRed(destino) {
  if (destino === "document") {
    return new Response(
      `<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ATHENEA · sin conexión</title>
<body style="margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#05060e;color:#f2ead9;font-family:Georgia,serif;text-align:center">
<div><div style="font-size:34px;color:#f0c96a">✦</div>
<p style="letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#f0c96a;font-family:system-ui,sans-serif">Sin conexión</p>
<p style="max-width:34ch;line-height:1.6;color:#9a93a8">Esta pantalla aún no está guardada en el dispositivo. ATHENEA volverá con la red.</p>
<p style="font-family:system-ui,sans-serif;font-size:11px"><a href="javascript:location.reload()" style="color:#f0c96a">REINTENTAR</a></p>
</div></body></html>`,
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
  return new Response("", { status: 503, statusText: "sin conexión" });
}

async function navegar(req) {
  try {
    const r = await conTiempo(fresco(req), TIEMPO_RED_MS);
    if (r && r.ok) (await caches.open(CACHE_RUNTIME)).put(req, r.clone());
    return r; // incluso un 404 real: el SW no esconde errores de despliegue
  } catch {
    /* sin red: la copia exacta si existe (shell o visitada); si no, el aviso
       honesto — jamás servir otra pantalla fingiendo ser la pedida */
    const copia = await caches.match(req, { ignoreSearch: true });
    return copia || respuestaSinRed("document");
  }
}

async function redPrimero(req) {
  try {
    const r = await conTiempo(fresco(req), TIEMPO_RED_MS);
    if (r && r.ok) (await caches.open(CACHE_RUNTIME)).put(req, r.clone());
    return r;
  } catch {
    return (await caches.match(req)) || respuestaSinRed(req.destination);
  }
}

async function copiaYRenueva(req) {
  const copia = await caches.match(req);
  const renovacion = fresco(req)
    .then(async (r) => {
      if (r && r.ok) (await caches.open(CACHE_RUNTIME)).put(req, r.clone());
      return r;
    })
    .catch(() => null);
  return copia || (await renovacion) || respuestaSinRed(req.destination);
}

async function bajoDemanda(req) {
  const copia = await caches.match(req); // el sello ?v= cuenta en la clave
  if (copia) return copia;
  try {
    const r = await fetch(req);
    if (r && r.ok) (await caches.open(CACHE_RUNTIME)).put(req, r.clone());
    return r;
  } catch {
    return respuestaSinRed(req.destination);
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                       // jamás persistir mutaciones
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // lo ajeno, a la red
  if (!url.pathname.startsWith(BASE)) return;             // fuera del producto, ni tocar

  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(navegar(req));
  } else if (url.pathname.endsWith("version.json")) {
    e.respondWith(redPrimero(req));
  } else if (req.destination === "image") {
    e.respondWith(bajoDemanda(req));
  } else {
    e.respondWith(copiaYRenueva(req));                    // css/js/fuentes/manifest
  }
});
