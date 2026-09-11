/* REGISTRO VIVO DE CAPACIDADES — AV-SYNC-DINAMICA-001 (State/Sync Layer)
   =====================================================================
   Módulo ÚNICO por el que ATHENEA Visual conoce las capacidades reales del
   Razonador Jurídico, del Cerebro y de los aplicativos, con la doctrina
   local-first de la casa:

     1. JAMÁS en blanco: lo horneado en el HTML es la última verdad
        publicada; solo se reemplaza por algo mejor.
     2. Red fresca → copia del worker → horneado. La fuente declara su
        estado (EN LÍNEA · última copia · apagada).
     3. CONTRATO VERSIONADO (§19): un libro con schema_version distinto se
        RECHAZA con fallo controlado — se declara "incompatible" y queda lo
        horneado; nunca se pinta un payload que no se entiende.
     4. DISCOVERY (§9): el módulo compara contra lo último visto en este
        aparato y clasifica ADDED / UPDATED / DEPRECATED / REMOVED /
        UNCHANGED. Una capacidad nueva JAMÁS desaparece por ser desconocida:
        recibe la tarjeta premium de respaldo (§10) marcada
        SPECIALIZED_RENDERER_PENDING.
     5. La CONFIGURACIÓN del Director (config-director.mjs) filtra y ordena
        la PRESENTACIÓN; nunca muta el estado del sistema (§20, §43).
     6. Este módulo no habla con Google ni con terceros (eso es de
        agenda-espejo.mjs). Su única fuente es el libro publicado.        */

import * as Config from "./config-director.mjs";

const LIBRO = new URL("./registro-capacidades.json", import.meta.url);
const SCHEMA = 1;
const VISTO = "athenea-registro-visto";

let ultima = null;   // { libro, estado } de la última lectura

export async function leer() {
  const valida = (d) => {
    if (!d || d.schema_version !== SCHEMA)
      throw new Error("incompatible");
    return d;
  };
  try {
    const r = await fetch(LIBRO, { cache: "no-cache" });
    if (r.ok) { ultima = { libro: valida(await r.json()), estado: "en_linea" }; return ultima; }
    throw new Error("respuesta " + r.status);
  } catch (e) {
    if (String(e.message) === "incompatible") {
      ultima = { libro: null, estado: "incompatible" }; return ultima;
    }
    try {
      const r = await fetch(LIBRO);           // el worker sirve su copia
      if (r.ok) { ultima = { libro: valida(await r.json()), estado: "ultima_copia" }; return ultima; }
    } catch (e2) {
      if (String(e2.message) === "incompatible") { ultima = { libro: null, estado: "incompatible" }; return ultima; }
    }
    ultima = { libro: null, estado: "apagada" };
    return ultima;
  }
}

/* ── DISCOVERY: diferencia contra lo último visto en ESTE aparato ────── */
export function descubrir(caps) {
  let visto = {};
  try { visto = JSON.parse(localStorage.getItem(VISTO) || "{}"); } catch {}
  const cambios = { ADDED: [], UPDATED: [], DEPRECATED: [], REMOVED: [], UNCHANGED: [] };
  const ahora = {};
  for (const c of caps) {
    ahora[c.id] = { estado: c.estado, version: c.version || null };
    const previo = visto[c.id];
    if (!previo) cambios.ADDED.push(c.id);
    else if (c.estado === "DEPRECATED" && previo.estado !== "DEPRECATED") cambios.DEPRECATED.push(c.id);
    else if (previo.estado !== c.estado || previo.version !== (c.version || null)) cambios.UPDATED.push(c.id);
    else cambios.UNCHANGED.push(c.id);
  }
  for (const id of Object.keys(visto)) if (!(id in ahora)) cambios.REMOVED.push(id);
  try { localStorage.setItem(VISTO, JSON.stringify(ahora)); } catch {}
  return cambios;
}

/* ── RESOLUCIÓN VISUAL: estado del sistema + configuración del Director ─
   (§21) La configuración SOLO filtra/ordena la presentación.            */
