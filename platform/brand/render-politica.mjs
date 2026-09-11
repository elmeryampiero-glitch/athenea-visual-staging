/* RENDER POLICY DE ATHENEA VISUAL — AV-P3B-RENDER-001
   ====================================================
   CAPA DE CONTROL DEL DIRECTOR para el render del Núcleo Vivo.
   LA ÚNICA FUENTE DE VERDAD: ningún motor (hero, cosmos de fondo,
   capa D del home) declara sus propios umbrales ni densidades — todos
   consumen esta política. El Director gobierna desde aquí sin tocar
   las 17 superficies ni el código estructural de los motores.

   REGLA RECTORA: ATHENEA sacrifica complejidad visual antes que
   continuidad perceptiva. NUNCA sacrifica: significado, información,
   accesibilidad, controles, navegación, emblema, identidad, nodos
   activos/seleccionados ni jerarquía cognitiva.

   La decisión de calidad nace de la MEDICIÓN del runtime (deltas de
   frame reales), jamás de listas de modelos de teléfono. Señales
   auxiliares (dpr, viewport) solo matizan; nunca deciden. */

/* ── TOKENS DE LA POLÍTICA (equivalentes semánticos de render.*) ────────
   modo                    render.mode
   fpsObjetivo             render.targetFps
   fpsMinimo               render.minimumFps
   presupuestoMs           render.frameBudgetMs
   techoCalidad            render.qualityCeiling
   pisoCalidad             render.qualityFloor
   densidadNodos           render.nodeDensity
   densidadAristas         render.edgeDensity
   densidadParticulas      render.particleDensity
   densidadEstrellas       render.starDensity
   calidadGlow             render.glowQuality
   calidadBlur             render.blurQuality
   topeDpr                 render.dprCap
   intensidadMovimiento    render.motionIntensity
   politicaReposo          render.idlePolicy
   retrasoRecuperacionMs   render.recoveryDelay
   umbralDegradar          render.degradeThreshold  (factor sobre el presupuesto del tier)
   umbralRecuperar         render.recoverThreshold  (factor sobre el presupuesto del tier superior)
   superposicionDiagnostico render.debugOverlay                                        */

export const PRESETS = {
  /* CINEMATOGRÁFICO — máxima riqueza compatible con el presupuesto */
  cinematografico: { techoCalidad: "ultra", pisoCalidad: "balanced",
    densidadNodos: 1, densidadAristas: 1, densidadParticulas: 1,
    densidadEstrellas: 1, calidadGlow: 1, calidadBlur: 1,
    topeDpr: 2, intensidadMovimiento: 1 },
  /* PREMIUM — equilibrio por defecto: 60 FPS objetivo antes que efectos */
  premium: { techoCalidad: "ultra", pisoCalidad: "safe",
    densidadNodos: 1, densidadAristas: 1, densidadParticulas: 1,
    densidadEstrellas: 1, calidadGlow: 1, calidadBlur: 1,
    topeDpr: 2, intensidadMovimiento: 1 },
  /* EFICIENTE — menor densidad y menor consumo visual */
  eficiente: { techoCalidad: "balanced", pisoCalidad: "safe",
    densidadNodos: 0.8, densidadAristas: 0.8, densidadParticulas: 0.6,
    densidadEstrellas: 0.7, calidadGlow: 0.6, calidadBlur: 0.6,
    topeDpr: 1.5, intensidadMovimiento: 0.8 },
  /* PRESENTACIÓN — calidad alta sostenida para demostración */
  presentacion: { techoCalidad: "ultra", pisoCalidad: "premium",
    densidadNodos: 1, densidadAristas: 1, densidadParticulas: 1,
    densidadEstrellas: 1, calidadGlow: 1, calidadBlur: 1,
    topeDpr: 2, intensidadMovimiento: 0.9 },
  /* REDUCED — sin loop decorativo: representación estática accesible.
     No es un tier: es una política superior que impone el usuario
     (prefers-reduced-motion) o el Director. El ÚNICO fotograma se pinta
     a calidad COMPLETA — cuesta cero de forma continua y la identidad
     aprobada queda intacta. */
  reduced: { techoCalidad: "ultra", pisoCalidad: "ultra",
    densidadNodos: 1, densidadAristas: 1, densidadParticulas: 1,
    densidadEstrellas: 1, calidadGlow: 1, calidadBlur: 1,
    topeDpr: 2, intensidadMovimiento: 0 },
};

