/* AGENDA ESPEJO — AV-P3E-AGENDA-GCAL-001
   ========================================
   EL módulo central de la Agenda viva: toda la conversación con Google
   (identidad, lectura, escritura, adjuntos, feriados) vive AQUÍ. Las
   pantallas consumen este módulo; jamás llaman a Google por su cuenta.
   El Director gobierna la Agenda desde este único archivo.

   DOS MODOS — LEY DE ORO (ENABLED ⇔ CAPACIDAD REAL VERIFICADA):
   · LAB (por defecto, y único sin conexión): fixture sellado — PROHIBIDO
     dato real. Los controles de escritura se presentan RESERVADOS.
   · CONECTADO (solo tras OAuth real del Director en SU dispositivo):
     lectura y escritura vivas porque la capacidad existe de verdad, y
     la verdad pintada es siempre la que Google confirma.

   IDENTIDAD SIN SECRETO — decisión P3E-0 documentada: Google exige
   client_secret en su endpoint de tokens para clientes Web aun con
   PKCE; por eso la vía oficial de navegador puro es Google Identity
   Services (modelo token): script oficial del proveedor, solo orígenes
   JS autorizados, cero secretos. El token vive en memoria y
   sessionStorage del dispositivo; JAMÁS en el repositorio, JAMÁS en
   cachés del service worker, JAMÁS en registros.  */

/* ── GOBIERNO DEL DIRECTOR ────────────────────────────────────────── */
export const CONFIG = {
  /* ID de cliente OAuth (público por diseño; la seguridad la pone Google
     exigiendo la sesión del titular en el dispositivo) */
  clientId: "11874185735-keplsoh3lditokso857ou1eup2hk6por.apps.googleusercontent.com",
  /* alcances mínimos: eventos del calendario + solo archivos creados
     por la app en Drive (adjuntos) + el correo del titular (para que el
     chip de conexión declare CON QUIÉN está el espejo) */
  alcances: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
  zona: "America/Lima",
  /* calendario oficial de feriados del Perú (fuente real existente) */
  calFeriadosPE: "es.pe#holiday@group.v.calendar.google.com",
  /* firma con la que el vigía registra feriados judiciales en el
     calendario del Director — fuente honesta, jamás inventada */
  marcaJudicial: "FERIADO JUDICIAL",
  ventanaMeses: { atras: 1, adelante: 12 },
};

/* AV-AGENDA-PERSISTENCE-001 · PRINCIPIO INMUTABLE: Google NO es el
   renderer. La interfaz pinta SIEMPRE desde el Event Store durable
   (agenda-almacen, IndexedDB); Google es un par de sincronización.
   Ley funcional: UI ⇄ ALMACÉN ⇄ MOTOR DE SINCRONÍA ⇄ GOOGLE.        */
import * as Almacen from "./agenda-almacen.mjs";

const API = "https://www.googleapis.com/calendar/v3";
const API_DRIVE = "https://www.googleapis.com/upload/drive/v3";
const GIS = "https://accounts.google.com/gsi/client";

/* ── ESTADO (memoria del dispositivo; nada persiste en el repo) ───── */
const estado = {
  modo: "lab",             // "lab" | "conectado"
  token: null,             // access_token de Google (memoria + sessionStorage)
  correo: null,
  clienteToken: null,      // token client de GIS
  alDia: null,             // hora del último espejo confirmado
};

try {
  const t = sessionStorage.getItem("athenea-agenda-token");
  const c = sessionStorage.getItem("athenea-agenda-correo");
  if (t) { estado.token = t; estado.correo = c; estado.modo = "conectado"; }
} catch {}

export function modo() { return estado.modo; }
export function correo() { return estado.correo; }
export function alDia() { return estado.alDia; }

/* ── VÍNCULO PERMANENTE (orden del Director, 2026-08-20) ──────────────
   En localStorage vive SOLO la marca de que el Director ya vinculó su
   Google (jamás un token, jamás un secreto). Con la marca presente, la
   app intenta reconectar SOLA al abrir (prompt silencioso de GIS: el
   consentimiento ya está dado, no se vuelve a pedir). */
