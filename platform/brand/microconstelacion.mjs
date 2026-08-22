/* MICROCONSTELACIÓN — el eco del núcleo vivo en el régimen operativo.
   ====================================================================
   Un puñado de nodos y fibras en una esquina de la pantalla de trabajo:
   recuerda que el sistema está vivo sin robar ni un punto de atención.
   Es el mismo lenguaje del hero (ruido determinista, respiración lenta,
   oro/violeta semántico) a la escala de un susurro.

   Uso:
     <div class="adn-microconstelacion"><canvas></canvas></div>
     import { microconstelacion } from "/platform/brand/microconstelacion.mjs";
     microconstelacion(canvas, { esquina: "sup-der", nodos: 14 });

   Los colores se LEEN de la capa de tokens; sin literales y sin reservas. */

export function microconstelacion(cv, opts = {}) {
  const CS = getComputedStyle(document.documentElement);
  const T = n => CS.getPropertyValue(n).trim();
  const PRACTICA = T("--athenea-practica");
  const DOCTRINA = T("--athenea-doctrina");
  const MARFIL   = T("--athenea-marfil");
  if (!PRACTICA || !DOCTRINA || !MARFIL) {
    console.error("ATHENEA: falta la capa de tokens para la microconstelación.");
    return () => {};
  }
  const RESPIRA = parseFloat(T("--athenea-respiracion")) || 6;
  const QUIETO  = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const N       = opts.nodos ?? 14;
  const ESQUINA = opts.esquina ?? "sup-der";
  const SEMILLA = opts.semilla ?? 20260802;

  const g = cv.getContext("2d");
  let W, H, dpr, nodos = [], aristas = [], vivo = true, raf = 0;

  const hex = (h, a) => {
    const s = h.replace("#", "");
    const b = parseInt(s.length === 3 ? s.split("").map(c => c + c).join("") : s, 16);
    return `rgba(${b >> 16 & 255},${b >> 8 & 255},${b & 255},${a})`;
  };

  function construir() {
    const rnd = (s => () => (s = s * 16807 % 2147483647) / 2147483647)(SEMILLA);
    nodos = []; aristas = [];
    // el cúmulo ocupa ~1/3 del lienzo, pegado a su esquina
    const dx = ESQUINA.includes("der") ? 0.66 : 0;
    const dy = ESQUINA.includes("inf") ? 0.60 : 0;
    for (let i = 0; i < N; i++) nodos.push({
      x: dx + rnd() * 0.34, y: dy + rnd() * 0.40,
      br: rnd() < 0.72 ? 0 : 1,                    // el violeta también aquí es escaso
      r: rnd() > 0.8 ? 1.8 : 1.1,
      f: rnd() * 9,
    });
    for (let i = 0; i < N; i++) {
      const d = [];
      for (let j = 0; j < N; j++) if (i !== j)
        d.push([(nodos[i].x - nodos[j].x) ** 2 + (nodos[i].y - nodos[j].y) ** 2, j]);
      d.sort((a, b) => a[0] - b[0]);
      for (let k = 0; k < 2; k++) {
        if (!d[k] || rnd() < 0.3) continue;
        const j = d[k][1];
        if (!aristas.some(a => (a.i === j && a.j === i) || (a.i === i && a.j === j)))
          aristas.push({ i, j });
      }
    }
  }

  function medir() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = cv.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    construir();
  }

  const t0 = performance.now();
  function cuadro(ahora) {
    if (!vivo) return;
    const t = QUIETO ? 4 : (ahora - t0) / 1000;
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    for (const a of aristas) {
      const A = nodos[a.i], B = nodos[a.j];
      g.strokeStyle = hex(A.br ? DOCTRINA : PRACTICA, 0.10);
      g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(A.x * W, A.y * H); g.lineTo(B.x * W, B.y * H); g.stroke();
    }
    for (const nd of nodos) {
      const br = QUIETO ? 0.7 : 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / RESPIRA + nd.f);
      g.fillStyle = hex(nd.br ? DOCTRINA : PRACTICA, 0.18 + 0.30 * br);
      g.beginPath(); g.arc(nd.x * W, nd.y * H, nd.r, 0, 7); g.fill();
    }
    g.globalCompositeOperation = "source-over";
    if (!QUIETO) raf = requestAnimationFrame(cuadro);
  }

  const onVis = () => {
    if (document.hidden) { vivo = false; cancelAnimationFrame(raf); }
    else if (!vivo) { vivo = true; raf = requestAnimationFrame(cuadro); }
  };
  document.addEventListener("visibilitychange", onVis);
  addEventListener("resize", medir);
  medir();
  raf = requestAnimationFrame(cuadro);

  // se devuelve el desmontaje: una pantalla operativa navega y limpia
  return () => {
    vivo = false; cancelAnimationFrame(raf);
    document.removeEventListener("visibilitychange", onVis);
    removeEventListener("resize", medir);
  };
}
