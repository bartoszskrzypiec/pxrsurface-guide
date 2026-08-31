/* Widget for the Lama troubleshooting page: what you built vs what you meant.

   Three graphs that look reasonable in a node editor and don't do what the
   artist thinks. Each case draws the broken wiring beside the corrected one,
   so the difference is a picture rather than a paragraph. */

import { createPlot, bindControls, label, arrow, currentLang } from './viz.js';

const FONT = '-apple-system, "Segoe UI", Roboto, sans-serif';

let state = { graphCase: 'terminal' };

/* Canvas text is drawn, not marked up, so it has to ask the page which
   language is showing. */
const T = {
  built: { en: 'what you built', pl: 'co zbudowałeś' },
  meant: { en: 'what you meant', pl: 'co miałeś na myśli' },
  top: { en: 'top', pl: 'góra' },
  base: { en: 'base', pl: 'baza' },
  nowhere: { en: 'nothing arrives', pl: 'nic tu nie dociera' },
};

const t = (key) => T[key][currentLang()];

/* The three cases. Each side is a plain description of a four-node graph;
   `end: null` means the chain stops before it reaches a terminal. */
const CASES = {
  terminal: {
    left: { a: 'LamaDielectric', b: 'LamaDiffuse', op: 'LamaLayer', end: null, ports: true },
    right: { a: 'LamaDielectric', b: 'LamaDiffuse', op: 'LamaLayer', end: 'LamaSurface', ports: true },
    verdict: {
      en: ['The chain never reaches a terminal — nothing renders.',
        'LamaSurface hands the material to the renderer.'],
      pl: ['Łańcuch nie dociera do terminala — nic się nie renderuje.',
        'LamaSurface przekazuje materiał rendererowi.'],
    },
  },
  order: {
    left: { a: 'LamaDiffuse', b: 'LamaDielectric', op: 'LamaLayer', end: 'LamaSurface', ports: true },
    right: { a: 'LamaDielectric', b: 'LamaDiffuse', op: 'LamaLayer', end: 'LamaSurface', ports: true },
    verdict: {
      en: ['The wood is on top of the varnish. No error, just wrong.',
        'The coat goes in the top, the substrate in the base.'],
      pl: ['Drewno leży na werniksie. Bez błędu, po prostu źle.',
        'Powłoka idzie w górę, podłoże w bazę.'],
    },
  },
  added: {
    left: { a: 'LamaDielectric', b: 'LamaDiffuse', op: 'LamaAdd', end: 'LamaSurface', ports: false },
    right: { a: 'LamaDielectric', b: 'LamaDiffuse', op: 'LamaLayer', end: 'LamaSurface', ports: true },
    verdict: {
      en: ['Add sums both at full strength — more light out than in.',
        'Layer lets the coat take its share, then passes the rest down.'],
      pl: ['Add sumuje oba z pełną siłą — więcej światła niż weszło.',
        'Layer daje powłoce jej udział, resztę przekazuje niżej.'],
    },
  },
};

/* Colour follows the material, not the slot it happens to sit in — the whole
   point of the swapped case is following one material across the divider. */
function nodeColour(name, th) {
  if (name === 'LamaDielectric') return th.pxr;
  if (name === 'LamaDiffuse') return th.arnold;
  if (name === 'LamaSurface') return th.b;
  return th.a;
}

/** Largest size at or below `max` that fits *every* label into `maxW`.
    One size for the whole diagram: sibling boxes are the same width, so
    per-node sizing just made equal boxes carry unequal type. */
function fitFontAll(ctx, labels, maxW, max, min) {
  let size = max;
  while (size > min) {
    ctx.font = `${size}px ${FONT}`;
    if (labels.every((s) => ctx.measureText(s).width <= maxW)) return size;
    size -= 0.5;
  }
  return min;
}

/** Greedy word wrap, so the Polish verdicts don't run off the canvas. */
function wrapLines(ctx, text, maxW, size) {
  ctx.font = `${size}px ${FONT}`;
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawNode(ctx, n, th, size) {
  const colour = nodeColour(n.label, th);
  roundRect(ctx, n.x, n.y, n.w, n.h, 6);
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.14;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  label(ctx, n.label, n.x + n.w / 2, n.y + n.h / 2 + size * 0.36, th,
    { align: 'center', size, color: th.text });
}

function wire(ctx, from, to, colour, dashed) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dashed ? [4, 4] : []);
  arrow(ctx, from.x, from.y, to.x, to.y, 7);
  ctx.setLineDash([]);
}

/* One column: two materials feeding an operator, the operator feeding a
   terminal. Draws straight into the context. */
