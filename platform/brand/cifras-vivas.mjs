/* CIFRAS VIVAS — AV-CIFRAS-VIVAS-001
   ===================================
   Módulo ÚNICO del que las pantallas toman sus cifras y el ESTADO de la
   fuente. Doctrina de la casa (la misma de la Agenda local-first):

     1. La pantalla NUNCA se queda en blanco: el texto horneado en el HTML
        es la última verdad publicada y solo se reemplaza por algo mejor.
     2. La red se consulta en segundo plano (datos-vivos.json, sin caché);
        si responde, las cifras se ACTUALIZAN AL INSTANTE y la fuente se
        declara EN LÍNEA.
     3. Sin red, vale la última copia del worker (ÚLTIMA COPIA); si ni eso,
        queda lo horneado y la fuente se declara APAGADA. Jamás se inventa.
     4. Este módulo NO habla con Google ni con ningún tercero (Ley 1:
        solo agenda-espejo.mjs conversa con Google). Su única fuente es el
        libro mayor datos-vivos.json publicado junto a la app.            */

const LIBRO = new URL("./datos-vivos.json", import.meta.url);

let ultima = null;   // { libro, estado } de la última lectura

/* lee el libro mayor: red fresca → copia del worker → nada (horneado) */
export async function leer() {
  try {
    const r = await fetch(LIBRO, { cache: "no-cache" });
    if (r.ok) { ultima = { libro: await r.json(), estado: "en_linea" }; return ultima; }
    throw new Error("respuesta " + r.status);
  } catch {
    try {
      const r = await fetch(LIBRO);            // el worker sirve su copia
      if (r.ok) { ultima = { libro: await r.json(), estado: "ultima_copia" }; return ultima; }
    } catch {}
    ultima = { libro: null, estado: "apagada" };
    return ultima;
  }
}

/* pinta cada [data-vivo] del documento con el libro mayor; devuelve cuántas
   cifras quedaron VIVAS. Con la fuente apagada no toca nada (horneado). */
export async function llenar(doc = document) {
  const { libro, estado } = await leer();
  let vivas = 0;
  if (libro && libro.valores_inyectados) {
    for (const el of doc.querySelectorAll("[data-vivo]")) {
      const v = libro.valores_inyectados[el.dataset.vivo];
      if (v !== undefined && el.textContent !== v) { el.textContent = v; vivas++; }
      else if (v !== undefined) vivas++;
    }
  }
  estampar(doc, estado, libro);
  return { vivas, estado };
}

/* declara el estado de la fuente en cada [data-cifras-estado] — honesto:
   EN LÍNEA (recién leído) · ÚLTIMA COPIA (guardada por el worker) ·
   APAGADA (se muestra lo último publicado). Incluye la fecha del censo. */
const ROTULO = {
  en_linea: "fuente EN LÍNEA",
  ultima_copia: "última copia guardada",
  apagada: "fuente apagada — se muestra lo último publicado",
};
function estampar(doc, estado, libro) {
  const fecha = libro?.valores_inyectados?.censo_fecha_corta;
  const texto = (fecha ? `censo del ${fecha} · ` : "") + ROTULO[estado];
  for (const el of doc.querySelectorAll("[data-cifras-estado]")) {
    el.textContent = texto;
    el.dataset.estado = estado;
  }
}

/* vigilancia: al volver la red o volver a la app, releer y repintar.
   El que llama decide el documento; los ciclos sin cambios no repintan. */
export function vigilar(doc = document) {
  const refresca = () => { llenar(doc).catch(() => {}); };
  window.addEventListener("online", refresca);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresca(); });
}

export function estado() { return ultima ? ultima.estado : "apagada"; }
