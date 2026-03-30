---
name: Color tokens design spec
description: Design specification for adding descriptive CSS custom‑property color tokens to globals.css, scoped per component.
type: design
---

## Goal
Create a set of descriptive CSS variables that map to the Tailwind palette and component‑specific colors. Variables will be defined in `src/app/globals.css` and used throughout the UI instead of hard‑coded Tailwind color values.

## Scope
- Only Tailwind‑defined colors and component‑specific hard‑coded hex values currently used in the UI.
- No changes to the Tailwind `theme.extend.colors` block.
- Excludes colors used exclusively in tests or non‑UI code.

## Design
1. **Design‑token block** – Add a `@layer base { :root { … } }` block at the top of `globals.css`.
   ```css
   @layer base {
     :root {
       /* Core theme */
       --color-primary: theme(colors.primary);
       --color-alt: theme(colors.alt);

       /* Buttons */
       --btn-primary-bg: var(--color-primary);
       --btn-primary-text: theme(colors.white);

       /* Charts */
       --chart-grid: #374151;
       --chart-axis: #9ca3af;
       --chart-bar-primary: #4f46e5;
       --chart-bar-unique: #f59e0b;
       --chart-bar-success: #10b981;

       /* HeatMap */
       --heatmap-low: #e0f7fa;
       --heatmap-high: #006064;
     }
   }
   ```
2. **Replace Tailwind color usage**
   - In JSX `className` strings, use Tailwind arbitrary values, e.g. `bg-[var(--btn-primary-bg)]`.
   - Inline styles become `style={{ background: 'var(--chart-bar-primary)' }}`.
   - SVG attributes: `stroke="var(--chart-axis)"`, `fill="var(--heatmap-low)"`.
3. **Testing**
   - Run `npm test` to ensure no regressions.
   - Manually verify light and dark modes.
4. **Documentation**
   - Add a comment at the top of `globals.css` describing the naming convention.

## Success criteria
- All UI components that previously used hard‑coded Tailwind colors now reference the new CSS variables.
- The application renders correctly in both light and dark themes.
- Test suite passes without changes.

## Risks & Mitigations
- **Missed color references** – Run a project‑wide grep for `#` after changes to ensure none remain.
- **Tailwind purge** – Using arbitrary values (`var(--…)`) is supported; verify that the build does not strip them.

## Timeline
- Design spec written ✅
- Implementation plan (next step) ✅
- Development & review – 1‑2 days.

---

Generated with Claude Code.
