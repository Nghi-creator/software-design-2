# UniHub Theme Tokens

`design/tokens.json` is the shared theme source of truth for UniHub web and mobile.

## Direction

- Default theme is dark mode.
- Main brand/action color is purple.
- Surfaces should feel layered: page background, subtle section, raised card, overlay/modal.
- Use purple for primary actions, active navigation, focus, and important highlights.
- Use status colors only for semantic states: success, warning, danger, info.
- Keep border radius restrained: `md` for ordinary controls, `lg`/`xl` for larger panels.

## Web Mapping

React web uses Tailwind. `apps/web/tailwind.config.mjs` reads `design/tokens.json` and maps it into:

- `bg-page`, `bg-surface-card`, `bg-brand-primary`
- `text-text-primary`, `text-text-secondary`, `text-text-muted`
- `border-border-subtle`, `border-border-strong`
- `rounded-theme-md`, `rounded-theme-lg`, `shadow-theme-md`, `shadow-theme-glow`

When editing web UI, prefer token-backed Tailwind utilities over hard-coded hex values.

## Mobile Mapping

Flutter should later map the same tokens into:

- `ColorScheme.dark`
- `ThemeData.scaffoldBackgroundColor`
- shared `AppTokens` constants
- button, input, card, chip, and navigation styles

Do not edit Flutter yet unless the mobile owner asks. When mobile theme work begins, read this file and `tokens.json` first.
