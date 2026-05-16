# Theme: UniHub Dark Purple

Source of truth: `design/tokens.json`.

Use a dark-mode interface with purple as the primary action/accent color. Web and mobile should share color, radius, spacing, shadow, and type tokens from the same file. Avoid one-off hex values in app code unless a token is missing and should be added intentionally.

## Agent Rules

- Before changing visual styling in `apps/web` or `apps/mobile`, read `design/tokens.json`.
- For web, use Tailwind utilities backed by the token mapping in `apps/web/tailwind.config.mjs`.
- For mobile, map tokens into Flutter `ThemeData` when that work starts.
- Keep UI surfaces layered: page background, raised cards, overlays.
- Primary buttons and active states use brand purple; destructive, warning, success, and info states use status tokens only.
