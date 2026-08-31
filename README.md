# Shader Migration Guides

Plain-language reference guides that help lookdev/lighting artists move
between shading models, without needing a technical or shader-writing
background.

**Live site:** https://bartoszskrzypiec.github.io/pxrsurface-guide/

> The published site lives at `pxrsurface-guide`; this working folder is named
> `renderman_guide`. Same project, different name — nothing depends on the
> folder name.

## Contents

- `index.html` — landing page
- `guide.html` — AiStandardSurface → PxrSurface transition guide *(interactive)*
- `sss.html` — subsurface scattering deep dive (mean free path, Radius vs DMFP, Unit Length) *(interactive)*
- `lama.html` — PxrSurface vs MaterialX Lama comparison guide *(interactive)*
- `lama-debug.html` — when a Lama graph goes wrong: the wiring mistakes artists actually hit, arranged by symptom *(interactive, EN/PL)*
- `spec.html` — Beckmann vs GGX: what a specular model is, and why roughness doesn't transfer *(interactive, EN/PL)*
- `aniso.html` — Specular Rotation vs Shading Tangent: why one renderer hands you an angle and the other a vector *(interactive, EN/PL)*
- `fuzz.html` — why fuzz has a cone angle rather than a roughness *(interactive, EN/PL)*
- `assets/css/style.css` — shared styling
- `assets/js/` — the only JavaScript on the site: the EN/PL language switch and the
  interactive widgets (a hand-written WebGL2 shaderball plus Canvas2D plots).
  No dependencies, no build step, no external requests.
- `assets/img/` — space for comparison renders/screenshots (not yet populated)
- `.nojekyll` — stops GitHub Pages running the files through Jekyll

## Roadmap

- [x] AiStandardSurface → PxrSurface guide
- [x] PxrSurface vs Lama comparison guide
- [x] Subsurface scattering deep dive
- [x] Beckmann vs GGX deep dive (interactive)
- [x] Specular Rotation vs Shading Tangent deep dive (interactive)
- [x] Fuzz cone angle deep dive (interactive)
- [x] Lama troubleshooting deep dive (interactive)
- [x] Interactive widgets on the three original guides
- [ ] Comparison renders in `assets/img/`
- [x] Polish translations — every page is now bilingual

## Interactive widgets

Ten widgets across the guides, all hand-written and dependency-free. Each one
exists because the thing it explains is a curve, a direction or a process that
prose can only gesture at:

| Page | Widget | What it settles |
|---|---|---|
| `guide.html` | Metalness split sphere | What Arnold's one slider does to Face Color, Edge Color and Diffuse Gain — and what the washed-out metal looks like when you forget the last one |
| `guide.html` | Fresnel curve | That Artistic and Physical describe the same reflectance curve from two directions |
| `guide.html` | Thin-film field | Colour against thickness *and* angle, with Arnold's 0 nm and PxrSurface's 800 nm side by side |
| `guide.html` | Absorption ramp | Why one Transmission Depth can't cover a thick bottle and a thin one |
| `sss.html` | Random walk | Mean free path made literal — photons bouncing through a slab |
| `sss.html` | Radius ↔ DMFP | The swap, and what the material looks like wired backwards |
| `sss.html` | Per-channel falloff | Why red bleeds furthest, and how Arnold's neutral default differs from Pixar's skin one |
| `sss.html` | Multiple Mean Free Paths | The three-layer skin model, one lobe at a time |
| `lama.html` | Light budget | Mix and Layer conserve energy; Add does not, and you can watch it pass 100% |
| `lama-debug.html` | Broken graph vs fixed | Three Lama graphs that look reasonable in a node editor, each drawn beside the correction |

The maths is real: the Fresnel curves use the full conductor equations, the
thin film computes actual interference at three wavelengths, and the shaderball
evaluates the BRDF in a fragment shader against a sampled area light. They are
there to show behaviour and trends, not to stand in for a test render.

## Sources

Parameter names, defaults and conversion factors are taken from the shader
definitions themselves rather than from memory:

- `PxrSurface.args` — the RenderMan shader definition (142 parameters)
- The [Autodesk Standard Surface specification](https://autodesk.github.io/standard-surface/)
- `StandardSurfaceParameters.oso` — Pixar's own Standard Surface → PxrSurface
  conversion shader, shipped with RenderMan for Maya. This is where the exact
  conversion factors come from (for example Fuzz Cone Angle = 32 × Sheen
  Roughness).
- The [MaterialX Lama node definitions](https://github.com/AcademySoftwareFoundation/MaterialX/tree/main/libraries/bxdf/lama)
- `kick -info standard_surface` — Arnold's own shader metadata, queried
  directly from a local install. This is where the enum values and defaults for
  `subsurface_type` come from, and where the `tangent` vector input on
  `standard_surface` was confirmed.
- `standard_surface.mtlx` — the MaterialX node definition shipped with Arnold
  for Maya, which spells out the internals the UI hides: `specular_rotation` is
  `rotate3d(tangent, rotation × 360°, axis = normal)`, and sheen is a
  `sheen_bsdf` (Conty–Kulla) driven by `sheen_roughness`.

Note that MaterialX Lama is a RenderMan/MaterialX system developed at ILM — not
an Arnold one.

## Languages

Every guide page ships English and Polish in the same file, with a
switch in the top-right of the nav. Both languages sit in the markup as sibling
elements marked `lang="en"` / `lang="pl"`, and two CSS rules hide the inactive
one — so the right language renders before any JavaScript runs, and the pages
still read correctly with JavaScript disabled. The choice is remembered in
`localStorage` and can be forced with `?lang=pl`.

## Local preview

No build step — just open `index.html` in a browser.

The guide pages load their JavaScript as ES modules, which browsers
block over `file://`. Open those from a local server instead:

```
python -m http.server 8000
```

then visit <http://localhost:8000/spec.html>.
