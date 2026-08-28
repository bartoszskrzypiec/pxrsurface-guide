/* Widgets for the AiStandardSurface → PxrSurface guide. */

import {
  createShaderball, createPlot, bindControls, MODEL,
  fresnelConductor, fresnelArtistic, thinFilmRGB, rgbCss,
  axes, gridLines, label,
} from './viz.js';

const DEG = Math.PI / 180;

/** Hue (degrees) to a linear RGB triple at full saturation. */
function hueRgb(h, sat = 1, val = 1) {
  const c = val * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = val - c;
  const t = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
  const [r, g, b] = t[Math.floor(h / 60) % 6];
  return [r + m, g + m, b + m];
}

/* ====================================================== metalness widget */

const metalBall = createShaderball(document.getElementById('metal-ball'), {
  split: true,
  model: [MODEL.GGX, MODEL.GGX],
  roughness: [0.22, 0.22],
  // Left half: Arnold's metalness. Right half: PxrSurface face/edge colours.
  fresnelMode: [3, 1],
  lightAngle: 9,
  exposure: 0.3,
  lightPower: 45,
  envGain: 0.75,
});

const metalReadout = document.getElementById('metal-readout');

function updateMetal(s) {
  const base = hueRgb(s.mtHue, 0.75, 0.88);
  // The two colours PxrSurface wants, derived from the one Arnold slider.
  const face = base.map((c) => 0.04 + (c - 0.04) * s.mtMetal);
  const edge = base.map((c) => 1 + (c - 1) * s.mtMetal);
  const diffusePxr = s.mtDiffuse === 'zeroed' ? (1 - s.mtMetal) * 0.35 : 0.35;

  metalBall.set({
    roughness: [s.mtRough, s.mtRough],
    metalness: s.mtMetal,
    baseColor: base,
    faceColor: face,
    edgeColor: edge,
    diffColor: base.map((c) => c * 0.5),
    // Arnold fades diffuse out with metalness; the right half only does so
    // if the artist remembered to.
    diffuse: [(1 - s.mtMetal) * 0.35, diffusePxr],
  });

  const f3 = (v) => v.map((c) => c.toFixed(2)).join(', ');
  const mismatch = s.mtDiffuse !== 'zeroed' && s.mtMetal > 0.02;
  metalReadout.innerHTML =
    `<span>Face Color: <b>${f3(face)}</b></span>` +
    `<span>Edge Color: <b>${f3(edge)}</b></span>` +
    `<span>Diffuse Gain: <b>${diffusePxr.toFixed(2)}</b></span>` +
    (mismatch
      ? '<span>⚠ seam visible — this is the washed-out metal</span>'
      : '<span>✓ halves match</span>');
}

const metalCtl = bindControls(document.getElementById('metal-ctl'), updateMetal);
updateMetal(metalCtl.state);

/* ======================================================== Fresnel curves */

let fr = { frIor: 1.5, frFace: 0.04, frEdge: 1, frExp: 5, frShow: 'artistic' };