const VINCULO = "athenea-agenda-vinculo";
export function vinculada() {
  try { return localStorage.getItem(VINCULO) === "1"; } catch { return false; }
}
export function reconectar() { return conectar({ silenciosa: true }); }

/* ── IDENTIDAD (GIS token model — script oficial, bajo demanda) ───── */
function cargaGIS() {
  return new Promise((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = document.createElement("script");
    s.src = GIS; s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error("No se pudo cargar la identidad de Google (¿sin red?)"));
    document.head.appendChild(s);
  });
}

export async function conectar({ silenciosa = false } = {}) {
  await cargaGIS();
  return new Promise((res, rej) => {
    estado.clienteToken = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.clientId,
      scope: CONFIG.alcances,
      /* sin esto, una ventana bloqueada dejaba la promesa colgada para siempre */
      error_callback: (e) => rej(new Error("Google no abrió la ventana de permiso (" + (e?.type || "bloqueada") + ")")),
      callback: async (r) => {
        if (r.error) return rej(new Error("Google no autorizó: " + r.error));
        estado.token = r.access_token;
        estado.modo = "conectado";
        try { sessionStorage.setItem("athenea-agenda-token", r.access_token); } catch {}
        try { localStorage.setItem(VINCULO, "1"); } catch {}
        /* el correo es CORTESÍA del chip: se pide directo (jamás por gapi,
           cuyo manejador de 401 desconecta) — su fallo NUNCA tumba la
           sesión recién ganada. REP-001: antes, un 401 aquí devolvía al
           Director a LAB en silencio tras «Conectado…». */
        try {
          const ri = await fetch("https://www.googleapis.com/oauth2/v2/userinfo",
            { headers: { Authorization: "Bearer " + r.access_token } });
          if (ri.ok) {
            estado.correo = (await ri.json()).email || null;
            if (estado.correo) sessionStorage.setItem("athenea-agenda-correo", estado.correo);
          }
        } catch {}
        res({ modo: estado.modo, correo: estado.correo });
      },
    });
    /* silenciosa: reanuda un vínculo ya consentido sin pedir nada de nuevo */
    estado.clienteToken.requestAccessToken(silenciosa ? { prompt: "" } : {});
  });
}

/* olvidar=true SOLO cuando el Director toca SALIR: borra la marca del
   vínculo Y el almacén del dispositivo (privacidad: el aparato olvida
   todo). Un 401 (token vencido) NO olvida nada — se reconecta y el
   almacén sigue pintando el último estado válido. */
export function desconectar(olvidar = false) {
  estado.token = null; estado.correo = null; estado.modo = "lab"; estado.alDia = null;
  try {
    sessionStorage.removeItem("athenea-agenda-token");
    sessionStorage.removeItem("athenea-agenda-correo");
    if (olvidar) localStorage.removeItem(VINCULO);
  } catch {}
  if (olvidar) { try { Almacen.vaciar().catch(() => {}); } catch {} }
}

/* fetch autenticado; un 401 degrada HONESTAMENTE a LAB (token vencido) */
async function gapi(url, opciones = {}) {
  const r = await fetch(url, {
    ...opciones,
    headers: { Authorization: "Bearer " + estado.token,
               ...(opciones.cuerpo ? { "Content-Type": "application/json" } : {}),
               ...(opciones.headers || {}) },
    body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : opciones.body,
  });
  if (r.status === 401) { desconectar(); throw new Error("SESION_VENCIDA"); }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error?.message || `Google respondió ${r.status}`);
  }
  return r.status === 204 ? null : r.json();
}

/* ── CONTRATO DE EVENTO (ATHENEA ⇄ GCal, sin pérdida) ─────────────── */
/* estado del chip: rojo = vencimiento/urgente · violeta = reunión/persona
   · oro = trabajo propio. Se deriva del colorId de Google y de la marca
   ⚖/VENCE en el título — jamás se inventa. */
