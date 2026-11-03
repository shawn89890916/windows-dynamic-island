# Existing interface style

The host application's owning style surfaces are `src/styles.css` and
`src/components/ui/`. Module work must reuse those primitives and tokens.

- Ground `--island`: black. Primary `--text`: `#f5f5f7`; secondary text uses
  `--text-dim`, annotations use `--text-faint`. Cards use the existing tonal
  surface and inset `--hairline`, without decorative shadows or new gradients.
- Use the system sans-serif stack. Operational text is 11–13 px, section
  titles 13–15 px, and a single key measurement can use 24–30 px. Monospace
  and tabular numerals are reserved for compact measurements and times.
- Reuse `Card`, `Button`, `IconButton`, `Select`, `Segmented` and `SectionLabel`.
  Follow their canonical radii, hover treatment and control geometry.
- Dense module panels should group related information and fit their declared
  viewport. A node list owns vertical scrolling; headers and actions keep their
  height. Avoid a large empty region between a short list and its controls.
- Status color is a small annotation. Error state always includes readable
  text; selection and backup membership have explicit labels and keyboard access.
- Keep the host's existing Motion transitions. Do not add libraries, fonts,
  decorative image backgrounds or independent motion systems for a widget.

NavoPath-specific screens additionally follow the linked
[`NavoPathStyle.md`](https://github.com/shawn89890916/NavoPath-planner/blob/main/NavoPathStyle.md).
Its original white-front N with black extrusion is sourced from that project's
`public/navopath-icon.png`, reduced to the transparent 96 px `src/assets/navopath.png`.
AI icons reuse their existing native SVG components under `src/modules/ai-agents/`.