export function resolver(caps) {
  const conf = Config.actual();
  return caps
    .filter(c => !conf.ocultas.includes(c.id))
    .sort((a, b) => (conf.prioridad[b.id] || 0) - (conf.prioridad[a.id] || 0));
}

/* ── PINTADO ──────────────────────────────────────────────────────────
   a) [data-cap="id.campo"]  → cifra puntual (metricas.x, estado, version),
      conservando el texto horneado si el libro no la trae.
   b) [data-registro-lista data-fuentes="razonador,cerebro"] → tarjetas de
      capacidades con el ADN premium (fallback §10). data-conf="1" habilita
      el ajuste de visibilidad del Director sobre cada tarjeta.
   c) [data-registro-estado] → estampa honesta de la fuente.             */
const ROTULO = {
  en_linea: "registro EN LÍNEA",
  ultima_copia: "última copia guardada",
  apagada: "registro apagado — se muestra lo último publicado",
  incompatible: "registro de versión incompatible — se muestra lo último publicado",
};
const CHIP = { ACTIVE: ["verde", "VIGENTE"], EXPERIMENTAL: ["oro", "BETA"],
  DEVELOPMENT: ["oro", "EN DESARROLLO"], DEPRECATED: ["neutro", "RETIRADA"],
  DISABLED: ["neutro", "APAGADA"], REMOVED: ["neutro", "RETIRADA"],
  UNAVAILABLE: ["neutro", "NO DISPONIBLE"], ERROR: ["rojo", "EN ERROR"] };
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const MES3 = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function campoDe(c, ruta) {
  if (ruta === "estado") return (CHIP[c.estado] || ["neutro", c.estado])[1];
  if (ruta === "version") return c.version;
  if (ruta === "version_corta") return (c.version || "").split("-")[0] || undefined;
  if (ruta === "detalle_corto") {
    const d = new Date((c.metricas?.build || "").slice(0, 10) + "T12:00:00");
    const fecha = isNaN(d) ? "" : ` · ${d.getDate()} ${MES3[d.getMonth()]}`;
    return c.detalle ? c.detalle.toLowerCase() + fecha : undefined;
  }
  if (ruta === "capacidad") return c.capacidad;
  if (ruta.startsWith("metricas.")) {
    const v = (c.metricas || {})[ruta.slice(9)];
    return typeof v === "number" ? v.toLocaleString("es-PE").replace(/,/g, ".") : v;
  }
  return undefined;
}

/* ── PREMIUM RENDERER REGISTRY (R2 §13) ───────────────────────────────
   capability_type → renderer. Un solo domicilio: nada de condicionales
   visuales dispersos. Lo que no tenga renderer propio cae al respaldo
   premium y queda marcado SPECIALIZED_RENDERER_PENDING (§15).          */
const RENDERERS = {
  censo: { variante: "cifra-primero", pendiente: false, pinta: tarjetaCenso },
  "*": { variante: "respaldo-premium", pendiente: true, pinta: tarjetaRespaldo },
};
function rendererDe(c) { return RENDERERS[c.tipo] || RENDERERS["*"]; }

