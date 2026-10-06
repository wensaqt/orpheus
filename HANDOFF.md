You are taking over development of **Orpheus**, a personal writing/composition web app owned by the user (it is their own project, not their employer's). Reply to the user in **French**; they write casually and often say "commit et push" when they want work committed.

## Stack

- Next.js 16 App Router (breaking changes vs. older Next: `proxy.ts` replaces middleware, async `params`/`searchParams`, `PageProps<'/route'>` global type). Read `node_modules/next/dist/docs/` before using an unfamiliar API.
- Payload CMS 3.90.1 on Postgres (Docker container `orpheus-postgres-1`, port 5434, `DATABASE_URL` in `.env`). Dev uses schema _push_; production will need real Payload migrations (not created yet).
- React 19, Lexical 0.50.0 (single pinned copy), CSS Modules, pnpm.
- Payload skill docs: `.claude/skills/payload/SKILL.md` and `reference/`.

## Non-negotiable code rules

- Comments, test names, docs: **English only**. French appears only as data (`fr.ts`, thesaurus).
- **No hardcoded UI strings**: everything goes through i18n. Server code uses `const t = await getT()` (`src/app/(frontend)/_lib/server/i18n.ts`), client components use `const t = useT()` (`_components/i18n/I18nProvider.tsx`). Add every key to both `_lib/i18n/en.ts` and `fr.ts`; the `Messages` type makes a missing key fail to compile. French typography: narrow no-break space U+202F before `? ! : ;` and inside « ».
- **Design tokens only**, defined in `src/app/(frontend)/_styles/tokens.css` (palette: ivory bg, pearl desk `--color-surface-raised`, white sheet `--color-sheet`, dusty grape primary, antique gold accent/errors, `--shadow-sheet`). Font: Nunito Sans, light weights (300) for headings.
- **Pure functions** where possible, clean folder split: `src/lib/` (shared with Payload), `src/collections/<Name>/{index,access,hooks}.ts`, frontend `src/app/(frontend)/_features/<domain>/{actions,queries,types}.ts`, `_components/ui/<Component>/`.
- Match the surrounding code's style and comment density. Use Prettier.
- Security: server actions are public endpoints, so wrap them in `authedAction`; Payload calls from the app use `user` + `overrideAccess: false`; layouts never do auth checks.
- No header/footer: top-left lyre logo (HomeLink), top-right corner = language menu (flag emoji) + account menu.

## Tests (keep all green; add tests with every change)

- `pnpm test:unit` (Vitest jsdom, `tests/unit/**`), `pnpm test:int` (Payload + dev DB, `tests/int/**`), `pnpm test:e2e` (Playwright against the running dev server on :3000, `tests/e2e/**`).
- Test accounts use the `orpheus-test-` email prefix and `TEST_PASSWORD` (`tests/helpers/testUsers.ts`); e2e `fixtures.ts` gives a logged-in `account`; a Playwright globalSetup cleans leftovers. Test thesaurus words use the `orpheustest` prefix.
- RTL needs an explicit `cleanup()` (Vitest globals are off). jsdom lacks the Popover API (stub `hidePopover`).
- E2E gotcha: wait for React hydration before typing or clicking JS-driven controls (e.g. wait for `[contenteditable="true"]` in the editor, or use `expect(...).toPass()`), otherwise input is lost under load.
- `pnpm lint` uses the installed Next flat configs; `pnpm exec tsc --noEmit --noUnusedLocals --noUnusedParameters` must pass. `src/payload-types.ts` is generated (`pnpm generate:types`); don't hand-format it.
- Verify UI changes with Playwright screenshots (put scratch scripts in a temp dir, delete them after).

## What exists (all pushed on `main`)

- Home with two lyre buttons, compositions list (sheet thumbnails, ⋯ menu, delete with confirm), editor (autosave, Lexical, synonyms panel on the right backed by a Postgres thesaurus built from Wiktionary + Dicollecte via `pnpm thesaurus:import`).
- Auth: own `/login` and `/signup` pages (`(auth)` route group), Payload login under the hood, safe `?redirect=`. Users have `role` (admin/user) and `plan` (free/pro), settable only by admins; the Payload admin is admins-only. Password rules: 12–128 chars, blocklist of common passwords (`pnpm passwords:blocklist`), no email name/"orpheus", no runs/repetitions (`src/lib/passwords/strength.ts`). `pnpm users:set <email> role admin|plan pro`.
- i18n EN/FR with cookie `orpheus-locale` + Accept-Language negotiation.
- **Binder ("chutier") phase 1 (commit 63629cd)**: collection `binder-items` (`src/collections/BinderItems/`): folders and documents in a free tree of unlimited depth (`kind`, `title`, `parent`, `position`, `composition`, `owner`, `content` for documents). Hook `keepBinderTree` enforces: owner from composition, parent is a folder of the same composition, no cycles, no content in folders, appended positions. Note: on update Payload passes the _whole merged document_ as `data`, so moves are detected by comparing with `originalDoc`. Deleting a folder deletes its subtree, deleting a composition deletes its binder, a new composition gets one empty document (title via `context.firstDocumentTitle`). Pure tree helpers in `src/lib/binder/tree.ts`. Text moved off compositions (`pnpm binder:migrate`, already run on dev).

## Binder UI (phases 2–5): done, reviewed and refactored

- Routes: `compositions/[id]/layout.tsx` (no auth check: returns children when there is no binder, pages redirect or 404), `page.tsx` (redirects to the first document or shows `EmptyBinder`), `[documentId]/page.tsx` (`DocumentEditor`, keyed by document).
- `_components/binder/`: `state/` (pure `binderOps.ts` reducer; `BinderProvider` with `useOptimistic` over saved entries, collapsed folders, rename state, save registry and `useRegisterSaver`; `useBinderCommands`; `useSaveRegistry` with the `SAVERS` keys; `useOpenDocument` owns save-before-navigation, and `_features/binder/documentStore.ts` caches confirmed text so back/forward shows the latest saved version), `tree/` (`BinderTree` roving focus, pure `treeKeyboard.ts`, `BinderRow`, `RowMenu`, `RenameField`), `dnd/` (typed drag data, row hook, drop monitor with auto-scroll; drop operations are the `DROP` constants of `rows.ts`), `MoveDialog`, `BinderPanel` (composition title + toolbar of `IconButton`s with tooltips). `document/`: `DocumentEditor` (composer + the page inside it: title field, text autosave, both registered as savers), `DocumentTitle` (Enter → start of the text), `EmptyBinder`.
- `_components/editor/`: `EditorComposer` (LexicalComposer, one per document), `EditorContent`, `selection.ts` (`$isAtDocumentStart`), `plugins/AutosavePlugin` (`useAutosavePlugin` hook: marks dirty on content updates, skipping selection-only and history-merge updates like Lexical's OnChangePlugin; serializes on save; flushes on blur and Cmd/Ctrl+S), `plugins/TitleNavigationPlugin` (up arrow at the start of the text → title).
- Saving: `useAutosave(save)` (no patches: `queue()` marks dirty, `save` reads the latest state; stable controls; retries with backoff, sooner on a new change; stops when unmounted), `useTitleField` on top of it. Leaving a document awaits every registered saver (`flushAll`); it stays put with a toast if saving fails; deleting a document cancels its savers.
- Server actions validate input (`_lib/validation.ts` `isId`/`parseId`, `_features/binder/validation.ts`), trim titles (`src/lib/titles.ts`) and return `ActionResult` (`_lib/actionResult.ts`, `succeeded(call)` turns a call into a boolean). Hook context keys (`keepPosition`, `firstDocumentTitle`) are typed by augmenting Payload's `RequestContext` (`src/collections/requestContext.ts`). Shared UI: `Button`, `DialogTitle`/`DialogActions`, `TitleInput`, `IconButton`; `useStoredState` (useSyncExternalStore, keys in `_lib/preferences.ts` `STORAGE_KEYS`); binder hidden state in a cookie (`_lib/preferences.ts`).
- Later: which items form the manuscript for pagination/export ("include in export" flag), reopen the last viewed document, mobile binder collapsed by default.

## Pagination (on `main`: 11a4c40, then PR #1 merged as e339501)

- Every document is on real pages of its composition's format (`_components/editor/pagination/`): one Lexical flow; floats (`.textArea` zero-width + full-width `.band`) push lines past each page's text area onto the next; sheets drawn behind. `usePageLayout` (attached via `editor.registerRootListener`) measures offsets from the flow top (`flowTopOnScreen` = `.paged` top + top margin, re-read each time because Chrome's scroll anchoring moves things) and sets only DOM styles (written only when the string changes) + the page count. Pure maths in `pageGeometry.ts`: one origin (top of the first text area), `SUBPIXEL_TOLERANCE`, `LINE_INSET`, `pageBreakFill({ start, textEnd })`, `nearestTextOffset`, `caretPoint`. DOM markers in `pagination/constants.ts` (`data-pages`, `data-page-sheet`).
- Empty lines: a block holding only a `<br>` is zero wide and every engine lets it sit beside the full-width band (between two pages). `PagedSheet.module.css` gives such blocks an unseen 1px inline-block `::before` (`.text :has(> br:only-child)`), so they go onto the next page. Widening the band does not help. `readLayout` in the e2e helpers checks empty lines too (in a text area, at the text's left edge).
- `PageBreakNode` (Cmd/Ctrl+Enter via `KEY_ENTER_COMMAND` at LOW, `PageBreakPlugin`): stretched by JS to its page's end; a break right after another fills a whole blank page. Print: `@page` at the format, gap 0, chrome hidden, no relayout needed (offsets shift uniformly); PDF page count = screen page count. Caret placement for clicks outside the text: `caretPlacement.ts` (margins/gap/below: a point via `caretTarget` + `caretFromPoint`; a break's blank: `$selectTextBefore` through Lexical, skipping breaks in a row, because the text before may be out of view). Loading placeholder: `pagination/BlankPage`.
- `tests/e2e/pagination.e2e.spec.ts` runs on chromium, firefox and webkit (print tests Chromium only). Test gotchas: Cmd+End does nothing on macOS (use Cmd+Down), wait a frame after moving the caret before the next key (`selectionRead`); helpers in `tests/e2e/paginationHelpers.ts` (one `readScreen` pass, judged by the pure `classifyLines` in `tests/helpers/pageLayout.ts`, unit tested; `waitForEditor` waits for `[data-lexical-editor]`, else the server markup looks settled under load), no named functions inside `page.evaluate` (`pnpm test:e2e` runs through tsx, which wraps them with a `__name` helper the browser lacks), paste needs a real ClipboardEvent with `clipboardData` defined by hand (Firefox).
- A long-running `pnpm dev` with many HMR edits can make e2e flaky; use a fresh server when diagnosing failures.
- **M1a (merged: PR #2)**: sticky editor header (`compositions/[id]/_components/header/`):
  - "Composition › Document" titles; the document title is portaled in through `DocumentTitleSlot`.
  - The toolbar's `PageSetup` (a `ui/Popover`): format, orientation, and top/bottom margin fields that keep a draft.
  - `page/Ruler`, in the sheet's column, so it lines up by construction. It sticks under the header and holds the margin triangles and the first-line indent bar; the pure helpers are in `rulerGeometry.ts`.
  - Layout model `{ page, typography }`: `src/lib/pageFormats.ts`, `typography.ts` and `layout.ts` (`toLayout` fits on read, `parseLayout`); the `fitLayoutOnChange` hook fits on write.
  - `page/LayoutProvider` (`useAutosave`, functional `change`, saver `SAVERS.layout`); action `saveLayout`.
  - `editorFocus.ts` shares the open document's editor with these tools, so dragging keeps the caret and the popover returns the focus.
  - The indent is `text-indent` on body paragraphs (`--first-line-indent`).
  - The old `page_first_line_indent` column was dropped by hand in dev (it held only zeros).
- **Toolbars (merged: PR #3)**: menu bar (`header/MenuBar.tsx`) and style toolbar (`header/StyleToolbar.tsx`), sharing `useToolbarActions` (`toolbarActions.ts`) and `toolbarLabels.ts`; state from `useToolbarState`; `$` helpers in `editor/formatting.ts`; undo/redo availability from our own `editor/plugins/HistoryPlugin.tsx` + `editor/history.ts` store (no deprecated CAN_UNDO/CAN_REDO); `ui/Menu` extended (groups, kinds, shortcuts, focusable disabled items, onCloseInPlace); named `--layer-*` tokens.
- **Branch `fix/polish` (in progress, small fixes the user lists)**: 6e60053 synonyms panel folds (cookie `SYNONYMS_HIDDEN_COOKIE`) and folds on its own without room (`sideRoom.ts`, pure `panelFits`), opening over the page as a drawer.
- Next milestones: M1b (rest: "no indent after a heading" option), M2 text styles, M3 fonts, M5 book view, M6 editable spread.

## Wider roadmap the user wants (for context)

Google sign-in, Google Drive export (scope `drive.file`, one Google Cloud verification for both), page formats / pagination / styles toolbar / font choice in the editor, PDF export, email provider (verification, password reset), per-IP rate limiting, Stripe for Pro, legal pages, Payload migrations + hosting. CRISCO synonyms (crisco4.unicaen.fr) are better but require a university licence: never scrape them.

## Working style

- Before a big feature, ask the few questions that change the design, then propose a short plan.
- Commit with clear messages ending with the Co-Authored-By line your harness requires; only commit/push when the user asks.
- Report outcomes honestly (what was verified, what was not).

## Polish follow-up (`fix/polish`)

- `POLISH_REVIEW.md` preserves the review inventory and records implementation/defer decisions.
- Menu definitions use `header/menuBarMenus.ts`; reusable buttons are in `header/ToolButton.tsx`.
- `document/useDocumentText.ts` owns text persistence and cache reconciliation; `DocumentEditor` composes the UI and saver registrations. `SynonymResults.tsx` renders dictionary groups separately from panel/search interactions.
- Shared ownership access is in `src/access/ownedByUser.ts`; Payload title validation is in `src/collections/validators.ts`. Word normalization is independent of dictionary parsers. Numeric helpers are in `src/lib/numbers.ts`.
- `fetchDocument.ts` owns HTTP loading and response validation. Missing/forbidden Payload lookups use `nullIfUnreadable`; other errors propagate. Cache eviction follows oldest confirmation, not a true LRU policy.
- Failed localStorage writes remain available to all same-tab subscribers and after remounts. Menu scroll listeners are removed when menus close or unmount.
- Action tones and native popover surfaces are shared. Saver keys live beside the save registry; time and HTTP constants have explicit modules.
- Run integration and browser suites sequentially: both cleanup routines use the same test-account prefix.

### Latest polish validation

- TypeScript (including unused code checks): passes. Unit tests: 257/257. Integration tests: 53/53.
- Lint: zero errors, one existing `aria-selected` warning on the navigation tree (`aria-current` is its model).
- Full browser run: 238 passed, 4 intentionally skipped print cases, one Chromium menu timing failure. The test now waits for focus to enter the menu before Escape and for closure before typing; all 9 repeated checks of that scenario pass across Chromium, Firefox and WebKit. The full suite was not repeated after this test-only change.
- Screenshots of home, language menu, editor File menu and Page setup were inspected; temporary scripts were removed.