const fresnelPlot = createPlot(document.getElementById('fresnel-plot'), (ctx, w, h, th) => {
  const box = { x: 42, y: 14, w: w - 58, h: h - 42 };
  gridLines(ctx, box, th, 6, 4);
  axes(ctx, box, th);

  const curve = (f, color, dash) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    const steps = 180;
    for (let i = 0; i <= steps; i++) {
      const ang = (i / steps) * 90;
      const v = Math.min(Math.max(f(Math.cos(ang * DEG)), 0), 1);
      const x = box.x + (box.w * i) / steps;
      const y = box.y + box.h * (1 - v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };

  curve((c) => fresnelConductor(c, fr.frIor, 0), th.b);
  curve((c) => fresnelArtistic(fr.frFace, fr.frEdge, fr.frExp, c), th.a);

  for (let i = 0; i <= 6; i++) {
    label(ctx, `${i * 15}°`, box.x + (box.w * i) / 6, box.y + box.h + 15, th, { align: 'center' });
  }
  label(ctx, '1', box.x - 6, box.y + 4, th, { align: 'right' });
  label(ctx, '0', box.x - 6, box.y + box.h + 3, th, { align: 'right' });
  label(ctx, 'head-on', box.x, h - 4, th, { size: 10 });
  label(ctx, 'grazing', box.x + box.w, h - 4, th, { align: 'right', size: 10 });
});

const fresnelBall = createShaderball(document.getElementById('fresnel-ball'), {
  model: [MODEL.GGX, MODEL.GGX],
  roughness: [0.15, 0.15],
  fresnelMode: 1,
  lightAngle: 10,
  exposure: 0.3,
  lightPower: 45,
  diffuse: 0.12,
  diffColor: [0.2, 0.2, 0.22],
  // Edge Color only shows up at grazing angles *to the camera*, which is the
  // sphere's silhouette - not inside the small light's own highlight, where
  // the view-to-half-vector angle stays close to 0 and Fresnel sits near
  // Face Color instead. Without something ambient to reflect at the rim,
  // Edge Color = white has nothing to show through. Pushed well past the
  // metalness widget's env strength because this one needs the rim to read
  // clearly at a glance, not just be technically present.
  envGain: 2.4,
});

const fresnelReadout = document.getElementById('fresnel-readout');

function updateFresnel(s) {
  fr = s;
  fresnelPlot.redraw();
  fresnelBall.set({
    fresnelMode: s.frShow === 'physical' ? 2 : 1,
    ior: [s.frIor, s.frIor, s.frIor],
    extinction: [0, 0, 0],
    faceColor: [s.frFace, s.frFace, s.frFace],
    edgeColor: [s.frEdge, s.frEdge, s.frEdge],
    fresnelExp: s.frExp,
  });

  // Head-on reflectance is the honest way to compare the two ends.
  const f0Physical = fresnelConductor(1, s.frIor, 0);
  const gap = Math.abs(f0Physical - s.frFace);
  fresnelReadout.innerHTML =
    `<span>Physical head-on: <b>${f0Physical.toFixed(3)}</b></span>` +
    `<span>Artistic head-on: <b>${s.frFace.toFixed(3)}</b></span>` +
    `<span>${gap < 0.004 ? '✓ the two ends agree' : `off by ${gap.toFixed(3)}`}</span>`;
}

const fresnelCtl = bindControls(document.getElementById('fresnel-ctl'), updateFresnel);
updateFresnel(fresnelCtl.state);

/* ============================================================ thin film */

let film = { fmThick: 800, fmIor: 1.4, fmPreset: 'pxr' };

const filmField = createPlot(document.getElementById('film-field'), (ctx, w, h, th) => {
  const box = { x: 40, y: 12, w: w - 52, h: h - 40 };
  const maxNm = 2000;
  const cols = Math.max(1, Math.floor(box.w));

  // Thickness across, viewing angle down.
  for (let i = 0; i < cols; i++) {
    const nm = (i / cols) * maxNm;
    const rows = 40;
    for (let j = 0; j < rows; j++) {
      const ang = (j / rows) * 85;
      const rgb = thinFilmRGB(Math.cos(ang * DEG), nm, film.fmIor);
      ctx.fillStyle = rgbCss(rgb);
      ctx.fillRect(box.x + i, box.y + (box.h * j) / rows, 1.2, box.h / rows + 1);
    }
  }

  // Marker for the current thickness.
  const mx = box.x + (film.fmThick / maxNm) * box.w;
  ctx.strokeStyle = th.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mx, box.y - 4);
  ctx.lineTo(mx, box.y + box.h + 4);
  ctx.stroke();

  ctx.strokeStyle = th.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x, box.y, box.w, box.h);

  for (let i = 0; i <= 4; i++) {
    label(ctx, `${(maxNm * i) / 4}`, box.x + (box.w * i) / 4, box.y + box.h + 15, th, { align: 'center' });
  }
  label(ctx, 'nm', box.x + box.w / 2, h - 3, th, { align: 'center', size: 10 });
  label(ctx, '0°', box.x - 5, box.y + 8, th, { align: 'right', size: 10 });
  label(ctx, '85°', box.x - 5, box.y + box.h, th, { align: 'right', size: 10 });
});

const filmBall = createShaderball(document.getElementById('film-ball'), {
  model: [MODEL.GGX, MODEL.GGX],
  roughness: [0.12, 0.12],
  fresnelMode: 1,
  faceColor: [0.08, 0.08, 0.08],
  edgeColor: [1, 1, 1],
  filmThickness: 800,
  filmIor: 1.4,
  lightAngle: 14,
  exposure: 0.8,
  lightPower: 45,
  diffuse: 0.04,
  diffColor: [0.1, 0.1, 0.12],
});

const filmReadout = document.getElementById('film-readout');

