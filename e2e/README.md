# Playwright strategy

This repo uses Playwright in three local layers:

- `npm run test:e2e:smoke`
  - Fast smoke coverage for hub, company gates, long-form shells and repeated rows.
- `npm run test:e2e:integration`
  - Shared business flows such as `usuarios_reca`, prefixed dropdown sync,
    Seleccion recommendations and draft lifecycle.
- `npm run test:e2e:publish`
  - Controlled finalization with mocked `/api/formularios/*` responses.

Rules for new specs:

- Prefer `data-testid` over visible text when the UI can drift.
- Seed empresa through `sessionStorage`; do not depend on live company search.
- Do not call Google, Drive or real finalization providers from Playwright.
- Mock shared APIs when the scenario is about UI behavior, not external I/O.

Recommended usage:

- Local before merge: `npm run test:e2e:smoke`
- Local before QA/pre-push on forms with shared infra: `npm run test:e2e`
- CI first step: smoke subset only
- Preview/nightly later: integration subset when runtime stays stable
