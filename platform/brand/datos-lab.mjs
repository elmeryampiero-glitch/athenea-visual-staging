/* DATOS LAB SELLADOS — AV-P3D0-KNOWLEDGE-SURFACES-001
   ====================================================
   Fixture central de unidades de conocimiento. TODO es sintético y
   sellado (LAB): PROHIBIDO introducir información real de clientes.
   Estructura = CONTRATO DE SUPERFICIE DE CONOCIMIENTO (auditoría P3D0).
   Las superficies de detalle consumen este módulo; no definen datos. */

export const UNIDADES = {
  "DOS-ALFA-LAB-001": {
    id: "DOS-ALFA-LAB-001",
    tipo: "dossier",
    origen: "piloto-regimen-operativo",
    destino: "piloto-dossier",
    jerarquia: "principal",
    titulo: "CASO ALFA c. MDN — reposición Ley 24041",
    metadatos: {
      via: "Apelación de sentencia (proceso laboral)",
      responsable: "Elmer Suárez",
      vence: "2026-07-24",
      expediente: "DOS-ALFA-LAB-001",
    },
    estado: "rojo",
    estadoRotulo: "Rojo · vence 2026-07-24",
    contenido: {
      resumen: "Reposición al amparo de la Ley 24041 (dato LAB sellado): " +
        "trabajador con contratos sucesivos; la cuestión es la protección " +
        "frente al cese sin proceso. Expediente de laboratorio para la " +
        "superficie de conocimiento — no representa ningún caso real.",
      actuaciones: [
        { fecha: "2026-07-02", texto: "Sentencia de primera instancia notificada (LAB).", estado: "verde" },
        { fecha: "2026-07-09", texto: "Apelación presentada dentro de plazo (LAB).", estado: "verde" },
        { fecha: "2026-07-18", texto: "Traslado a la contraparte; pendiente absolución (LAB).", estado: "ambar" },
        { fecha: "2026-07-24", texto: "Vence plazo para alegatos ante la Sala (LAB).", estado: "rojo" },
      ],
    },
    relaciones: [],
    /* P3D-1: capacidades REALES verificables de esta unidad (el registro
       central de acciones solo habilita lo que aparece aquí) */
    capacidades: ["agenda"],
    acciones: ["ver-agenda", "preparar-actuacion"],
    accionPrincipal: { rotulo: "Preparar actuación", reservada: true },
    retorno: "piloto-regimen-operativo.html",
    semantica: { entrada: "revela", salida: "despide" },
    render: "heredado",
    fixture: true,
    accesibilidad: "Dossier CASO ALFA contra MDN",
  },

  "DOS-BETA-LAB-002": {
    id: "DOS-BETA-LAB-002",
    tipo: "dossier",
    origen: "piloto-regimen-operativo",
    destino: "piloto-dossier",
    jerarquia: "principal",
    titulo: "CASO BETA c. UDS — CAS",
    metadatos: {
      via: "Régimen CAS (D.Leg. 1057)",
      responsable: "Elmer Suárez",
      vence: null,
      expediente: "DOS-BETA-LAB-002",
    },
    estado: "ambar",
    estadoRotulo: "Bloqueado · definición 3 de 7",
    contenido: {
      resumen: "Controversia bajo régimen CAS (dato LAB sellado): la " +
        "definición del caso está incompleta (3 de 7 preguntas). La " +
        "arquitectura queda congelada mientras el expediente esté " +
        "pendiente. Ficción de laboratorio.",
      actuaciones: [
        { fecha: "2026-07-28", texto: "Apertura del dossier y primeras 3 respuestas (LAB).", estado: "verde" },
        { fecha: "2026-08-04", texto: "Pendientes 4 preguntas de definición del caso (LAB).", estado: "ambar" },
      ],
    },
    relaciones: [],
    capacidades: ["agenda"],
    acciones: ["ver-agenda", "preparar-actuacion"],
    accionPrincipal: { rotulo: "Completar definición", reservada: true },
    retorno: "piloto-regimen-operativo.html",
    semantica: { entrada: "revela", salida: "despide" },
    render: "heredado",
    fixture: true,
    accesibilidad: "Dossier CASO BETA contra UDS",
  },
};
