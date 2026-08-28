/* Why fuzz has a cone angle. */

import {
  createShaderball, createPlot, bindControls, onDrag, MODEL,
  dGGX, dFuzzCone, label, arrow, currentLang,
} from './viz.js';

const RAD = Math.PI / 180;

/* ============================================================ lobe plots */

let lobe = { lobeLight: -40, lobeRough: 0.25, lobeCone: 10 };

/**
 * Cross-section polar plot. `f(thetaOut)` returns outgoing radiance for a
 * direction measured from the normal, in radians (-pi/2 .. pi/2).
 */
function drawLobe(ctx, w, h, th, f, color, titleKey) {
  const cx = w / 2;
  const cy = h * 0.78;
  const r = Math.min(w * 0.42, h * 0.6);
  const lightA = lobe.lobeLight * RAD;

  // Surface line
  ctx.strokeStyle = th.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.15, cy);
  ctx.lineTo(cx + r * 1.15, cy);
  ctx.stroke();

  // Normal
  ctx.strokeStyle = th.grid;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r * 1.1);
  ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, 'N', cx + 5, cy - r * 1.05, th, { size: 10 });

  // Sample the lobe and find its peak for normalisation
  const steps = 180;
  const vals = [];
  let peak = 1e-9;
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / steps;
    const v = Math.max(0, f(a));
    vals.push(v);
    if (v > peak) peak = v;
  }

  // Filled lobe
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / steps;
    const m = (vals[i] / peak) * r;
    ctx.lineTo(cx + Math.sin(a) * m, cy - Math.cos(a) * m);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / steps;
    const m = (vals[i] / peak) * r;
    const x = cx + Math.sin(a) * m;
    const y = cy - Math.cos(a) * m;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Incoming light
  ctx.strokeStyle = th.accent;
  ctx.fillStyle = th.accent;
  ctx.lineWidth = 1.8;
  const lx = cx + Math.sin(lightA) * r * 1.05;
  const ly = cy - Math.cos(lightA) * r * 1.05;
  arrow(ctx, lx, ly, cx, cy, 7);
  ctx.beginPath();
  ctx.arc(lx, ly, 5, 0, Math.PI * 2);
  ctx.fill();

  // Mirror direction
  const mx = cx - Math.sin(lightA) * r * 1.02;
  const my = cy - Math.cos(lightA) * r * 1.02;
  ctx.strokeStyle = th.muted;
  ctx.setLineDash([2, 3]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(mx, my);
  ctx.stroke();
  ctx.setLineDash([]);

  const lang = currentLang();
  label(ctx, lang === 'pl' ? 'lustro' : 'mirror', mx, my - 6, th,
    { align: 'center', size: 10 });
  label(ctx, titleKey[lang] || titleKey.en, cx, 14, th,
    { align: 'center', size: 11, color: th.text });
}

const specPlot = createPlot(document.getElementById('lobe-spec'), (ctx, w, h, th) => {
  const lightA = lobe.lobeLight * RAD;
  const alpha = Math.max(lobe.lobeRough * lobe.lobeRough, 1e-4);
  const L = [Math.sin(lightA), Math.cos(lightA)];

  drawLobe(ctx, w, h, th, (a) => {
    const V = [Math.sin(a), Math.cos(a)];
    if (V[1] <= 0) return 0;
    let hx = L[0] + V[0];
    let hy = L[1] + V[1];
    const hl = Math.hypot(hx, hy);
    if (hl < 1e-6) return 0;
    hx /= hl; hy /= hl;
    return dGGX(Math.max(hy, 0), alpha) * V[1];
  }, th.b, { en: 'Microfacet (GGX)', pl: 'Mikrofasetkowy (GGX)' });
});

const fuzzPlot = createPlot(document.getElementById('lobe-fuzz'), (ctx, w, h, th) => {
  const lightA = lobe.lobeLight * RAD;
  const cone = lobe.lobeCone * RAD;
  const L = [Math.sin(lightA), Math.cos(lightA)];

  drawLobe(ctx, w, h, th, (a) => {
    const V = [Math.sin(a), Math.cos(a)];
    if (V[1] <= 0) return 0;
    let hx = L[0] + V[0];
    let hy = L[1] + V[1];
    const hl = Math.hypot(hx, hy);
    if (hl < 1e-6) return 0;
    hx /= hl; hy /= hl;
    // Velvet visibility, matching the shader's lobe.
    const vis = 1 / (4 * (L[1] + V[1] - L[1] * V[1]) + 1e-4);
    return dFuzzCone(Math.max(hy, 0), cone) * vis * V[1];
  }, th.a, { en: 'Fuzz (cone of fibres)', pl: 'Fuzz (stożek włókien)' });
});

function redrawLobes() {
  specPlot.redraw();
  fuzzPlot.redraw();
}

// Dragging either panel steers the light.
[document.getElementById('lobe-spec'), document.getElementById('lobe-fuzz')].forEach((c) => {
  onDrag(c, ({ x, y, w, h }) => {
    const cx = w / 2;
    const cy = h * 0.78;
    const a = Math.atan2(x - cx, Math.max(cy - y, 1)) / RAD;
    const clamped = Math.max(-85, Math.min(85, a));
    lobeCtl.set('lobeLight', clamped.toFixed(0));
    lobe.lobeLight = clamped;
    redrawLobes();
  });
});

