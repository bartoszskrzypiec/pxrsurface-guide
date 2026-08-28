/* Specular Rotation vs Shading Tangent page. */

import {
  createShaderball, createPlot, bindControls, onDrag, MODEL,
  label, arrow, currentLang,
} from './viz.js';

const FIELD_MODE = { uniform: 0, radial: 1, swirl: 2 };

const ball = createShaderball(document.getElementById('aniso-ball'), {
  model: [MODEL.GGX, MODEL.GGX],
  roughness: [0.25, 0.25],
  aniso: [0.8, 0.8],
  tangentMode: 0,
  tangentRot: 0,
  lightAngle: 6,
  exposure: 0.5,
  diffuse: 0.05,
});

let state = { anRot: 0, anAmount: 0.8, anRough: 0.25, anField: 'uniform' };

/* ------------------------------------------------- tangent field diagram */

const fieldCanvas = document.getElementById('aniso-field');

/** Direction of the tangent at a point, matching the shader's tangentFor(). */
function fieldDir(nx, ny, mode, rot) {
  let ax;
  if (mode === 'radial') ax = Math.atan2(ny, nx);
  else if (mode === 'swirl') ax = Math.atan2(nx, -ny);
  else ax = 0;
  return ax + rot;
}

const fieldPlot = createPlot(fieldCanvas, (ctx, w, h, th) => {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.42;
  const rot = state.anRot * Math.PI * 2;

  // The patch of surface the arrows sit on.
  ctx.fillStyle = th.grid;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = th.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Arrow grid
  const n = 7;
  const len = (r * 2) / n * 0.42;
  ctx.strokeStyle = th.pxr;
  ctx.fillStyle = th.pxr;
  ctx.lineWidth = 1.6;

  for (let iy = 0; iy < n; iy++) {
    for (let ix = 0; ix < n; ix++) {
      const nx = ((ix + 0.5) / n) * 2 - 1;
      const ny = ((iy + 0.5) / n) * 2 - 1;
      if (nx * nx + ny * ny > 0.92) continue;
      const px = cx + nx * r;
      const py = cy + ny * r;
      const a = fieldDir(nx, ny, state.anField, rot);
      const dx = Math.cos(a) * len;
      const dy = Math.sin(a) * len;
      arrow(ctx, px - dx / 2, py - dy / 2, px + dx / 2, py + dy / 2, 5);
    }
  }

  const lang = currentLang();
  const title = state.anField === 'uniform'
    ? (lang === 'pl' ? 'Jednorodne — osiągalne pokrętłem' : 'Uniform — the dial can reach this')
    : (lang === 'pl' ? 'Poza zasięgiem pojedynczej rotacji' : 'Out of reach of a single rotation');
  label(ctx, title, cx, h - 6, th, { align: 'center', size: 11 });

  if (state.anField === 'uniform') {
    label(ctx, `${Math.round(state.anRot * 360)}°`, cx, 16, th,
      { align: 'center', size: 13, color: th.text });
  }
});

/* Dragging the field sets the rotation, but only where rotation means
   something — the non-uniform fields aren't a single angle. */
onDrag(fieldCanvas, ({ x, y, w, h }) => {
  if (state.anField !== 'uniform') return;
  const a = Math.atan2(y - h / 2, x - w / 2);
  const turns = ((a / (Math.PI * 2)) % 1 + 1) % 1;
  ctlApi.set('anRot', turns.toFixed(3));
  state.anRot = turns;
  apply();
});

/* --------------------------------------------------------------- wiring */

const readout = document.getElementById('aniso-readout');

function apply() {
  ball.set({
    roughness: [state.anRough, state.anRough],
    aniso: [state.anAmount, state.anAmount],
    tangentMode: FIELD_MODE[state.anField],
    tangentRot: state.anRot * Math.PI * 2,
  });
  fieldPlot.redraw();

  const lang = currentLang();
  const deg = state.anRot * 360;
  const effective = ((deg % 180) + 180) % 180;
  const s = lang === 'pl'
    ? { rot: 'Rotacja', deg: 'stopnie', eff: 'wygląda jak', iso: 'anizotropia 0 — kierunek nie ma znaczenia' }
    : { rot: 'Rotation', deg: 'degrees', eff: 'looks like', iso: 'anisotropy 0 — direction has no effect' };

  if (state.anAmount <= 0.001) {
    readout.innerHTML = `<span>${s.iso}</span>`;
    return;
  }
  readout.innerHTML =
    `<span>${s.rot}: <b>${state.anRot.toFixed(3)}</b></span>` +
    `<span>× 360 = <b>${deg.toFixed(0)}°</b></span>` +
    `<span>${s.eff} <b>${effective.toFixed(0)}°</b></span>`;
}

const ctlApi = bindControls(document.getElementById('aniso-ctl'), (s) => {
  state = { ...state, ...s };
  apply();
});

document.addEventListener('langchange', apply);
apply();
