/* CONFIGURACIÓN DEL DIRECTOR — AV-SYNC-DINAMICA-001 (§20–§23)
   ============================================================
   Capa de PRESENTACIÓN, separada estrictamente del estado del sistema:
   ocultar o priorizar una capacidad cambia CÓMO se muestra, jamás QUÉ es.
   El libro de capacidades no se toca desde aquí.

   La configuración es del aparato del Director (localStorage):
     · versionada (version: 1) — una versión desconocida se descarta con
       fallo controlado y se vuelve al estado limpio;
     · reversible — restablecer() la devuelve a fábrica;
     · auditable — cada cambio queda en el registro_de_cambios (últimos 50).

   GUARDARRAÍL PREMIUM (§23): esta capa solo admite visibilidad y prioridad.
   No puede alterar tokens, tipografía, jerarquía ni composición: el ADN
   visual queda fuera de su alcance por construcción.                     */

const CLAVE = "athenea-config-director";
const VERSION = 2;
const LIMPIA = () => ({ version: VERSION, ocultas: [], prioridad: {},
  registro_de_cambios: [], anterior: null });

export function actual() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) || "null");
    if (c && c.version === VERSION && Array.isArray(c.ocultas)) return c;
    if (c && c.version === 1 && Array.isArray(c.ocultas)) {
      /* MIGRATABLE (R2 §10): la configuración v1 asciende sin perder nada */
      return { ...LIMPIA(), ocultas: c.ocultas, prioridad: c.prioridad || {},
               registro_de_cambios: c.registro_de_cambios || [] };
    }
  } catch {}
  return LIMPIA();
}

function guardar(c, accion, motivo) {
  c.registro_de_cambios = [...(c.registro_de_cambios || []),
    { fecha: new Date().toISOString(), accion, por: "director",
      ...(motivo ? { motivo } : {}) }].slice(-50);
  try { localStorage.setItem(CLAVE, JSON.stringify(c)); } catch {}
  return c;
}

/* toda mutación guarda la foto previa: rollback() de un paso (R2 §23) */
function conFoto(accion, motivo, muta) {
  const previa = actual();
  const c = { ...previa, ocultas: [...previa.ocultas],
    prioridad: { ...previa.prioridad },
    anterior: { ocultas: [...previa.ocultas], prioridad: { ...previa.prioridad } } };
  muta(c);
  return guardar(c, accion, motivo);
}

export function ocultar(id, motivo) {
  return conFoto(`ocultar ${id}`, motivo, c => {
    if (!c.ocultas.includes(id)) c.ocultas.push(id);
  });
}

export function mostrar(id, motivo) {
  return conFoto(`mostrar ${id}`, motivo, c => {
    c.ocultas = c.ocultas.filter(x => x !== id);
  });
}

export function priorizar(id, peso, motivo) {
  return conFoto(`priorizar ${id} → ${peso}`, motivo, c => {
    c.prioridad[id] = Number(peso) || 0;
  });
}

export function rollback() {
  const c = actual();
  if (!c.anterior) return c;
  const r = { ...c, ocultas: [...c.anterior.ocultas],
    prioridad: { ...c.anterior.prioridad }, anterior: null };
  return guardar(r, "rollback al estado anterior");
}

export function restablecer() {
  const c = LIMPIA();
  return guardar(c, "restablecer a fábrica");
}

export function auditoria() { return actual().registro_de_cambios; }