function estadoDe(ev) {
  const t = (ev.summary || "");
  if (/⚖|VENCE|VENCIMIENTO|PLAZO/i.test(t)) return "rojo";
  if (["11", "4"].includes(ev.colorId)) return "rojo";
  if (["3", "9", "1"].includes(ev.colorId)) return "violeta";
  if (ev.attendees && ev.attendees.length > 1) return "violeta";
  return "oro";
}

/* ── REGISTRO DEL ALMACÉN ⇄ CONTRATO DE LA INTERFAZ ───────────────── */
function registroDesdeGoogle(ev) {
  return {
    atheneaEventId: null,                    // lo pone quien inserta
    googleEventId: ev.id,
    calendarId: "primary",
    title: ev.summary || "(sin título)",
    description: ev.description || null,
    location: ev.location || null,
    start: ev.start?.date || ev.start?.dateTime || null,
    end: ev.end?.date || ev.end?.dateTime || null,
    timeZone: ev.start?.timeZone || CONFIG.zona,
    allDay: !!ev.start?.date,
    recurrence: ev.recurringEventId || null,
    reminders: ev.reminders || null,
    attachments: (ev.attachments || []).map(a => ({
      id: a.fileId, titulo: a.title, tipo: a.mimeType, url: a.fileUrl })),
    colorId: ev.colorId || null,
    attendeesCount: (ev.attendees || []).length,
    dossier: ev.extendedProperties?.private?.athenea_dossier || null,
    googleUpdatedAt: ev.updated || null,
    localUpdatedAt: null,
    syncState: "synced",
    source: "google",
    deletedAt: null,
    etag: ev.etag || null,
  };
}

function contratoDesdeRegistro(r) {
  const sim = {
    summary: r.title, colorId: r.colorId,
    attendees: Array.from({ length: r.attendeesCount || 0 }, () => ({})),
  };
  return {
    id: r.atheneaEventId,
    titulo: r.title,
    inicio: r.start, fin: r.end,
    todoDia: !!r.allDay,
    recurrente: !!r.recurrence,
    origen: r.source === "athenea" ? "athenea" : "gcal",
    estado: estadoDe(sim),
    lugar: r.location, notas: r.description,
    dossier: r.dossier,
    adjuntos: r.attachments || [],
    recordatorios: r.reminders?.useDefault ? ["del calendario"] :
      (r.reminders?.overrides || []).map(o => `${o.minutes} min antes (${o.method})`),
    feriado: null,
    etag: r.etag,
    estadoSync: r.syncState,
  };
}

function cuerpoGoogleDesdeRegistro(r) {
  const cuerpo = {
    summary: r.title,
    location: r.location || undefined,
    description: r.description || undefined,
    start: r.allDay ? { date: r.start } : { dateTime: r.start, timeZone: CONFIG.zona },
    end: r.allDay ? { date: r.end } : { dateTime: r.end, timeZone: CONFIG.zona },
  };
  if (r.dossier) cuerpo.extendedProperties = { private: { athenea_dossier: r.dossier } };
  return cuerpo;
}

/* ── LECTURA: la interfaz pinta SIEMPRE desde el almacén ──────────── */
export async function eventos() {
  const conVinculo = vinculada() || estado.modo === "conectado";
  if (!conVinculo || !Almacen.disponible()) return eventosLab();
  const vivos = await Almacen.vivos();
  return vivos.map(contratoDesdeRegistro)
    .sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
}

export async function pendientesCount() {
  if (!Almacen.disponible()) return 0;
  return (await Almacen.pendientes()).length;
}

/* ── MOTOR DE SINCRONIZACIÓN (Google como PAR, jamás renderer) ────── */
/* Primero empuja el Outbox (ATHENEA→Google), luego trae deltas
   (Google→ATHENEA) con syncToken: las eliminaciones llegan como
   status:"cancelled" — CONFIRMACIÓN inequívoca; la ausencia transitoria
   JAMÁS borra nada. Devuelve { cambios } para pintar solo si hubo.   */
