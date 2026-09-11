/* COSMOS DE FONDO — el universo como superficie del régimen operativo.
   =====================================================================
   No es un adorno de esquina: es el cielo entero detrás del contenido.
   Tres planos de estrellas con titileo y deriva lentísima, velos de
   nebulosa oro/violeta y, muy de cuando en cuando, una estrella fugaz.
   El contenido flota en el vacío; el cielo nunca compite con él.

   Uso:
     <div class="adn-cielo"><canvas></canvas></div>
     import { cosmosFondo } from "/platform/brand/cosmos-fondo.mjs";
     cosmosFondo(canvas);

   Tokens de la capa; reduced-motion lo deja quieto; pestaña oculta lo pausa.
   P3B (AV-P3B-RENDER-001): consume la Render Policy del Director — la
   densidad, el titileo y el DPR los gobierna la política, no este módulo. */
import { inteligenciaRender } from "./render-politica.mjs";

export function cosmosFondo(cv, opts = {}) {
  const RENDER = inteligenciaRender();
  const CS = getComputedStyle(document.documentElement);
  const T = n => CS.getPropertyValue(n).trim();
  const PRACTICA = T("--athenea-practica");
  const DOCTRINA = T("--athenea-doctrina");
  const MARFIL   = T("--athenea-marfil");
  if (!PRACTICA || !DOCTRINA || !MARFIL) {
    console.error("ATHENEA: falta la capa de tokens para el cosmos de fondo.");
    return () => {};
  }
  const QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches
              || RENDER.ajustes().reducido;   /* P3B: REDUCED del Director */
  const SEMILLA = opts.semilla ?? 20260802;

  const g = cv.getContext("2d");
  let W, H, dpr, estrellas = [], velos = [], fugaz = null, vivo = true, raf = 0;

  const hex = (h, a) => {
    const s = h.replace("#", "");
    const b = parseInt(s.length === 3 ? s.split("").map(c => c + c).join("") : s, 16);
    return `rgba(${b >> 16 & 255},${b >> 8 & 255},${b & 255},${a})`;
  };

  function sembrar() {
    const rnd = (s => () => (s = s * 16807 % 2147483647) / 2147483647)(SEMILLA);
    estrellas = []; velos = [];
    // P3B: la densidad base la matiza la política (preset del Director)
    const densidad = Math.round((W * H) / 6200 * RENDER.ajustes().estrellas);
    for (let plano = 0; plano < 3; plano++) {
      const n = Math.round(densidad * [0.62, 0.27, 0.11][plano]);
      for (let i = 0; i < n; i++) estrellas.push({
        x: rnd(), y: rnd(),
        r: [0.55, 0.95, 1.5][plano] * (0.6 + rnd() * 0.7),
        a: [0.14, 0.30, 0.55][plano] * (0.5 + rnd() * 0.6),
        t: rnd() * 9, vel: 0.3 + rnd() * 0.8, plano,
      });
    }
    for (let i = 0; i < 4; i++) velos.push({
      x: rnd(), y: rnd() * 0.8,
      rad: 0.22 + rnd() * 0.3, br: rnd() < 0.55 ? 0 : 1,
      a: 0.020 + rnd() * 0.022, t: rnd() * 9,
    });
  }

  function lienzo() {
    dpr = Math.min(devicePixelRatio || 1, RENDER.ajustes().dpr);
    const r = cv.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function medir() { lienzo(); sembrar(); }
  /* P3B · cambio de tier en boundary seguro: solo el DPR del lienzo — las
     estrellas son coordenadas normalizadas, cero pop de geometría */
  const bajaTier = RENDER.alCambio(() => { if (vivo) lienzo(); });

  /* P3B (REN5): tiempo VISIBLE acumulado — sin saltos de fase al volver
     del segundo plano, sin deltas gigantes */
  let tAnim = 0, previo = 0;
  let proxFugaz = 9 + Math.abs(Math.sin(SEMILLA)) * 20;
  function cuadro(ahora) {
    if (!vivo) return;
    const AJ = RENDER.ajustes();      // mandos del tier vivo (P3B)
    tAnim += Math.min(64, ahora - (previo || ahora)) / 1000; previo = ahora;
    const t = QUIETO ? 5 : tAnim;
    g.clearRect(0, 0, W, H);

    // velos de nebulosa, apenas — P3B orden 4: el glow secundario cede
    g.globalCompositeOperation = "lighter";
    for (let iV = 0; iV < velos.length; iV++) {
      if (AJ.glow < 0.5 && iV % 2) continue;
      const v = velos[iV];
      const rad = v.rad * Math.min(W, H);
      const lat = QUIETO ? 1 : 0.8 + 0.2 * Math.sin(t * 0.11 + v.t);
      const gr = g.createRadialGradient(v.x * W, v.y * H, 1, v.x * W, v.y * H, rad);
      gr.addColorStop(0, hex(v.br ? DOCTRINA : PRACTICA, v.a * lat * (0.6 + 0.4*AJ.glow)));
      gr.addColorStop(1, hex(v.br ? DOCTRINA : PRACTICA, 0));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }

    // estrellas: titileo y deriva por plano (paralaje del vacío)
    // P3B órdenes 2 y 3: el polvo estelar (plano 0) cede densidad por tier
    // y el titileo secundario baja de frecuencia; el plano 2 titila siempre
    const cadaT = AJ.twinkle >= 1 ? 1 : AJ.twinkle >= 0.7 ? 2 : AJ.twinkle >= 0.45 ? 3 : 5;
    for (let iE = 0; iE < estrellas.length; iE++) {
      const e = estrellas[iE];
      if (e.plano === 0 && iE % 10 >= AJ.particulas * 10) continue;
      const titila = e.plano === 2 || iE % cadaT === 0;
      const der = QUIETO ? 0 : t * (e.plano + 1) * 0.55 * AJ.movimiento;
      const x = ((e.x * W + der) % (W + 8)) - 4;
      const a = e.a * (QUIETO ? 1 : !titila ? 0.85 : 0.7 + 0.3 * Math.sin(t * e.vel + e.t));
      g.fillStyle = hex(MARFIL, a);
      g.beginPath(); g.arc(x, e.y * H, e.r, 0, 7); g.fill();
    }

    // la estrella fugaz: rara, breve, discreta — glow alto solamente (P3B)
    if (!QUIETO && AJ.glow >= 0.6) {
      if (!fugaz && t > proxFugaz) {
        fugaz = { x0: 0.15 + (Math.sin(t * 7.3) * 0.5 + 0.5) * 0.6,
                  y0: 0.08 + (Math.cos(t * 5.1) * 0.5 + 0.5) * 0.3,
                  t0: t };
        proxFugaz = t + 24 + (Math.sin(t * 3.7) * 0.5 + 0.5) * 30;
      }
      if (fugaz) {
        const edad = (t - fugaz.t0) / 0.9;
        if (edad >= 1) fugaz = null;
        else {
          const lx = fugaz.x0 * W + edad * W * 0.16, ly = fugaz.y0 * H + edad * H * 0.06;
          const cola = g.createLinearGradient(lx - W * 0.05, ly - H * 0.018, lx, ly);
          cola.addColorStop(0, hex(MARFIL, 0));
          cola.addColorStop(1, hex(MARFIL, 0.5 * Math.sin(edad * Math.PI)));
          g.strokeStyle = cola; g.lineWidth = 1;
          g.beginPath(); g.moveTo(lx - W * 0.05, ly - H * 0.018); g.lineTo(lx, ly); g.stroke();
        }
      }
    }

    g.globalCompositeOperation = "source-over";
    if (!QUIETO) raf = requestAnimationFrame(cuadro);
  }

  const onVis = () => {
    if (document.hidden) { vivo = false; cancelAnimationFrame(raf); }
    else if (!vivo) { vivo = true; previo = 0; raf = requestAnimationFrame(cuadro); }
  };
  document.addEventListener("visibilitychange", onVis);
  addEventListener("resize", medir);
  medir();
  raf = requestAnimationFrame(cuadro);
  if (QUIETO) cuadro(performance.now());

  return () => {
    vivo = false; cancelAnimationFrame(raf);
    document.removeEventListener("visibilitychange", onVis);
    removeEventListener("resize", medir);
    bajaTier();
  };
}