export const POLITICA = {
  modo: "premium",                    // ← el preset vivo (decisión del Director)
  fpsObjetivo: 60,
  fpsMinimo: 30,
  presupuestoMs: 16.67,               // nominal a 60 Hz
  politicaReposo: "pausa",            // pestaña oculta → el loop DUERME de verdad
  retrasoRecuperacionMs: 8000,        // recuperar es más lento que degradar (histéresis)
  ventanaMuestrasN: 90,               // ~1,5–4,5 s de frames por evaluación
  evaluarCadaN: 30,                   // evaluación cada 30 frames
  calentamientoN: 45,                 // frames que se descartan tras arrancar/volver/redimensionar
  calentamientoMs: 3000,              // …y nunca menos de este tiempo: el jank de carga no decide tiers
  umbralDegradar: 1.15,               // p95 > presupuesto_del_tier × 1.15 → degradar
  umbralRecuperar: 0.85,              // p95 < presupuesto_del_tier_superior × 0.85 → candidato a subir
  rachasParaDegradar: 2,              // evaluaciones seguidas malas antes de bajar
  superposicionDiagnostico: false,    // overlay solo con ?render=debug (nunca en producción)
  ...PRESETS.premium,
};

/* ── TIERS OPERATIVOS — presupuestos y mandos por nivel ─────────────────
   El ORDEN DE DEGRADACIÓN aprobado gobierna qué cede cada tier:
   1 fuera de viewport · 2 partículas/polvo · 3 twinkle secundario ·
   4 glow/blur secundarios · 5 aristas decorativas · 6 nodos secundarios ·
   7 DPR interno · 8 postprocesado/halos · 9 (solo SAFE) movimiento 2º.
   NUNCA se degrada: emblema, controles, textos, foco, nodos activos,
   ruta seleccionada, significado jurídico, navegación, datos. */
export const TIERS = {
  ultra:    { presupuestoP95: 16.67,
    particulas: 1,    twinkle: 1,    glow: 1,    aristas: 1,    nodos: 1,
    dpr: 2,    halos: 1,   movimiento: 1 },
  premium:  { presupuestoP95: 18,
    particulas: 0.85, twinkle: 0.7,  glow: 1,    aristas: 1,    nodos: 1,
    dpr: 2,    halos: 1,   movimiento: 1 },
  balanced: { presupuestoP95: 22,
    particulas: 0.55, twinkle: 0.45, glow: 0.6,  aristas: 0.72, nodos: 1,
    dpr: 1.75, halos: 0.6, movimiento: 1 },
  safe:     { presupuestoP95: 33,
    particulas: 0.30, twinkle: 0.2,  glow: 0.3,  aristas: 0.5,  nodos: 0.7,
    dpr: 1.25, halos: 0,   movimiento: 0.6 },
};
export const ESCALERA = ["ultra", "premium", "balanced", "safe"];

/* ── INTELIGENCIA DE RENDER — un singleton POR DOCUMENTO ────────────────
   Mide la cadencia real de frames con su propio RAF (independiente de los
   motores: si el main thread sufre, este bucle lo sufre igual y lo ve),
   mantiene una ventana de muestras, evalúa p95 y decide el tier con
   histéresis. Los motores solo LEEN: nivel() y ajustes().               */