export async function sincronizar() {
  if (estado.modo !== "conectado" || !Almacen.disponible()) return { cambios: 0, enviados: 0 };
  const enviados = await vaciarOutbox();
  let cambios = 0;
  let token = await Almacen.metaLee("syncToken");
  const trae = async (params) => gapi(`${API}/calendars/primary/events?` + new URLSearchParams(params));
  const paginas = [];
  try {
    let pagina = null, r;
    do {
      r = token
        ? await trae({ syncToken: token, maxResults: "250", ...(pagina ? { pageToken: pagina } : {}) })
        : await trae({
            singleEvents: "true", showDeleted: "true", maxResults: "250", timeZone: CONFIG.zona,
            timeMin: new Date(Date.now() - CONFIG.ventanaMeses.atras * 30 * 864e5).toISOString(),
            timeMax: new Date(Date.now() + CONFIG.ventanaMeses.adelante * 30 * 864e5).toISOString(),
            ...(pagina ? { pageToken: pagina } : {}),
          });
      paginas.push(...(r.items || []));
      pagina = r.nextPageToken;
      if (!pagina && r.nextSyncToken) await Almacen.metaPon("syncToken", r.nextSyncToken);
    } while (pagina);
  } catch (e) {
    if (/410|fullSyncRequired|Sync token/i.test(String(e.message))) {
      await Almacen.metaPon("syncToken", null);
      return sincronizar();               // resincronía completa, sin borrar nada
    }
    throw e;                              // red caída o sesión vencida: el almacén queda intacto
  }
  for (const ev of paginas) {
    const reg = await Almacen.porGoogleId(ev.id);
    if (ev.status === "cancelled") {
      /* eliminación CONFIRMADA por Google → lápida (única vía remota de retiro) */
      if (reg && !reg.deletedAt) { await Almacen.sepultar(reg.atheneaEventId, "google"); cambios++; }
      continue;
    }
    if (!reg) {
      const nuevo = registroDesdeGoogle(ev);
      nuevo.atheneaEventId = Almacen.idNuevo();
      await Almacen.guardar(nuevo); cambios++;
    } else if (["pending_create", "pending_update", "pending_delete"].includes(reg.syncState)) {
      /* cambio local en vuelo: lo local manda; si Google también cambió, se declara */
      if (ev.updated && reg.googleUpdatedAt && ev.updated > reg.googleUpdatedAt) {
        reg.syncState = reg.syncState === "pending_delete" ? "pending_delete" : "conflict";
        await Almacen.guardar(reg);
      }
    } else if (!reg.googleUpdatedAt || (ev.updated || "") > reg.googleUpdatedAt) {
      const g = registroDesdeGoogle(ev);
      Object.assign(reg, g, { atheneaEventId: reg.atheneaEventId, deletedAt: null, syncState: "synced" });
      await Almacen.guardar(reg); cambios++;
    }
  }
  estado.alDia = new Date();
  await Almacen.metaPon("ultimaSincronia", new Date().toISOString());
  return { cambios: cambios + enviados, enviados };
}

/* Outbox: empuja lo pendiente; ante error CONSERVA el cambio local y
   reintenta en la próxima sincronía. Jamás se revierte la interfaz. */
