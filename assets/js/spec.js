/* Beckmann vs GGX page. */

import {
  createShaderball, createPlot, bindControls, MODEL,
  dBeckmann, dGGX, axes, gridLines, label, currentLang,
} from './viz.js';

const T = {
  tilt: { en: 'Facet tilt from surface normal', pl: 'Odchylenie fasetki od normalnej' },
  amount: { en: 'Relative number of facets', pl: 'Względna liczba fasetek' },
  peak: { en: 'peak', pl: 'szczyt' },
  beck: { en: 'Beckmann — reaches zero', pl: 'Beckmann — dochodzi do zera' },
  ggx: { en: 'GGX — never quite does', pl: 'GGX — nigdy do końca' },
};

const t = (k) => T[k][currentLang()] || T[k].en;

/* ---------------------------------------------------------------- NDF plot */

const ndfCanvas = document.getElementById('ndf-plot');
let ndfState = { ndfRough: 0.3, ndfScale: 'lin' };

const ndfPlot = createPlot(ndfCanvas, (ctx, w, h, th) => {
  const box = { x: 46, y: 14, w: w - 62, h: h - 44 };
  const log = ndfState.ndfScale === 'log';
  const alpha = Math.max(ndfState.ndfRough * ndfState.ndfRough, 1e-4);

  /* Fit the horizontal range to the lobe. At low roughness nearly all the
     action happens in the first few degrees, and a fixed 0-90° axis would
     squash both curves into the left edge where they can't be told apart. */
  const maxAngle = (() => {
    const peak = dGGX(1, alpha);
    for (let d = 4; d <= 90; d += 2) {
      const a = d * (Math.PI / 180);
      if (dGGX(Math.cos(a), alpha) / peak < 1e-4) return a;
    }
    return Math.PI / 2;
  })();
  const maxDeg = Math.round(maxAngle * (180 / Math.PI));

  gridLines(ctx, box, th, 6, log ? 5 : 4);
  axes(ctx, box, th);

  // Normalise each curve to its own peak so we compare shape, not brightness.
  const peakB = dBeckmann(1, alpha);
  const peakG = dGGX(1, alpha);
  const floor = 1e-5;

  const yOf = (v) => {
    if (!log) return box.y + box.h * (1 - Math.min(v, 1));
    const lv = Math.log10(Math.max(v, floor));
    // 5 decades from the peak down.
    return box.y + box.h * Math.min(1, Math.max(0, -lv / 5));
  };

  const curve = (fn, peak, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const steps = 260;
    for (let i = 0; i <= steps; i++) {
      const ang = (i / steps) * maxAngle;
      const v = fn(Math.cos(ang), alpha) / peak;
      const x = box.x + (box.w * i) / steps;
      const y = yOf(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  curve(dBeckmann, peakB, th.a);
  curve(dGGX, peakG, th.b);

  // Axis ticks, six across whatever range we ended up with
  for (let i = 0; i <= 6; i++) {
    const d = (maxDeg * i) / 6;
    const x = box.x + (box.w * i) / 6;
    label(ctx, `${d < 10 ? d.toFixed(1) : Math.round(d)}°`, x, box.y + box.h + 15, th,
      { align: 'center' });
  }
  label(ctx, t('tilt'), box.x + box.w / 2, h - 4, th, { align: 'center' });

  if (log) {
    for (let d = 0; d <= 5; d++) {
      const y = box.y + (box.h * d) / 5;
      label(ctx, d === 0 ? '1' : `1e-${d}`, box.x - 6, y + 3, th, { align: 'right' });
    }
  } else {
    label(ctx, '1', box.x - 6, box.y + 4, th, { align: 'right' });
    label(ctx, '0', box.x - 6, box.y + box.h + 3, th, { align: 'right' });
  }

  ctx.save();
  ctx.translate(12, box.y + box.h / 2);
  ctx.rotate(-Math.PI / 2);
  label(ctx, t('amount'), 0, 0, th, { align: 'center' });
  ctx.restore();
});

bindControls(document.getElementById('ndf-ctl'), (s) => {
  ndfState = s;
  ndfPlot.redraw();
});

/* ------------------------------------------------------------- split ball */

const splitBall = createShaderball(document.getElementById('ball-split'), {
  split: true,
  model: [MODEL.BECKMANN, MODEL.GGX],
  roughness: [0.28, 0.28],
  lightAngle: 7,
  exposure: 0,
  tonemap: 1,
  diffuse: 0.06,
});

bindControls(document.getElementById('ball-ctl'), (s) => {
  splitBall.set({
    roughness: [s.ballRough, s.ballRough],
    lightAngle: s.ballLight,
    exposure: s.ballExp,
    tonemap: s.ballTone === 'film' ? 1 : 0,
  });
});

/* ------------------------------------------------------------- match ball */

const matchBall = createShaderball(document.getElementById('ball-match'), {
  split: true,
  model: [MODEL.BECKMANN, MODEL.GGX],
  roughness: [0.3, 0.3],
  lightAngle: 5,
  exposure: 1.5,
  tonemap: 1,
  diffuse: 0.06,
});

const readout = document.getElementById('match-readout');

/* Half-width at half maximum of each lobe, in degrees. A quick, honest way to
   say "these cores are the same size" without pretending there is a single
   conversion factor. */
function hwhm(fn, alpha) {
  const peak = fn(1, alpha);
  let lo = 0;
  let hi = Math.PI / 2;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fn(Math.cos(mid), alpha) > peak / 2) lo = mid; else hi = mid;
  }
  return ((lo + hi) / 2) * (180 / Math.PI);
}

function updateMatch(s) {
  matchBall.set({
    roughness: [s.matchB, s.matchG],
    exposure: s.matchExp,
  });

  const wB = hwhm(dBeckmann, s.matchB * s.matchB);
  const wG = hwhm(dGGX, s.matchG * s.matchG);
  const close = Math.abs(wB - wG) < 0.15;

  const strings = currentLang() === 'pl'
    ? { b: 'Rdzeń Beckmanna', g: 'Rdzeń GGX', ok: 'rdzenie zgodne — teraz spójrz na krawędź', off: 'rdzenie różne' }
    : { b: 'Beckmann core', g: 'GGX core', ok: 'cores matched — now look at the edge', off: 'cores differ' };

  readout.innerHTML =
    `<span>${strings.b}: <b>${wB.toFixed(1)}°</b></span>` +
    `<span>${strings.g}: <b>${wG.toFixed(1)}°</b></span>` +
    `<span>${close ? '✓ ' + strings.ok : strings.off}</span>`;
}

const matchCtl = bindControls(document.getElementById('match-ctl'), updateMatch);
updateMatch(matchCtl.state);
document.addEventListener('langchange', () => updateMatch(matchCtl.state));
