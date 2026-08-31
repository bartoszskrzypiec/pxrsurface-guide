# Shared graphics/i18n toolkit

`assets/js/viz.js` and `assets/js/i18n.js` are now the canonical source for
a shared toolkit used across all four book projects:

**`C:\Users\barte\Documents\VSCODE\learning-materials`**

## This repo's own notes

- This repo is the **source**, not a consumer, for `viz.js`. The copy in
  `learning-materials/assets/js/viz.js` is byte-for-byte identical as of
  this note. If `viz.js` changes here in a way worth sharing, update
  `learning-materials` and log it in that repo's `CHANGELOG.md`.
- `assets/js/i18n.js` in **this** repo is the *original, unhardened*
  version — it still has the hardcoded `'rmg-lang'` localStorage key and
  the English-default title auto-derivation. `learning-materials/assets/js/i18n.js`
  is a hardened fork of it (config-driven via `data-i18n-storage` /
  `data-i18n-default` on `<html>`, no title auto-derivation) built once a
  second consumer (`lookdev_book`, Polish-default) exposed the assumptions
  baked into the original. **Consider adopting the hardened version here
  too**, for consistency and to stop carrying the one-off `'rmg-lang'`
  string: it needs `<html data-i18n-storage="rmg-lang" data-i18n-default="en">`
  added to every bilingual page (which is now every page in the repo,
  including `lama-debug.html`),
  and each page's `<title>` needs an explicit `data-title-en="..."` added
  (currently relies on the auto-derivation this repo's copy still has).
  Not done automatically as part of this handoff — it's a small, mechanical
  edit across every page, worth doing deliberately rather than as a
  drive-by change.
- `assets/js/interactive.js` (formula modals + symbol tooltips, canonical
  source is `raytracing_book`) is **not currently used anywhere in this
  repo** — this guide's pages don't have inline formulas or vector-symbol
  notation the way the trilogy's math-heavy chapters do, so there's been no
  need for it. Worth reaching for if a future page introduces real formula
  notation.
- `learning-materials/patterns/svg-slider-widget.md` documents a
  lighter-weight 2D diagram pattern (proven in `raytracing_book`) that
  this repo hasn't needed yet, since every existing widget here renders
  actual BRDF/light physics rather than a geometric relationship — but it's
  a legitimate option for a future page that's more "show this angle
  relationship" than "show this rendered material."
