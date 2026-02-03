# Peña Euromillones

Pequeña aplicación web para gestionar una peña de Euromillones.

## Tests
- Unit tests (Vitest): `npm run test:unit` — ejecuta tests bajo `tests/unit/`.
- E2E smoke (Playwright): `npx playwright test tests/e2e/smoke.spec.ts --project=chromium` — ejecutado automáticamente en PRs por CI.
- E2E full (Playwright): `npx playwright test tests/e2e/full.spec.ts --project=chromium` — uso local o para runs completos.

Más detalles y pasos están en `TESTING.md`.