/* renderer CENSO: la cifra manda (ADN .fecha como plinto del número) */
function tarjetaCenso(c, conConf, oculta = false) {
  const [tono, rotulo] = CHIP[c.estado] || ["neutro", c.estado];
  const m = c.metricas || {};
  const principal = m.notas ?? m.aristas ?? Object.values(m).find(v => typeof v === "number");
  const resto = Object.entries(m)
    .filter(([, v]) => v !== null && v !== undefined && v !== principal)
    .slice(0, 2).map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "number" ? v.toLocaleString("es-PE").replace(/,/g, ".") : v}`)
    .join(" · ");
  return `
  <div class="fila" data-cap-id="${esc(c.id)}" data-renderer="censo"${oculta ? ' style="opacity:.38"' : ""}>
    <span class="fecha">${typeof principal === "number" ? principal.toLocaleString("es-PE").replace(/,/g, ".") : esc(principal ?? "—")}</span>
    <span><b>${esc(c.capacidad)}</b>${resto ? ` — ${esc(resto)}` : ""}
      <span class="sub" style="display:block;opacity:.75">${esc(c.modulo)} · medida de ${esc(c.fuente || "")}</span></span>
    <span class="chip ${tono}">${rotulo}</span>
    ${conConf ? botonConf(c, oculta) : ""}
  </div>`;
}

function botonConf(c, oculta) {
  return `<button class="baja" data-conf-cap="${esc(c.id)}" aria-label="${oculta ? "Mostrar" : "Ocultar"} ${esc(c.capacidad)}" title="${oculta ? "Mostrar" : "Ocultar"}">${oculta ? "◎" : "―"}</button>`;
}

function tarjetaRespaldo(c, conConf, oculta = false) {
  const [tono, rotulo] = CHIP[c.estado] || ["neutro", c.estado];
  const met = Object.entries(c.metricas || {})
    .filter(([, v]) => v !== null && v !== undefined)
    .slice(0, 3)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "number" ? v.toLocaleString("es-PE").replace(/,/g, ".") : v}`)
    .join(" · ");
  return `
  <div class="fila" data-cap-id="${esc(c.id)}" data-renderer="fallback-premium"
       data-pendiente="SPECIALIZED_RENDERER_PENDING"${oculta ? ' style="opacity:.38"' : ""}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 L20.5 8 V16 L12 20.5 L3.5 16 V8 Z"/><circle cx="12" cy="12" r="2.6"/></svg>
    <span><b>${esc(c.capacidad)}</b>${c.version ? ` · ${esc(c.version)}` : ""}${met ? ` — ${esc(met)}` : ""}
      <span class="sub" style="display:block;opacity:.75">${esc(c.modulo)} · ${c.procedencia === "medida" ? "medida de " : "declarada por "}${esc(c.fuente || "")}</span></span>
    <span class="chip ${tono}">${rotulo}</span>
    ${conConf ? botonConf(c, oculta) : ""}
  </div>`;
}