let _inst = null;
export function inteligenciaRender(pol = POLITICA) {
  if (_inst) return _inst;
  const params = new URLSearchParams(location.search);
  const DEBUG = pol.superposicionDiagnostico || params.get("render") === "debug";
  /* carga de LABORATORIO (§21): SOLO con ?carga=N en la URL — jamás en
     producción por defecto. Quema N ms de main thread por frame para
     demostrar degradación y recuperación sin dañar el producto. */
  const CARGA_MS = Math.min(80, Number(params.get("carga")) || 0);

  /* ?render-modo=<preset> — fixture de LABORATORIO (§21) para probar un
     preset sin tocar la política del Director; jamás decide en producción */
  const MODO_LAB = params.get("render-modo");
  const modo = MODO_LAB && PRESETS[MODO_LAB] ? MODO_LAB : pol.modo;
  const base = modo === "premium" && !MODO_LAB ? pol
             : { ...pol, modo, ...(PRESETS[modo] || {}) };
  const REDUCIDO = matchMedia("(prefers-reduced-motion: reduce)").matches
                || modo === "reduced";
  /* ?render-tier=<tier> — fixture de LABORATORIO (§21): clava un tier para
     inspección visual/pruebas; jamás decide en producción */
  const TIER_LAB = params.get("render-tier");
  if (TIER_LAB && ESCALERA.includes(TIER_LAB)) {
    base.techoCalidad = TIER_LAB; base.pisoCalidad = TIER_LAB;
  }
  /* bajo REDUCED el único fotograma se pinta a calidad completa */
  let nivel = REDUCIDO ? "ultra" : base.techoCalidad;     // se arranca alto; la medición corrige
  const muestras = [];
  let calentando = base.calentamientoN, desdeEval = 0, rachaMala = 0;
  let calienteHasta = performance.now() + (base.calentamientoMs || 0);
  let bienDesde = 0;                                       // ms acumulados de margen para recuperar
  let ultimaEval = 0, prev = 0, rafId = 0, vivo = !document.hidden;
  const transiciones = [];
  const abonados = new Set();
  const diag = { transiciones, p95: 0, fps: 0, nivel: () => nivel };
  if (typeof window !== "undefined") window.__RENDER_DIAG = diag;

  /* el objeto de ajustes se construye SOLO al transitar — cero
     allocations por frame en los motores que lo leen cada cuadro */
  let _aj = null;
  function ajustes() {
    if (_aj && _aj.nivel === nivel) return _aj;
    const t = TIERS[nivel];
    return _aj = {
      nivel,
      reducido: REDUCIDO,
      particulas: t.particulas * base.densidadParticulas,
      twinkle:    t.twinkle,
      glow:       t.glow * base.calidadGlow,
      blur:       t.glow * base.calidadBlur,
      aristas:    t.aristas * base.densidadAristas,
      nodos:      t.nodos * base.densidadNodos,
      estrellas:  base.densidadEstrellas,
      dpr:        Math.min(t.dpr, base.topeDpr),
      halos:      t.halos,
      movimiento: t.movimiento * base.intensidadMovimiento,
    };
  }

  function transitar(nuevo, causa, metrica) {
    if (nuevo === nivel) return;
    transiciones.push({ de: nivel, a: nuevo, causa, metrica: +metrica.toFixed(1),
                        t: +(performance.now() / 1000).toFixed(1) });
    if (transiciones.length > 60) transiciones.shift();
    nivel = nuevo;
    calentando = base.calentamientoN;                     // boundary seguro: ventana limpia
    calienteHasta = performance.now() + (base.calentamientoMs || 0);
    rachaMala = 0; bienDesde = 0;
    /* P3C (C5): la gramática sensorial lee el tier en pagereveal — antes de
       que esta inteligencia cargue en el documento nuevo; se persiste el
       último tier conocido del dispositivo (solo un nombre de nivel) */
    try { sessionStorage.setItem("athenea-render-tier", nivel); } catch {}
    for (const f of abonados) { try { f(ajustes()); } catch {} }
  }

  function evaluar(ahora) {
    const orden = muestras.slice().sort((a, b) => a - b);
    const p95 = orden[Math.floor(orden.length * 0.95)] || 0;
    const medio = orden.reduce((s, v) => s + v, 0) / (orden.length || 1);
    diag.p95 = +p95.toFixed(1); diag.fps = +(1000 / medio).toFixed(1);
    const ix = ESCALERA.indexOf(nivel);
    const piso = ESCALERA.indexOf(base.pisoCalidad);
    const techo = ESCALERA.indexOf(base.techoCalidad);

    /* degradar: rápido ante presión real, pero no por un solo tropiezo */
    if (p95 > TIERS[nivel].presupuestoP95 * base.umbralDegradar && ix < piso) {
      if (++rachaMala >= base.rachasParaDegradar)
        transitar(ESCALERA[ix + 1], "presupuesto excedido", p95);
      bienDesde = 0;
      return;
    }
    rachaMala = 0;

    /* recuperar: lento y conservador — histéresis contra el parpadeo */
    if (ix > techo) {
      const sup = ESCALERA[ix - 1];
      if (p95 < TIERS[sup].presupuestoP95 * base.umbralRecuperar) {
        if (!bienDesde) bienDesde = ahora;
        if (ahora - bienDesde >= base.retrasoRecuperacionMs)
          transitar(sup, "margen sostenido", p95);
      } else bienDesde = 0;
    }
  }

  function paso(t) {
    if (!vivo) return;
    if (CARGA_MS) { const fin = performance.now() + CARGA_MS; while (performance.now() < fin); }
    if (prev) {
      const dt = Math.min(200, t - prev);               // sin deltas gigantes
      if (calentando > 0 || t < calienteHasta) { if (calentando > 0) calentando--; }
      else {
        muestras.push(dt);
        if (muestras.length > base.ventanaMuestrasN) muestras.shift();
        /* se evalúa con al menos media ventana: el calentamiento temporal ya
           protege del jank de arranque; degradar sigue siendo razonablemente
           rápido bajo presión real */
        if (++desdeEval >= base.evaluarCadaN && muestras.length >= base.ventanaMuestrasN / 2) {
          desdeEval = 0; evaluar(t);
        }
      }
    }
    prev = t;
    rafId = requestAnimationFrame(paso);
  }

  /* reposo real: pestaña oculta → el medidor duerme con los motores */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { vivo = false; cancelAnimationFrame(rafId); }
    else if (!vivo && !REDUCIDO) {
      vivo = true; prev = 0; calentando = base.calentamientoN;   // warm-up al volver
      calienteHasta = performance.now() + (base.calentamientoMs || 0);
      muestras.length = 0; bienDesde = 0;
      rafId = requestAnimationFrame(paso);
    }
  });
  /* redimensionar/orientación: presupuesto nuevo, ventana nueva */
  addEventListener("resize", () => {
    calentando = base.calentamientoN;
    calienteHasta = performance.now() + (base.calentamientoMs || 0);
    muestras.length = 0; bienDesde = 0;
  });

  if (!REDUCIDO) rafId = requestAnimationFrame(paso);
  /* bajo reduced-motion NO hay bucle de medición: cero trabajo invisible */
  try { sessionStorage.setItem("athenea-render-tier", nivel); } catch {}

  let overlay = null;
  if (DEBUG && !REDUCIDO) {
    overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:9999;" +
      "font:11px/1.5 monospace;color:#f0c96a;background:rgba(2,4,10,.8);" +
      "padding:6px 9px;border:1px solid rgba(240,201,106,.35);border-radius:6px;pointer-events:none";
    document.body.appendChild(overlay);
    setInterval(() => {
      if (document.hidden) return;
      overlay.textContent = `render ${nivel} · ${diag.fps} fps · p95 ${diag.p95} ms` +
        (CARGA_MS ? ` · carga lab ${CARGA_MS} ms` : "");
    }, 500);
  }

  _inst = {
    nivel: () => nivel,
    ajustes,
    alCambio: (f) => { abonados.add(f); return () => abonados.delete(f); },
    diag,
    politica: base,
  };
  return _inst;
}
