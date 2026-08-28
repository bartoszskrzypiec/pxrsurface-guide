/* Widgets for the subsurface scattering deep dive. */

import {
  createPlot, bindControls, makeRng, rgbCss,
  axes, gridLines, label,
} from './viz.js';

/* ================================================= random-walk scattering */

const walkCanvas = document.getElementById('walk-canvas');
let walkStats = { escaped: 0, total: 0, avgSteps: 0, avgSpread: 0 };
let walk = { wkMfp: 0.18, wkPaths: 26, wkPreset: 'skin' };

const PRESETS = { milk: 0.05, skin: 0.18, wax: 0.55 };

/**
 * Trace one photon through a slab. Steps of length `mfp` in a random
 * direction until it leaves the top (escaped) or gives up.
 */
function tracePath(rng, mfp, maxSteps = 90) {
  const pts = [[0, 0]];
  let x = 0;
  let y = 0;
  // Entering the surface, so the first step heads downwards.
  let a = Math.PI / 2 + (rng() - 0.5) * 0.6;
  for (let i = 0; i < maxSteps; i++) {
    x += Math.cos(a) * mfp;
    y += Math.sin(a) * mfp;
    if (y < 0) {                       // back out through the surface
      pts.push([x, 0]);
      return { pts, escaped: true, exitX: x, steps: i + 1 };
    }
    pts.push([x, y]);
    a = rng() * Math.PI * 2;           // isotropic scatter
  }
  return { pts, escaped: false, exitX: x, steps: maxSteps };
}

