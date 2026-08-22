/* AGENDA · ALMACÉN DE EVENTOS — AV-AGENDA-PERSISTENCE-001
   ========================================================
   Repositorio central y DURABLE de la Agenda (IndexedDB del dispositivo).
   PRINCIPIO INMUTABLE: la interfaz SIEMPRE pinta desde este almacén;
   Google Calendar es un par de sincronización, jamás el renderer.

   Este módulo NO habla con Google (Ley 1: solo agenda-espejo.mjs lo
   hace). Aquí viven: eventos con su estado de sincronización, lápidas
   (tombstones), y metadatos (syncToken, feriados, última sincronía).

   Estados de sincronización (orden del Director):
     synced · pending_create · pending_update · pending_delete ·
     sync_error · conflict                                            */

const BD = "athenea-agenda";
const VERSION = 1;
const EVENTOS = "eventos";
const META = "meta";

let bd = null;

function abrir() {
  if (bd) return Promise.resolve(bd);
  return new Promise((res, rej) => {
    const pet = indexedDB.open(BD, VERSION);
    pet.onupgradeneeded = () => {
      const d = pet.result;
      if (!d.objectStoreNames.contains(EVENTOS)) {
        const st = d.createObjectStore(EVENTOS, { keyPath: "atheneaEventId" });
        st.createIndex("porGoogle", "googleEventId", { unique: false });
        st.createIndex("porEstado", "syncState", { unique: false });
      }
      if (!d.objectStoreNames.contains(META)) d.createObjectStore(META, { keyPath: "clave" });
    };
    pet.onsuccess = () => { bd = pet.result; bd.onclose = () => { bd = null; }; res(bd); };
    pet.onerror = () => rej(pet.error || new Error("IndexedDB no disponible"));
  });
}

function tx(almacen, modo, fn) {
  return abrir().then((d) => new Promise((res, rej) => {
    const t = d.transaction(almacen, modo);
    const st = t.objectStore(almacen);
    const salida = fn(st);
    t.oncomplete = () => res(salida && salida.__valor !== undefined ? salida.__valor : salida);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error("transacción abortada"));
  }));
}

function pedir(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}

export function idNuevo() {
  return "ath-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

/* ── EVENTOS ─────────────────────────────────────────────────────── */

export async function guardar(registro) {
  registro.updatedAt = new Date().toISOString();
  await tx(EVENTOS, "readwrite", (st) => st.put(registro));
  return registro;
}

export async function guardarVarios(registros) {
  const ahora = new Date().toISOString();
  await tx(EVENTOS, "readwrite", (st) => { for (const r of registros) { r.updatedAt = ahora; st.put(r); } });
  return registros.length;
}

export async function porId(atheneaEventId) {
  return abrir().then((d) => pedir(d.transaction(EVENTOS).objectStore(EVENTOS).get(atheneaEventId)));
}

export async function porGoogleId(googleEventId) {
  if (!googleEventId) return null;
  const todos = await abrir().then((d) =>
    pedir(d.transaction(EVENTOS).objectStore(EVENTOS).index("porGoogle").getAll(googleEventId)));
  return todos[0] || null;
}

/* todos los REGISTROS del almacén (incluye lápidas; el que pinta filtra) */
export async function todos() {
  return abrir().then((d) => pedir(d.transaction(EVENTOS).objectStore(EVENTOS).getAll()));
}

/* los VIVOS (sin lápidas) — lo que la interfaz pinta */
export async function vivos() {
  return (await todos()).filter((r) => !r.deletedAt);
}

/* pendientes de enviar a Google (el Outbox es el propio estado) */
export async function pendientes() {
  return (await todos()).filter((r) =>
    ["pending_create", "pending_update", "pending_delete", "sync_error"].includes(r.syncState));
}

/* lápida: JAMÁS se borra físicamente por ausencia; solo confirmación */
export async function sepultar(atheneaEventId, origen) {
  const r = await porId(atheneaEventId);
  if (!r) return null;
  r.deletedAt = new Date().toISOString();
  r.source = origen || r.source;
  return guardar(r);
}

export async function borrarFisico(atheneaEventId) {
  /* solo para higiene de lápidas viejas confirmadas — nunca para render */
  await tx(EVENTOS, "readwrite", (st) => st.delete(atheneaEventId));
}

/* SALIR del Director: el dispositivo olvida TODO (privacidad) */
export async function vaciar() {
  await tx(EVENTOS, "readwrite", (st) => st.clear());
  await tx(META, "readwrite", (st) => st.clear());
}

/* ── META (syncToken · feriados · última sincronía) ──────────────── */

export async function metaPon(clave, valor) {
  await tx(META, "readwrite", (st) => st.put({ clave, valor }));
}

export async function metaLee(clave) {
  const r = await abrir().then((d) => pedir(d.transaction(META).objectStore(META).get(clave)));
  return r ? r.valor : null;
}

export function disponible() {
  try { return typeof indexedDB !== "undefined"; } catch { return false; }
}