function updateFilm(s, changed) {
  if (changed === 'fmPreset') {
    filmCtl.set('fmThick', s.fmPreset === 'arnold' ? 0 : 800);
    s.fmThick = s.fmPreset === 'arnold' ? 0 : 800;
  }
  film = s;
  filmField.redraw();
  filmBall.set({ filmThickness: s.fmThick, filmIor: s.fmIor });

  const head = thinFilmRGB(1, s.fmThick, s.fmIor);
  const graze = thinFilmRGB(Math.cos(70 * DEG), s.fmThick, s.fmIor);
  const swatch = (rgb) =>
    `<b style="display:inline-block;width:2.2em;height:0.9em;vertical-align:-1px;` +
    `border-radius:3px;background:${rgbCss(rgb)}"></b>`;
  filmReadout.innerHTML =
    `<span>Thickness: <b>${Math.round(s.fmThick)} nm</b></span>` +
    `<span>Head-on ${swatch(head)}</span>` +
    `<span>At 70° ${swatch(graze)}</span>` +
    (s.fmThick === 0 ? '<span>no film — no colour shift</span>' : '');
}

const filmCtl = bindControls(document.getElementById('film-ctl'), updateFilm);
updateFilm(filmCtl.state);

/* =========================================================== absorption */

let ab = { abExt: 0.5, abThin: 0.5, abThick: 3, abHue: 140 };

/* Beer-Lambert: transmitted = exp(-extinction * distance), per channel.
   The tint is what survives, so absorption is strongest where the glass
   colour is weakest. */
function transmit(hue, ext, dist) {
  const tint = hueRgb(hue, 0.8, 1);
  return tint.map((c) => Math.exp(-ext * (1.15 - c) * dist * 2));
}

const absorbPlot = createPlot(document.getElementById('absorb-plot'), (ctx, w, h, th) => {
  const box = { x: 44, y: 14, w: w - 60, h: h - 46 };
  const maxDist = 8;

  // Continuous transmission ramp along the light path.
  for (let i = 0; i < box.w; i++) {
    const d = (i / box.w) * maxDist;
    ctx.fillStyle = rgbCss(transmit(ab.abHue, ab.abExt, d));
    ctx.fillRect(box.x + i, box.y, 1.2, box.h);
  }
  ctx.strokeStyle = th.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x, box.y, box.w, box.h);

  // Where the two objects land on that ramp.
  const marker = (dist, name, colour) => {
    const x = box.x + (dist / maxDist) * box.w;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, box.y);
    ctx.lineTo(x, box.y + box.h);
    ctx.stroke();
    // Label sits inside the plot on a chip, so it stays readable over any tint.
    const tw = 34;
    ctx.fillStyle = th.bg;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x - tw / 2, box.y + 4, tw, 15);
    ctx.globalAlpha = 1;
    label(ctx, name, x, box.y + 15, th, { align: 'center', size: 10, color: colour });
  };
  marker(ab.abThin, 'thin', th.pxr);
  marker(ab.abThick, 'thick', th.arnold);

  for (let i = 0; i <= 4; i++) {
    label(ctx, `${(maxDist * i) / 4}`, box.x + (box.w * i) / 4, box.y + box.h + 18, th, { align: 'center' });
  }
  label(ctx, 'distance travelled inside the glass', box.x + box.w / 2, h - 3, th,
    { align: 'center', size: 10 });
});

const absorbReadout = document.getElementById('absorb-readout');

function updateAbsorb(s) {
  ab = s;
  absorbPlot.redraw();
  const thin = transmit(s.abHue, s.abExt, s.abThin);
  const thick = transmit(s.abHue, s.abExt, s.abThick);
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const swatch = (rgb) =>
    `<b style="display:inline-block;width:2.2em;height:0.9em;vertical-align:-1px;` +
    `border-radius:3px;background:${rgbCss(rgb)}"></b>`;
  const ratio = lum(thin) / Math.max(lum(thick), 1e-4);
  absorbReadout.innerHTML =
    `<span>Thin sample ${swatch(thin)}</span>` +
    `<span>Thick sample ${swatch(thick)}</span>` +
    `<span>Thin lets through <b>${ratio.toFixed(1)}×</b> as much light</span>`;
}

const absorbCtl = bindControls(document.getElementById('absorb-ctl'), updateAbsorb);
updateAbsorb(absorbCtl.state);
