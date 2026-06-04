# @family/ui

Shared React primitives and the premium design system (`PageHero`, `ModalShell`, `ProgressBar`, …).

## Storybook (visual catalog)

```bash
pnpm --filter @family/ui storybook
```

Opens at http://localhost:6006 — use for manual visual review of premium components. Chromatic / automated visual regression can be wired in CI later.

## Accessibility

- `ModalShell`: focus trap, `aria-labelledby` / `aria-describedby`, Escape, scroll lock, dedicated backdrop control.
- Export `useFocusTrap` for other overlays (e.g. command palette in `apps/web`).
