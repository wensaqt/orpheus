# Orpheus

A personal writing and composition app built with Next.js, React, Lexical, Payload CMS and Postgres.
It includes an editor with autosave, a document and folder binder, pagination, page settings,
formatting tools, an editable two-page book view and French synonyms. The interface is available
in English and French. Page formats are A4 and A5, in portrait.

In the editor, **View → Book view** presents pages left to right in spreads, stacked vertically
for continuous scrolling: pages 1–2, then 3–4, and so on. Writing flows between the pages.
The view preference is remembered, and printing uses individual portrait sheets.

## Local development

1. Copy `.env.example` to `.env` and set a private `PAYLOAD_SECRET`.
2. Install dependencies with `pnpm install`.
3. Start Postgres with `docker compose up -d postgres` (host port `5434`).
4. Run `pnpm dev` and open `http://localhost:3000`.

The local `DATABASE_URL` in `.env.example` targets the Docker Postgres service. Payload pushes
schema changes in development; production requires migrations before deployment.

`pnpm payload migrate` applies `20261007_120000_portrait_pages` to an existing database before
deploying the A4/A5 portrait restriction. It converts US Letter to A4, landscape to portrait,
and fits margins and indentation to the new dimensions. Rolling back restores the available
formats, not each document's previous dimensions.

## Checks

- `pnpm exec tsc --noEmit --noUnusedLocals --noUnusedParameters`: type and unused-code checks.
- `pnpm lint`: ESLint using Next.js flat configurations.
- `pnpm test:unit`: pure functions, components and hooks.
- `pnpm test:int`: Payload integration tests against the local database.
- `pnpm test:e2e --workers=2`: browser tests against `http://localhost:3000`; Playwright starts
  a dev server if needed. Chromium runs the full suite; Firefox and WebKit run pagination,
  page settings and toolbar tests.

Integration and browser suites share temporary accounts and cleanup routines: run them
sequentially against the same database. Test accounts use the `orpheus-test-` prefix.

## Maintenance

- `pnpm generate:types`: regenerate Payload types after collection changes.
- `pnpm generate:importmap`: regenerate the Payload admin import map.
- `pnpm thesaurus:import [wiktionary|dicollecte]`: replace the selected dictionary source;
  omitting the argument imports both. The Wiktionary export is streamed and is several GB.
- `pnpm users:set <email> role admin` or `pnpm users:set <email> plan pro`: update user access.
- `pnpm passwords:blocklist`: rebuild the password blocklist.

`HANDOFF.md` describes the current architecture and roadmap. `POLISH_REVIEW.md` tracks the
cleanup inventory and implementation decisions for `fix/polish`.
