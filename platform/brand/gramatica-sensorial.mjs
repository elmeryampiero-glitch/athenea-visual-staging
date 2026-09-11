/* GRAMÁTICA SENSORIAL DE ATHENEA VISUAL — AV-P3C-SENSORY-001
   =========================================================
   LA fuente única de SEMÁNTICA de navegación. No intercepta enlaces, no
   posee el destino, no duplica lógica de navegación: OBSERVA la View
   Transition cross-document nativa (que corre entera en el documento
   destino) y la ENRIQUECE con una clase de datos en <html> para que la
   capa CSS (cine.css · CAPA DE CONTROL SENSORIAL) exprese la relación:

     LLEGA (arrive) · PROFUNDIZA (deepen) · RETORNA (return) ·
     LATERAL · REVELA (reveal) · DESPIDE (dismiss)
     [reservadas sin ruta cross-document hoy: CAMBIA (switch) · CULMINA (complete)]

   Clasificación DATA-DRIVEN (auditoría C0): un mapa de PLANOS + 3
   excepciones. El Director edita este mapa; jamás las 17 pantallas.
   Back/forward usan la MISMA matriz por par (origen,destino): la
   asimetría ida/vuelta emerge del plano, sin lógica especial.

   Fallbacks por construcción:
   · sin View Transitions → navegación inmediata (este módulo calla);
   · sin familia resoluble o deep-link → crossfade base de P3A;
   · prefers-reduced-motion → no existe transición (P3A) y no se anota nada. */

/* SCRIPT CLÁSICO A PROPÓSITO (no module): pagereveal puede dispararse
   antes de que un módulo diferido se ejecute; cargado en el <head> este
   archivo bloquea el parser unos milisegundos (≈2 KB, cacheado por el
   service worker) y GARANTIZA que la anotación llega antes del primer
   fotograma de la transición. */
(function () {
"use strict";

/* ── EL MAPA DEL DIRECTOR: plano cognitivo de cada superficie ─────────── */
const PLANOS = {
  "piloto-apertura": 0,            // umbral
  "piloto-home": 1,                // hub
  "piloto-cerebro": 2,             // operativas (pares entre sí)
  "piloto-agenda": 2,
  "piloto-regimen-operativo": 2,
  "piloto-alertas": 2,
  "piloto-buscar": 2,
  "piloto-bitacora": 2,
  "hero-nucleo-vivo": 2,
  "piloto-capacidades": 3,         // paneles (profundización funcional)
  "piloto-conocimiento": 3,
  "piloto-evolucion": 3,
  "piloto-motor": 3,
  "piloto-patrimonio": 3,
  "piloto-valor": 3,
  "piloto-procesos": 3,
};
/* los velos: no son lugares del árbol — EMERGEN (revela) y se DESPIDEN
   (despide). Aquí viven el fondo vivo y las UNIDADES DE CONOCIMIENTO
   individuales (P3D-0): abrir conocimiento es enfocar, no cambiar de
   página. El Director añade futuras unidades aquí, jamás por pantalla. */
const VELOS = new Set(["piloto-wallpaper", "piloto-dossier"]);

const nombre = (url) => {
  try { return new URL(url, location.href).pathname.split("/").pop().replace(/\.html$/, ""); }
  catch { return ""; }
};

/* familia semántica del par (origen, destino) — la matriz C0 entera */
function clasifica(origen, destino) {
  const o = nombre(origen), d = nombre(destino);
  if (!o || !d || o === d) return null;
  if (VELOS.has(d)) return "revela";
  if (VELOS.has(o)) return "despide";
  if (PLANOS[o] === 0) return "llega";
  const po = PLANOS[o], pd = PLANOS[d];
  if (po === undefined || pd === undefined) return null;
  if (pd > po) return "profundiza";
  if (pd < po) return "retorna";
  return "lateral";
}

/* ── OBSERVADOR: enriquece la transición en el documento destino ──────── */
const raiz = document.documentElement;
const params = new URLSearchParams(location.search);
const DEBUG = params.get("sensorial") === "debug" || params.get("render") === "debug";

addEventListener("pagereveal", (e) => {
  if (!e.viewTransition) return;               // sin VT no hay nada que anotar
  const desde = (typeof navigation !== "undefined" && navigation.activation?.from?.url)
             || document.referrer || "";
  const familia = clasifica(desde, location.href);
  /* tier del dispositivo (C5): la inteligencia viva si ya existe; si no,
     el último tier persistido por la Render Policy (P3B) — el ornamento
     sensorial cede en dispositivos limitados sin esperar a medir de nuevo */
  let tier = window.__RENDER_DIAG ? window.__RENDER_DIAG.nivel() : null;
  if (!tier) { try { tier = sessionStorage.getItem("athenea-render-tier"); } catch {} }
  const tipoNav = (typeof navigation !== "undefined" && navigation.activation?.navigationType) || "desconocido";
  window.__SENSORIAL = {
    familia, origen: nombre(desde) || null, destino: nombre(location.href),
    tipoNav, tier, estado: "TRANSITION", inicio: performance.now(),
  };
  if (familia) raiz.dataset.sensorial = familia;
  if (tier) raiz.dataset.sensorialTier = tier;
  e.viewTransition.ready.then(() => { window.__SENSORIAL.estado = "ARRIVAL"; }).catch(() => {});
  /* SETTLED garantizado: al terminar (o abortarse) no queda ni la clase —
     cero transformaciones, filtros o marcas residuales */
  e.viewTransition.finished.finally(() => {
    delete raiz.dataset.sensorial;
    delete raiz.dataset.sensorialTier;
    window.__SENSORIAL.estado = "SETTLED";
    window.__SENSORIAL.duracionMs = Math.round(performance.now() - window.__SENSORIAL.inicio);
    if (DEBUG) pintaDebug();
  });
  if (DEBUG) pintaDebug();
});

/* ── DEBUG DEL DIRECTOR (?sensorial=debug · ?render=debug) ──────────────
   Local, no intrusivo, apagado por defecto. */
let cajaDebug = null;
function pintaDebug() {
  if (!document.body) return;      // el head corre antes de que exista body
  const s = window.__SENSORIAL || {};
  if (!cajaDebug) {
    cajaDebug = document.createElement("div");
    cajaDebug.style.cssText = "position:fixed;right:8px;bottom:8px;z-index:9999;" +
      "font:11px/1.5 monospace;color:#f0c96a;background:rgba(2,4,10,.85);" +
      "padding:6px 9px;border:1px solid rgba(240,201,106,.35);border-radius:6px;pointer-events:none";
    document.body.appendChild(cajaDebug);
  }
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  cajaDebug.textContent =
    `${s.familia || "—"} · ${s.origen || "∅"}→${s.destino || "?"} · ${s.estado || "ORIGIN"}` +
    (s.duracionMs ? ` · ${s.duracionMs}ms` : "") +
    (s.tier ? ` · ${s.tier}` : "") + (reducido ? " · reduced" : "");
}

/* superficie de observación para pruebas y futuros consumidores */
window.ATHENEA_SENSORIAL = { PLANOS, VELOS, clasifica };
})();