async function vaciarOutbox() {
  const pend = (await Almacen.pendientes())
    .sort((a, b) => String(a.localUpdatedAt).localeCompare(String(b.localUpdatedAt)));
  let enviados = 0;
  for (const r of pend) {
    try {
      if (r.deletedAt || r.syncState === "pending_delete") {
        if (r.googleEventId) {
          try { await gapi(`${API}/calendars/primary/events/${encodeURIComponent(r.googleEventId)}`, { method: "DELETE" }); }
          catch (e) { if (!/404|410|Not Found/i.test(String(e.message))) throw e; }
        }
        r.syncState = "synced";
      } else if (!r.googleEventId) {
        const g = await gapi(`${API}/calendars/primary/events`, { method: "POST", cuerpo: cuerpoGoogleDesdeRegistro(r) });
        r.googleEventId = g.id; r.etag = g.etag || null; r.googleUpdatedAt = g.updated || null;
        r.syncState = "synced";
      } else {
        const g = await gapi(`${API}/calendars/primary/events/${encodeURIComponent(r.googleEventId)}`,
          { method: "PATCH", cuerpo: cuerpoGoogleDesdeRegistro(r) });
        r.etag = g.etag || null; r.googleUpdatedAt = g.updated || null;
        r.syncState = "synced";
      }
      await Almacen.guardar(r); enviados++;
    } catch (e) {
      if (String(e.message).includes("SESION_VENCIDA")) throw e;
      r.syncState = "sync_error";           // se conserva y se reintenta
      await Almacen.guardar(r);
    }
  }
  return enviados;
}

/* envío en segundo plano tras cada escritura local (sin bloquear la UI) */
function programaEnvio() {
  if (estado.modo === "conectado" && (typeof navigator === "undefined" || navigator.onLine !== false))
    Promise.resolve().then(() => vaciarOutbox()).catch(() => {});
}

/* feriados: nacionales (calendario oficial PE) + judiciales (marca del
   vigía en el calendario del Director). Devuelve mapa AAAA-MM-DD → tipo. */
export async function feriados({ desde, hasta } = {}) {
  const mapa = {};
  if (estado.modo !== "conectado") {
    /* sin conexión: el último mapa persistido (arranque offline); LAB solo sin vínculo */
    if ((vinculada()) && Almacen.disponible()) {
      try { const m = await Almacen.metaLee("feriados"); if (m) return m; } catch {}
      return {};
    }
    return feriadosLab();
  }
  const d = desde || new Date(Date.now() - 30 * 864e5).toISOString();
  const h = hasta || new Date(Date.now() + 365 * 864e5).toISOString();
  const q = new URLSearchParams({ singleEvents: "true", timeMin: d, timeMax: h, maxResults: "250" });
  try {
    const nac = await gapi(`${API}/calendars/${encodeURIComponent(CONFIG.calFeriadosPE)}/events?${q}`);
    for (const e of nac.items || [])
      if (e.start?.date) mapa[e.start.date] = { tipo: "nacional", nombre: e.summary };
  } catch { /* el calendario público puede no estar disponible: sin invento */ }
  try {
    const qj = new URLSearchParams({ singleEvents: "true", timeMin: d, timeMax: h,
      maxResults: "250", q: CONFIG.marcaJudicial });
    const jud = await gapi(`${API}/calendars/primary/events?${qj}`);
    for (const e of jud.items || [])
      if (e.start?.date && (e.summary || "").toUpperCase().includes(CONFIG.marcaJudicial))
        mapa[e.start.date] = { tipo: "judicial", nombre: e.summary };
  } catch {}
  /* persistir para el arranque offline (último estado válido) */
  if (Almacen.disponible()) { try { await Almacen.metaPon("feriados", mapa); } catch {} }
  return mapa;
}

/* ── ESCRITURA LOCAL-FIRST (ATHENEA → almacén → Outbox → Google) ────
   Orden AV-AGENDA-PERSISTENCE-001: A) almacén inmediato · B) interfaz
   inmediata · C) Outbox · D) envío en segundo plano · E) synced al ACK
   · F) ante error se CONSERVA el cambio local y se reintenta. Jamás se
   revierte la interfaz por un timeout de Google. La escritura exige
   VÍNCULO (no conexión): sin vínculo, la ley de oro sigue reservando. */
function exigeVinculo() {
  if (!vinculada() && estado.modo !== "conectado")
    throw new Error("RESERVADO: sin vínculo con Google no hay escritura (ley de oro)");
  if (!Almacen.disponible())
    throw new Error("El dispositivo no ofrece almacén durable");
}

