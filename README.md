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
- `guide.html` — AiStandardSurface → PxrSurface transition guide
- `lama.html` — PxrSurface vs MaterialX Lama comparison guide
- `assets/css/style.css` — shared styling
- `assets/img/` — space for comparison renders/screenshots (not yet populated)
- `.nojekyll` — stops GitHub Pages running the files through Jekyll

## Roadmap

- [x] AiStandardSurface → PxrSurface guide
- [x] PxrSurface vs Lama comparison guide
- [ ] Comparison renders in `assets/img/`

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

Note that MaterialX Lama is a RenderMan/MaterialX system developed at ILM — not
an Arnold one.

## Local preview

No build step — just open `index.html` in a browser.