function drawGraph(ctx, box, spec, th, broken, nw, size) {
  const nh = 24;
  const cx = box.x + box.w / 2;
  const rows = [box.y, box.y + box.h * 0.40, box.y + box.h * 0.80];

  const a = { x: box.x, y: rows[0], w: nw, h: nh, label: spec.a };
  const b = { x: box.x + box.w - nw, y: rows[0], w: nw, h: nh, label: spec.b };
  const op = { x: cx - nw / 2, y: rows[1], w: nw, h: nh, label: spec.op };

  drawNode(ctx, a, th, size);
  drawNode(ctx, b, th, size);
  drawNode(ctx, op, th, size);

  // Materials into the operator's two inputs.
  wire(ctx, { x: a.x + a.w / 2, y: a.y + a.h },
    { x: op.x + op.w * 0.28, y: op.y }, nodeColour(a.label, th));
  wire(ctx, { x: b.x + b.w / 2, y: b.y + b.h },
    { x: op.x + op.w * 0.72, y: op.y }, nodeColour(b.label, th));

  // Only Layer has a top and a base; Add is symmetric and gets no port names.
  // The labels sit at each wire's origin, on the side the wire leans away
  // from, so no arrowhead ever lands on top of the text.
  if (spec.ports) {
    label(ctx, t('top'), a.x + a.w / 2 - 5, a.y + a.h + 12, th, { align: 'right', size: 9 });
    label(ctx, t('base'), b.x + b.w / 2 + 5, b.y + b.h + 12, th, { align: 'left', size: 9 });
  }

  if (spec.end) {
    const end = { x: cx - nw / 2, y: rows[2], w: nw, h: nh, label: spec.end };
    drawNode(ctx, end, th, size);
    wire(ctx, { x: cx, y: op.y + op.h }, { x: cx, y: end.y }, th.b);
  } else {
    // The chain stops in mid-air: a dashed stub to a cross.
    const stopY = rows[2] + nh / 2;
    wire(ctx, { x: cx, y: op.y + op.h }, { x: cx, y: stopY - 9 }, th.accent, true);
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 6, stopY - 6);
    ctx.lineTo(cx + 6, stopY + 6);
    ctx.moveTo(cx + 6, stopY - 6);
    ctx.lineTo(cx - 6, stopY + 6);
    ctx.stroke();
    label(ctx, t('nowhere'), cx, stopY + 22, th,
      { align: 'center', size: 10, color: th.accent });
  }

  // Column heading, coloured only on the broken side.
  label(ctx, broken ? t('built') : t('meant'), cx, box.y - 12, th,
    { align: 'center', size: 11, color: broken ? th.accent : th.muted });
}

const graphPlot = createPlot(document.getElementById('graph-canvas'), (ctx, w, h, th) => {
  const c = CASES[state.graphCase] || CASES.terminal;
  const lang = currentLang();
  const pad = 16;
  const colW = (w - pad * 3) / 2;

  // Lay the verdicts out first: they wrap, and how many lines they take
  // decides how much height is left for the graphs above them.
  const vSize = 10.5;
  const vLead = 13;
  const [bad, good] = c.verdict[lang];
  const badLines = wrapLines(ctx, bad, colW - 6, vSize);
  const goodLines = wrapLines(ctx, good, colW - 6, vSize);
  const vRows = Math.max(badLines.length, goodLines.length);
  const vTop = h - 10 - (vRows - 1) * vLead;

  const boxY = 34;
  const boxH = vTop - 26 - boxY;

  // Node names are long and the boxes get narrow. Size the type once, off
  // every label in both columns, so the whole diagram sets at one size and
  // nothing spills its border.
  const nw = Math.min(colW * 0.46, 112);
  const names = [c.left, c.right].flatMap((g) => [g.a, g.b, g.op, g.end].filter(Boolean));
  const nodeSize = fitFontAll(ctx, names, nw - 8, 10.5, 6);

  drawGraph(ctx, { x: pad, y: boxY, w: colW, h: boxH }, c.left, th, true, nw, nodeSize);
  drawGraph(ctx, { x: pad * 2 + colW, y: boxY, w: colW, h: boxH }, c.right, th, false, nw, nodeSize);

  // The divider between the two readings of the same material.
  ctx.strokeStyle = th.border;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 14);
  ctx.lineTo(w / 2, vTop - 18);
  ctx.stroke();
  ctx.setLineDash([]);

  badLines.forEach((ln, i) => {
    label(ctx, ln, pad + colW / 2, vTop + i * vLead, th,
      { align: 'center', size: vSize, color: th.accent });
  });
  goodLines.forEach((ln, i) => {
    label(ctx, ln, pad * 2 + colW * 1.5, vTop + i * vLead, th,
      { align: 'center', size: vSize });
  });
});

const graphReadout = document.getElementById('graph-readout');

const SYMPTOM = {
  terminal: { en: 'Symptom: the material renders black', pl: 'Objaw: materiał renderuje się na czarno' },
  order: { en: 'Symptom: the coat has no effect on the surface', pl: 'Objaw: powłoka nie działa na powierzchnię' },
  added: { en: 'Symptom: the material is too bright', pl: 'Objaw: materiał jest zbyt jasny' },
};

const FIX = {
  terminal: { en: 'End the chain at LamaSurface', pl: 'Zakończ łańcuch na LamaSurface' },
  order: { en: 'Swap the two LamaLayer inputs', pl: 'Zamień oba wejścia LamaLayer' },
  added: { en: 'Replace LamaAdd with LamaLayer', pl: 'Zamień LamaAdd na LamaLayer' },
};

function updateGraph(s) {
  state = s;
  graphPlot.redraw();
  const lang = currentLang();
  graphReadout.innerHTML =
    `<span>${SYMPTOM[s.graphCase][lang]}</span>` +
    `<span>${lang === 'pl' ? 'Naprawa' : 'Fix'}: <b>${FIX[s.graphCase][lang]}</b></span>`;
}

const graphCtl = bindControls(document.getElementById('graph-ctl'), updateGraph);
updateGraph(graphCtl.state);

// The readout is HTML rather than canvas text, so it needs its own nudge.
document.addEventListener('langchange', () => updateGraph(state));