function registroDesdeUnidad(u, base = {}) {
  return Object.assign({
    atheneaEventId: Almacen.idNuevo(), googleEventId: null, calendarId: "primary",
    timeZone: CONFIG.zona, reminders: null, attachments: [], colorId: null,
    attendeesCount: 0, googleUpdatedAt: null, deletedAt: null, etag: null,
    source: "athenea",
  }, base, {
    title: u.titulo || "(sin título)",
    description: u.notas || null,
    location: u.lugar || null,
    start: u.inicio, end: u.fin,
    allDay: !!u.todoDia,
    dossier: u.dossier || null,
    localUpdatedAt: new Date().toISOString(),
  });
}

export async function crear(unidad) {
  exigeVinculo();
  const reg = registroDesdeUnidad(unidad);
  reg.syncState = "pending_create";
  await Almacen.guardar(reg);          // A · almacén inmediato
  programaEnvio();                     // C+D · Outbox en segundo plano
  return contratoDesdeRegistro(reg);   // B · la interfaz pinta ya
}

export async function editar(id, unidad) {
  exigeVinculo();
  const reg = await Almacen.porId(id);
  if (!reg) throw new Error("El evento no está en el almacén");
  Object.assign(reg, {
    title: unidad.titulo || reg.title,
    description: unidad.notas ?? reg.description,
    location: unidad.lugar ?? reg.location,
    start: unidad.inicio || reg.start,
    end: unidad.fin || reg.end,
    allDay: unidad.todoDia ?? reg.allDay,
    dossier: unidad.dossier ?? reg.dossier,
    localUpdatedAt: new Date().toISOString(),
    syncState: reg.syncState === "pending_create" ? "pending_create" : "pending_update",
  });
  await Almacen.guardar(reg);
  programaEnvio();
  return contratoDesdeRegistro(reg);
}

export async function eliminar(id) {
  exigeVinculo();
  const reg = await Almacen.porId(id);
  if (!reg) return true;
  reg.deletedAt = new Date().toISOString();          // lápida, no borrado físico
  reg.localUpdatedAt = reg.deletedAt;
  reg.syncState = reg.googleEventId ? "pending_delete" : "synced";
  await Almacen.guardar(reg);
  programaEnvio();
  return true;
}

/* ── ADJUNTOS (Drive del Director; viajan con la cita) ────────────── */
export async function adjuntar(idEvento, archivo) {
  /* subir bytes exige red de verdad: guardia honesta de conexión */
  if (estado.modo !== "conectado")
    throw new Error("RESERVADO: adjuntar exige conexión con Google (ley de oro)");
  const reg = await Almacen.porId(idEvento);
  if (!reg) throw new Error("El evento no está en el almacén");
  if (!reg.googleEventId) { await vaciarOutbox(); }     // primero que nazca en Google
  const reg2 = await Almacen.porId(idEvento);
  if (!reg2.googleEventId) throw new Error("El evento aún se está sincronizando; intenta en unos segundos");
  /* 1 · subir el archivo al Drive del Director (scope drive.file) */
  const meta = { name: archivo.name };
  const forma = new FormData();
  forma.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
  forma.append("file", archivo);
  const subido = await gapi(`${API_DRIVE}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink`,
    { method: "POST", body: forma });
  /* 2 · adjuntarlo al evento (la API exige reponer la lista completa) */
  const ev = await gapi(`${API}/calendars/primary/events/${encodeURIComponent(reg2.googleEventId)}`);
  const adjuntos = [...(ev.attachments || []), {
    fileId: subido.id, fileUrl: subido.webViewLink, title: subido.name, mimeType: subido.mimeType,
  }];
  const r = await gapi(`${API}/calendars/primary/events/${encodeURIComponent(reg2.googleEventId)}?supportsAttachments=true`,
    { method: "PATCH", cuerpo: { attachments: adjuntos } });
  /* 3 · persistir el delta confirmado en el almacén */
  const g = registroDesdeGoogle(r);
  Object.assign(reg2, g, { atheneaEventId: reg2.atheneaEventId, syncState: "synced", deletedAt: null });
  await Almacen.guardar(reg2);
  return contratoDesdeRegistro(reg2);
}

