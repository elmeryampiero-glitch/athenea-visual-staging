/* REGISTRO INDUSTRIAL DE ACCIONES DE CONOCIMIENTO — AV-P3D1-KNOWLEDGE-ENGINE-001
   ==============================================================================
   LA fuente única de las acciones que una unidad de conocimiento puede
   ofrecer. La superficie compartida (piloto-dossier) NO conoce acciones:
   consume este registro. El Director añade/gobierna acciones AQUÍ y las
   asigna por DATOS en el contrato (datos-lab.mjs · campo `acciones`),
   jamás editando pantallas.

   LEY DE ORO: ENABLED ⇔ CAPACIDAD REAL VERIFICADA.
   Una acción solo se habilita si su modalidad es navegable (href), su
   destino existe en el producto y la unidad declara la capacidad. Todo
   lo demás se presenta RESERVADO HONESTO (disabled central, P3D0.1) —
   jamás un control que finge. verificar-conocimiento.py audita este
   archivo en el repositorio (destinos existentes, reservas sin escape). */

export const ACCIONES = {
  /* Ver el caso en la Agenda — CAPACIDAD REAL: la Agenda lista los
     eventos de las unidades LAB (comprobado en el inventario P3D1-1).
     Modalidad href: navegación soberana MPA; al salir del velo la
     gramática despide (P3C) sin lógica nueva. */
  "ver-agenda": {
    rotulo: () => "Ver en la Agenda",
    modalidad: "href",
    destino: "piloto-agenda.html",
    capacidad: "agenda",                 // la unidad debe declararla
    retorno: "back del navegador (el velo ya se despidió)",
    accesibilidad: (u) => `Ver ${u.id} en la Agenda`,
  },

  /* Acción principal del expediente — SIN capacidad real hoy (exigiría
     edición/persistencia). RESERVADA por el registro: la superficie la
     pinta disabled honesto con su rótulo propio del contrato. */
  "preparar-actuacion": {
    rotulo: (u) => (u.accionPrincipal && u.accionPrincipal.rotulo) || "Acción principal",
    modalidad: "reservada",
    destino: null,
    capacidad: null,
    ayuda: "Se habilita en la siguiente fase",
    accesibilidad: (u) => `${(u.accionPrincipal && u.accionPrincipal.rotulo) || "Acción"} (reservada)`,
  },
};

/* resuelve las acciones de una unidad aplicando la ley de oro; ids
   desconocidos se ignoran con honestidad (nada se inventa) */
export function resolver(u) {
  return (u.acciones || []).map((id) => {
    const a = ACCIONES[id];
    if (!a) return null;
    const habilitada = a.modalidad === "href" && !!a.destino
      && !!a.capacidad && (u.capacidades || []).includes(a.capacidad);
    return {
      id,
      rotulo: a.rotulo(u),
      habilitada,
      href: habilitada ? a.destino : null,
      ayuda: a.ayuda || null,
      accesibilidad: a.accesibilidad(u),
    };
  }).filter(Boolean);
}