const lobeCtl = bindControls(document.getElementById('lobe-ctl'), (s) => {
  lobe = s;
  redrawLobes();
});

/* ====================================================== fibre + fuzz ball */

let cone = { coneAngle: 8, coneGain: 1, coneExp: 1 };

const fibrePlot = createPlot(document.getElementById('fibre-diagram'), (ctx, w, h, th) => {
  const baseY = h * 0.82;
  const half = cone.coneAngle * RAD;
  const len = h * 0.5;
  const n = 26;

  ctx.strokeStyle = th.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, baseY);
  ctx.lineTo(w * 0.94, baseY);
  ctx.stroke();

  // The cone the fibres are allowed to lean within, drawn once in the middle.
  const cx = w / 2;
  ctx.fillStyle = th.a;
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.arc(cx, baseY, len * 1.05, -Math.PI / 2 - half, -Math.PI / 2 + half);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Fibres, deterministically spread across the cone.
  ctx.strokeStyle = th.a;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const x = w * 0.08 + u * w * 0.84;
    // A fixed pseudo-random lean, stable across redraws.
    const j = Math.sin(i * 12.9898) * 43758.5453;
    const r = (j - Math.floor(j)) * 2 - 1;
    const a = r * half;
    const l = len * (0.82 + 0.18 * ((Math.sin(i * 7.13) + 1) / 2));
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + Math.sin(a) * l, baseY - Math.cos(a) * l);
    ctx.stroke();
  }

  // Cone angle annotation
  ctx.strokeStyle = th.text;
  ctx.setLineDash([3, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.lineTo(cx, baseY - len * 1.12);
  ctx.stroke();
  ctx.setLineDash([]);

  const lang = currentLang();
  label(ctx, `±${cone.coneAngle.toFixed(1)}°`, cx + 8, baseY - len * 1.05, th,
    { size: 12, color: th.text });
  label(ctx,
    lang === 'pl' ? 'Włókna sterczą z powierzchni' : 'Fibres stand out of the surface',
    w / 2, h - 6, th, { align: 'center', size: 11 });
});

const fuzzBall = createShaderball(document.getElementById('fuzz-ball'), {
  model: [MODEL.FUZZ, MODEL.FUZZ],
  extra: [8 * RAD, 8 * RAD],
  lightAngle: 12,
  exposure: 1,
  lightPower: 60,
  diffuse: 0,
  specColor: [0.95, 0.94, 0.92],
});

bindControls(document.getElementById('cone-ctl'), (s) => {
  cone = s;
  fibrePlot.redraw();
  fuzzBall.set({
    extra: [s.coneAngle * RAD, s.coneAngle * RAD],
    gain: [s.coneGain, s.coneGain],
    exposure: s.coneExp,
  });
});

/* ========================================================= 32x comparison */

const cmpBall = createShaderball(document.getElementById('compare-ball'), {
  split: true,
  model: [MODEL.SHEEN, MODEL.FUZZ],
  extra: [0.3, 9.6 * RAD],
  lightAngle: 12,
  exposure: 1,
  lightPower: 60,
  diffuse: 0,
  specColor: [0.95, 0.94, 0.92],
});

const cmpReadout = document.getElementById('cmp-readout');

function updateCompare(s, changed) {
  // In linked mode the cone follows Pixar's 32x fit off the sheen roughness.
  if (s.cmpLink === 'linked' && changed !== 'cmpCone') {
    const derived = Math.min(45, Math.max(0.5, s.cmpSheen * 32));
    cmpCtl.set('cmpCone', derived.toFixed(1));
    s.cmpCone = derived;
  }

  cmpBall.set({
    extra: [s.cmpSheen, s.cmpCone * RAD],
    exposure: s.cmpExp,
  });

  const lang = currentLang();
  const exact = s.cmpSheen * 32;
  const str = lang === 'pl'
    ? { r: 'Sheen Roughness', c: 'Cone Angle', rule: '32× dałoby', off: 'odejście od reguły' }
    : { r: 'Sheen Roughness', c: 'Cone Angle', rule: '32× would give', off: 'off the rule by' };

  const delta = Math.abs(s.cmpCone - exact);
  cmpReadout.innerHTML =
    `<span>${str.r}: <b>${s.cmpSheen.toFixed(2)}</b></span>` +
    `<span>${str.c}: <b>${s.cmpCone.toFixed(1)}°</b></span>` +
    `<span>${str.rule} <b>${exact.toFixed(1)}°</b>` +
    (delta > 0.15 ? ` — ${str.off} <b>${delta.toFixed(1)}°</b>` : '') +
    '</span>';
}

const cmpCtl = bindControls(document.getElementById('cmp-ctl'), updateCompare);
updateCompare(cmpCtl.state);
document.addEventListener('langchange', () => updateCompare(cmpCtl.state));