/* contenido de un adjunto para el VISOR (un toque, dentro de ATHENEA) y
   para la DESCARGA (un toque, nombre intacto) */
export async function contenidoAdjunto(idArchivo) {
  if (estado.modo !== "conectado")
    throw new Error("RESERVADO: abrir adjuntos exige conexión con Google (ley de oro)");
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(idArchivo)}?alt=media`,
    { headers: { Authorization: "Bearer " + estado.token } });
  if (r.status === 401) { desconectar(); throw new Error("SESION_VENCIDA"); }
  if (!r.ok) throw new Error(`Drive respondió ${r.status}`);
  return r.blob();
}

/* ── MODO LAB (fixture sellado — PROHIBIDO dato real) ─────────────── */
import { UNIDADES } from "./datos-lab.mjs";

function fecha(dias, h = 9, m = 0) {
  const f = new Date(); f.setDate(f.getDate() + dias); f.setHours(h, m, 0, 0);
  return f;
}
function iso(f) { return f.toISOString(); }
function soloDia(f) { return f.toISOString().slice(0, 10); }

/* la Agenda LAB nace del MISMO contrato de conocimiento (datos-lab):
   los plazos de ALFA y la tarea de BETA — coherencia total con Dossiers */
export function eventosLab() {
  const alfa = UNIDADES["DOS-ALFA-LAB-001"], beta = UNIDADES["DOS-BETA-LAB-002"];
  return [
    { id: "lab-1", titulo: "⚖️ VENCE: alegatos ante la Sala — " + (alfa?.titulo || "CASO ALFA"),
      inicio: iso(fecha(0, 14)), fin: iso(fecha(0, 15)), todoDia: false, recurrente: false,
      origen: "lab", estado: "rojo", lugar: "Corte Superior · Sala 2",
      notas: "Dato LAB sellado. Art. 32 NLPT: cómputo NO COMPUTABLE mientras no conste la notificación acreditada.",
      dossier: "DOS-ALFA-LAB-001", adjuntos: [], recordatorios: ["1 día antes", "1 hora antes"], feriado: null },
    { id: "lab-2", titulo: "Audiencia única — CASO ALFA c. MDN",
      inicio: iso(fecha(2, 9)), fin: iso(fecha(2, 10, 30)), todoDia: false, recurrente: false,
      origen: "lab", estado: "violeta", lugar: "Corte Superior de Justicia · Sala 2",
      notas: "Ficción de laboratorio: llevar tres juegos de alegatos; el testigo llega 08:30.",
      dossier: "DOS-ALFA-LAB-001", adjuntos: [], recordatorios: ["del calendario"], feriado: null },
    { id: "lab-3", titulo: "Completar definición del caso — " + (beta?.titulo || "CASO BETA"),
      inicio: iso(fecha(4, 11)), fin: iso(fecha(4, 12)), todoDia: false, recurrente: false,
      origen: "lab", estado: "oro", lugar: null,
      notas: "3 de 7 preguntas respondidas (LAB). Diez minutos lo devuelven al flujo.",
      dossier: "DOS-BETA-LAB-002", adjuntos: [], recordatorios: [], feriado: null },
  ];
}

export function feriadosLab() {
  return {
    [soloDia(fecha(9))]: { tipo: "judicial", nombre: "Sin actividad judicial (LAB)" },
    [soloDia(fecha(10))]: { tipo: "nacional", nombre: "Feriado nacional (LAB)" },
  };
}

/* diagnóstico honesto para el chip de conexión de la superficie */
export function diagnostico() {
  return {
    modo: estado.modo,
    correo: estado.correo,
    alDia: estado.alDia ? estado.alDia.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : null,
  };
}