export async function pintar(doc = document) {
  const { libro, estado } = await leer();
  let vivas = 0;
  if (libro) {
    const caps = libro.capacidades || [];
    const porId = Object.fromEntries(caps.map(c => [c.id, c]));
    descubrir(caps);
    for (const el of doc.querySelectorAll("[data-cap]")) {
      // data-cap="<id de capacidad>.<ruta>" — el id lleva puntos, así que se
      // busca el PREFIJO más largo que exista en el libro; el resto es la ruta
      const marca = el.dataset.cap;
      let cap = null, ruta = "";
      for (let i = marca.lastIndexOf("."); i > 0; i = marca.lastIndexOf(".", i - 1)) {
        if (porId[marca.slice(0, i)]) { cap = porId[marca.slice(0, i)]; ruta = marca.slice(i + 1); break; }
      }
      const v = cap ? campoDe(cap, ruta) : undefined;
      if (v !== undefined && v !== null && String(v) !== el.textContent) { el.textContent = v; vivas++; }
      else if (v !== undefined && v !== null) vivas++;
    }
    for (const cont of doc.querySelectorAll("[data-registro-lista]")) {
      const fuentes = (cont.dataset.fuentes || "").split(",").filter(Boolean);
      const conConf = cont.dataset.conf === "1" && cont.dataset.ajustando === "1";
      /* resolución de visibilidad (R2 §39): EXISTE + HABILITADA (fuente
         no la marca oculta) + CONFIG del Director = VISIBLE */
      const propias = caps
        .filter(c => !fuentes.length || fuentes.includes(c.source))
        .filter(c => (c.visibilidad || "visible") === "visible");
      const visibles = resolver(propias);
      const ocultas = conConf ? propias.filter(c => !visibles.includes(c)) : [];
      /* CONTROL DE DENSIDAD (R2 §66): revelación progresiva — cada módulo
         es un grupo plegable; crecer en capacidades no satura la pantalla */
      let abiertos;
      try { abiertos = JSON.parse(localStorage.getItem("athenea-registro-abierto") || "null"); } catch {}
      const grupos = [];
      for (const c of [...visibles, ...ocultas]) {
        let g = grupos.find(x => x.modulo === c.modulo);
        if (!g) { g = { modulo: c.modulo, filas: [], estados: {} }; grupos.push(g); }
        g.filas.push(rendererDe(c).pinta(c, conConf, ocultas.includes(c)));
        g.estados[c.estado] = (g.estados[c.estado] || 0) + 1;
      }
      cont.innerHTML = grupos.map((g, i) => {
        const abierto = Array.isArray(abiertos) ? abiertos.includes(g.modulo) : i === 0;
        const resumen = Object.entries(g.estados)
          .map(([e, n]) => `${n} ${(CHIP[e] || ["", e])[1].toLowerCase()}`).join(" · ");
        return `
        <button data-grupo="${esc(g.modulo)}" aria-expanded="${abierto}"
          style="all:unset;cursor:pointer;display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;margin:10px 2px 2px;font:600 10px/1 var(--fuente-interfaz);letter-spacing:.22em;text-transform:uppercase;color:var(--athenea-atenuado);min-height:32px">
          <span style="color:var(--gold)">${abierto ? "▾" : "▸"}</span>
          <span style="flex:1">${esc(g.modulo)}</span>
          <span style="letter-spacing:.05em;text-transform:none;opacity:.8">${g.filas.length} · ${esc(resumen)}</span>
        </button>` + (abierto ? g.filas.join("") : "");
      }).join("");
      vivas += visibles.length;
    }
  }
  for (const el of doc.querySelectorAll("[data-registro-estado]")) {
    const fecha = libro?.generado ? " · generado " + libro.generado.slice(0, 10) : "";
    const cambio = libro?.ultimo_cambio ? " · último cambio: " + libro.ultimo_cambio : "";
    el.textContent = ROTULO[estado] + fecha + cambio;
    el.dataset.estado = estado;
  }
  return { vivas, estado };
}

/* ajuste del Director: botones de las tarjetas + botón AJUSTAR — la acción
   queda en la configuración persistente y auditable; el libro NO se toca */
export function gobernar(doc = document) {
  doc.addEventListener("click", (ev) => {
    const g = ev.target.closest("[data-grupo]");
    if (g) {
      // revelación progresiva: recordar en el aparato qué grupos están abiertos
      let abiertos;
      try { abiertos = JSON.parse(localStorage.getItem("athenea-registro-abierto") || "null"); } catch {}
      if (!Array.isArray(abiertos)) {
        abiertos = [...doc.querySelectorAll('[data-grupo][aria-expanded="true"]')].map(x => x.dataset.grupo);
      }
      const m = g.dataset.grupo;
      abiertos = abiertos.includes(m) ? abiertos.filter(x => x !== m) : [...abiertos, m];
      try { localStorage.setItem("athenea-registro-abierto", JSON.stringify(abiertos)); } catch {}
      pintar(doc).catch(() => {});
      return;
    }
    const b = ev.target.closest("[data-conf-cap]");
    if (b) {
      const id = b.dataset.confCap;
      if (Config.actual().ocultas.includes(id)) Config.mostrar(id); else Config.ocultar(id);
      pintar(doc).catch(() => {});
      return;
    }
    const a = ev.target.closest("[data-conf-ajustar]");
    if (a) {
      for (const cont of doc.querySelectorAll('[data-registro-lista][data-conf="1"]'))
        cont.dataset.ajustando = cont.dataset.ajustando === "1" ? "0" : "1";
      a.setAttribute("aria-pressed", a.getAttribute("aria-pressed") === "true" ? "false" : "true");
      pintar(doc).catch(() => {});
    }
  });
}

export function vigilar(doc = document) {
  const refresca = () => { pintar(doc).catch(() => {}); };
  window.addEventListener("online", refresca);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresca(); });
}

export function estadoFuente() { return ultima ? ultima.estado : "apagada"; }
