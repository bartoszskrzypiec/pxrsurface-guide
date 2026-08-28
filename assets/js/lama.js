/* Widget for the PxrSurface vs Lama comparison. */

import { createPlot, bindControls, label } from './viz.js';

let ops = { opMode: 'layer', opTop: 0.6, opBase: 1 };

/**
 * How each operator divides a hundred units of arriving light.
 * Mix and Layer are bounded by construction; Add is not, and that is the
 * whole point of the widget.
 */
function budget() {
  const { opMode, opTop, opBase } = ops;
  if (opMode === 'mix') {
    // A mask: material 2 where it's white, material 1 where it's black.
    return { top: 100 * opTop, base: 100 * (1 - opTop), unused: 0 };
  }
  if (opMode === 'layer') {
    // The coat takes its share first; the base gets what's left.
    const top = 100 * opTop;
    const base = (100 - top) * opBase;
    return { top, base, unused: 100 - top - base };
  }
  // Add: a plain sum. Nothing stops it exceeding what arrived.
  return { top: 100 * opTop, base: 100 * opBase, unused: 0 };
}

const opsPlot = createPlot(document.getElementById('ops-canvas'), (ctx, w, h, th) => {
  const b = budget();
  const total = b.top + b.base;
  const over = total > 100.01;

  const box = { x: 24, y: h * 0.36, w: w - 48, h: h * 0.28 };
  // Scale so the whole bar always fits. When the total exceeds 100 the
  // budget line slides left, which reads as the bar overrunning it.
  const unit = box.w / Math.max(100, total * 1.08);

  label(ctx, 'light arriving at this point', box.x, box.y - 26, th, { size: 11 });

  // The 100-unit budget.
  ctx.fillStyle = th.grid;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(box.x, box.y - 14, 100 * unit, 10);
  ctx.globalAlpha = 1;

  let x = box.x;
  const seg = (amount, colour, name) => {
    if (amount <= 0.01) return;
    const wpx = amount * unit;
    ctx.fillStyle = colour;
    ctx.fillRect(x, box.y, wpx, box.h);
    if (wpx > 34) {
      label(ctx, `${Math.round(amount)}`, x + wpx / 2, box.y + box.h / 2 + 4, th,
        { align: 'center', size: 12, color: '#fff' });
    }
    if (wpx > 52) {
      label(ctx, name, x + wpx / 2, box.y + box.h + 15, th, { align: 'center', size: 10 });
    }
    x += wpx;
  };

  seg(b.top, th.pxr, ops.opMode === 'mix' ? 'material 2' : 'top');
  seg(b.base, th.arnold, ops.opMode === 'mix' ? 'material 1' : 'base');

  if (b.unused > 0.01) {
    ctx.fillStyle = th.grid;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, box.y, b.unused * unit, box.h);
    ctx.globalAlpha = 1;
    if (b.unused * unit > 48) {
      label(ctx, 'absorbed', x + (b.unused * unit) / 2, box.y + box.h + 15, th,
        { align: 'center', size: 10 });
    }
  }

  // The line you must not cross.
  const limit = box.x + 100 * unit;
  ctx.strokeStyle = over ? th.accent : th.text;
  ctx.lineWidth = 2;
  ctx.setLineDash(over ? [] : [4, 3]);
  ctx.beginPath();
  ctx.moveTo(limit, box.y - 22);
  ctx.lineTo(limit, box.y + box.h + 22);
  ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, '100', limit + 5, box.y - 22, th,
    { size: 11, color: over ? th.accent : th.muted });

  if (over) {
    ctx.fillStyle = th.accent;
    ctx.font = '600 13px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(total)} units out of 100 in — this surface is a light source`,
      w / 2, h - 10);
  }
});

const opsReadout = document.getElementById('ops-readout');

const BLURB = {
  mix: 'Two materials in different places. The mask splits the light; the total is always 100.',
  layer: 'One material over another. The top takes its share first and the base gets the remainder.',
  add: 'Two responses at the same point, summed. Nothing here is bounded.',
};

function updateOps(s) {
  ops = s;
  opsPlot.redraw();
  const b = budget();
  const total = b.top + b.base;
  opsReadout.innerHTML =
    `<span>${BLURB[s.opMode]}</span>` +
    `<span>Total out: <b>${Math.round(total)}</b> of 100</span>` +
    (total > 100.01 ? '<span>⚠ energy created from nothing</span>' : '<span>✓ conserved</span>');
}

const opsCtl = bindControls(document.getElementById('ops-ctl'), updateOps);
updateOps(opsCtl.state);