const walkPlot = createPlot(walkCanvas, (ctx, w, h, th) => {
  const surfaceY = h * 0.18;
  const scale = h * 0.55;

  // The material below the surface.
  ctx.fillStyle = th.grid;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(0, surfaceY, w, h - surfaceY);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = th.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, surfaceY);
  ctx.lineTo(w, surfaceY);
  ctx.stroke();

  const cx = w / 2;
  const rng = makeRng(20250827);
  let escaped = 0;
  let totalSteps = 0;
  let spread = 0;

  for (let p = 0; p < walk.wkPaths; p++) {
    const path = tracePath(rng, walk.wkMfp);
    totalSteps += path.steps;
    if (path.escaped) {
      escaped++;
      spread += Math.abs(path.exitX);
    }
    ctx.strokeStyle = path.escaped ? th.accent : th.muted;
    ctx.globalAlpha = path.escaped ? 0.75 : 0.28;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    path.pts.forEach(([px, py], i) => {
      const X = cx + px * scale;
      const Y = surfaceY + py * scale;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.stroke();

    if (path.escaped) {
      ctx.fillStyle = th.accent;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(cx + path.exitX * scale, surfaceY, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Where the light went in.
  ctx.fillStyle = th.text;
  ctx.beginPath();
  ctx.arc(cx, surfaceY, 4, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, 'light in', cx + 8, surfaceY - 8, th, { size: 11, color: th.text });

  walkStats = {
    escaped,
    total: walk.wkPaths,
    avgSteps: totalSteps / walk.wkPaths,
    avgSpread: escaped ? spread / escaped : 0,
  };
});

const walkReadout = document.getElementById('walk-readout');

function updateWalk(s, changed) {
  if (changed === 'wkPreset') {
    walkCtl.set('wkMfp', PRESETS[s.wkPreset]);
    s.wkMfp = PRESETS[s.wkPreset];
  }
  walk = s;
  walkPlot.redraw();
  walkReadout.innerHTML =
    `<span>Escaped back out: <b>${walkStats.escaped} of ${walkStats.total}</b></span>` +
    `<span>Average collisions: <b>${walkStats.avgSteps.toFixed(0)}</b></span>` +
    `<span>Average sideways travel: <b>${walkStats.avgSpread.toFixed(2)}</b></span>`;
}

const walkCtl = bindControls(document.getElementById('walk-ctl'), updateWalk);
updateWalk(walkCtl.state);

/* ============================================== Radius / DMFP conversion */

let conv = { cvScale: 1, cvR: 0.85, cvG: 0.56, cvB: 0.4, cvSwap: 'right' };
const convReadout = document.getElementById('convert-readout');

const convPlot = createPlot(document.getElementById('convert-canvas'), (ctx, w, h, th) => {
  const swapped = conv.cvSwap === 'swapped';
  const radius = [conv.cvR, conv.cvG, conv.cvB];

  // Correct: colour -> Mean Free Path Color, scale -> Distance.
  // Swapped: the scale gets read as a (grey) colour and the colour's
  // brightness as the distance, which is the shape of the real mistake.
  const colour = swapped ? [conv.cvScale, conv.cvScale, conv.cvScale].map((c) => Math.min(c, 1)) : radius;
  const dist = swapped ? (radius[0] + radius[1] + radius[2]) / 3 : conv.cvScale;

  const rows = [
    { name: 'Arnold — what you meant',
      a: `Scale ${conv.cvScale.toFixed(2)}`,
      b: `Radius ${radius.map((v) => v.toFixed(2)).join(', ')}`,
      col: th.arnold, colour: radius, dist: conv.cvScale },
    { name: 'PxrSurface — what you get',
      a: `MFP Distance ${dist.toFixed(2)}`,
      b: `MFP Color ${colour.map((v) => v.toFixed(2)).join(', ')}`,
      col: th.pxr, colour, dist },
  ];

  rows.forEach((r, i) => {
    const y = 18 + i * (h * 0.42);
    label(ctx, r.name, 12, y, th, { size: 12, color: r.col });
    label(ctx, r.a, 12, y + 20, th, { size: 12 });
    label(ctx, r.b, 12, y + 38, th, { size: 12 });

    // Swatch strip showing the resulting scatter tint at that distance.
    const sx = w * 0.52;
    const sw = w * 0.42;
    for (let px = 0; px < sw; px++) {
      const d = (px / sw) * 3;
      const rgb = r.colour.map((c) => Math.exp(-d / Math.max(c * r.dist, 0.02)));
      ctx.fillStyle = rgbCss(rgb);
      ctx.fillRect(sx + px, y - 12, 1.3, h * 0.26);
    }
    ctx.strokeStyle = th.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, y - 12, sw, h * 0.26);
  });

  if (swapped) {
    ctx.fillStyle = th.arnold;
    ctx.font = '600 12px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('wired backwards', 12, h - 8);
  }
});

function updateConvert(s) {
  conv = s;
  convPlot.redraw();
  const swapped = s.cvSwap === 'swapped';
  convReadout.innerHTML = swapped
    ? '<span>⚠ Wrong colour <em>and</em> wrong depth — the two instincts fail in opposite directions</span>'
    : '<span>✓ Radius → Mean Free Path <b>Color</b></span><span>✓ Scale → Mean Free Path <b>Distance</b></span>';
}

const convCtl = bindControls(document.getElementById('convert-ctl'), updateConvert);
updateConvert(convCtl.state);

/* ================================================= per-channel distances */

let chan = { chDefault: 'pxr', chDist: 1.4 };
const CH_COLORS = ['#e05a4a', '#4ea85e', '#4a7fd0'];
const CH_DEFAULTS = { arnold: [1, 1, 1], pxr: [0.851, 0.557, 0.395] };

function chanMfp() {
  return CH_DEFAULTS[chan.chDefault].map((c) => c * chan.chDist);
}

const chanProfile = createPlot(document.getElementById('chan-profile'), (ctx, w, h, th) => {
  const box = { x: 34, y: 14, w: w - 46, h: h - 40 };
  gridLines(ctx, box, th, 4, 4);
  axes(ctx, box, th);
  const maxD = 5;
  const mfp = chanMfp();

  mfp.forEach((m, i) => {
    ctx.strokeStyle = CH_COLORS[i];
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= 160; k++) {
      const d = (k / 160) * maxD;
      const v = Math.exp(-d / Math.max(m, 0.02));
      const x = box.x + (box.w * k) / 160;
      const y = box.y + box.h * (1 - v);
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  label(ctx, 'distance from where the light went in', box.x + box.w / 2, h - 4, th,
    { align: 'center', size: 10 });
  label(ctx, '1', box.x - 5, box.y + 4, th, { align: 'right' });
  label(ctx, '0', box.x - 5, box.y + box.h + 3, th, { align: 'right' });
});

const chanSlab = createPlot(document.getElementById('chan-slab'), (ctx, w, h, th) => {
  const mfp = chanMfp();
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(w, h) * 0.46;

  // A backlit patch: brightness per channel falls off with radius.
  for (let r = Math.floor(maxR); r >= 0; r--) {
    const d = (r / maxR) * 4;
    const rgb = mfp.map((m) => Math.exp(-d / Math.max(m, 0.02)));
    ctx.fillStyle = rgbCss(rgb);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  label(ctx, chan.chDefault === 'pxr' ? 'PxrSurface default' : 'Arnold default',
    cx, h - 6, th, { align: 'center', size: 11 });
});

const chanReadout = document.getElementById('chan-readout');

function updateChan(s) {
  chan = s;
  chanProfile.redraw();
  chanSlab.redraw();
  const mfp = chanMfp();
  const ratio = mfp[0] / Math.max(mfp[2], 1e-4);
  chanReadout.innerHTML =
    `<span>Red reaches <b>${mfp[0].toFixed(2)}</b></span>` +
    `<span>Green <b>${mfp[1].toFixed(2)}</b></span>` +
    `<span>Blue <b>${mfp[2].toFixed(2)}</b></span>` +
    `<span>Red travels <b>${ratio.toFixed(2)}×</b> as far as blue</span>`;
}

const chanCtl = bindControls(document.getElementById('chan-ctl'), updateChan);
updateChan(chanCtl.state);

/* ============================================ Multiple Mean Free Paths */

/* PxrSurface's own defaults for the three ranges. */
const RANGES = [
  { key: 'mmShort', color: [0.9, 0.9, 0.9], dist: 5, name: 'short' },
  { key: 'mmMed', color: [0.83, 0.791, 0.753], dist: 10, name: 'medium' },
  { key: 'mmLong', color: [0.8, 0, 0], dist: 20, name: 'long' },
];

let mm = { mmShort: 0.5, mmMed: 0.5, mmLong: 0.5 };

/** Combined scatter colour at a given distance, summing the three ranges. */
function mmfpAt(d) {
  const out = [0, 0, 0];
  RANGES.forEach((r) => {
    const g = mm[r.key];
    if (g <= 0) return;
    const falloff = Math.exp(-d / (r.dist / 8));
    for (let i = 0; i < 3; i++) out[i] += g * r.color[i] * falloff;
  });
  return out;
}

const mmfpPlot = createPlot(document.getElementById('mmfp-plot'), (ctx, w, h, th) => {
  const box = { x: 34, y: 14, w: w - 46, h: h - 40 };
  gridLines(ctx, box, th, 4, 4);
  axes(ctx, box, th);
  const maxD = 4;

  RANGES.forEach((r) => {
    ctx.strokeStyle = rgbCss(r.color);
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let k = 0; k <= 160; k++) {
      const d = (k / 160) * maxD;
      const v = mm[r.key] * Math.exp(-d / (r.dist / 8));
      const x = box.x + (box.w * k) / 160;
      const y = box.y + box.h * (1 - Math.min(v, 1));
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const vEnd = mm[r.key] * Math.exp(-maxD / (r.dist / 8));
    label(ctx, r.name, box.x + box.w - 4,
      box.y + box.h * (1 - Math.min(vEnd, 1)) - 4, th,
      { align: 'right', size: 10, color: rgbCss(r.color) });
  });

  // The sum, which is what you actually see.
  ctx.strokeStyle = th.text;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let k = 0; k <= 160; k++) {
    const d = (k / 160) * maxD;
    const c = mmfpAt(d);
    const v = (c[0] + c[1] + c[2]) / 3;
    const x = box.x + (box.w * k) / 160;
    const y = box.y + box.h * (1 - Math.min(v, 1));
    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  label(ctx, 'sum', box.x + box.w - 4, box.y + 12, th, { align: 'right', size: 10, color: th.text });
  label(ctx, 'depth into the surface', box.x + box.w / 2, h - 4, th, { align: 'center', size: 10 });
});

const mmfpSlab = createPlot(document.getElementById('mmfp-slab'), (ctx, w, h, th) => {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(w, h) * 0.46;
  for (let r = Math.floor(maxR); r >= 0; r--) {
    const d = (r / maxR) * 3.2;
    ctx.fillStyle = rgbCss(mmfpAt(d));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  label(ctx, 'all three ranges together', cx, h - 6, th, { align: 'center', size: 11 });
});

const mmfpReadout = document.getElementById('mmfp-readout');

function updateMmfp(s) {
  mm = s;
  mmfpPlot.redraw();
  mmfpSlab.redraw();
  const surface = mmfpAt(0);
  const deep = mmfpAt(2.2);
  const warmth = deep[0] / Math.max((deep[1] + deep[2]) / 2, 1e-4);
  mmfpReadout.innerHTML =
    `<span>At the surface: <b>${surface.map((c) => c.toFixed(2)).join(', ')}</b></span>` +
    `<span>Deep: <b>${deep.map((c) => c.toFixed(2)).join(', ')}</b></span>` +
    `<span>Deep red vs the rest: <b>${warmth.toFixed(1)}×</b></span>`;
}

const mmfpCtl = bindControls(document.getElementById('mmfp-ctl'), updateMmfp);
updateMmfp(mmfpCtl.state);
