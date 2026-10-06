# Polish review

Review of the initial `fix/polish` working tree, including its uncommitted and untracked files.
No `develop` reference exists locally or among the known remote branches; the available base
is `main` at `43754df`. The branch contains `6e60053` plus the working-tree changes.
This is a cleanup inventory, not a list of confirmed runtime regressions. Recommendations
that change behavior are identified separately. The inventory below records the initial review;
the implementation status lists the follow-up changes.

Paths below are relative to the repository root. For brevity:

- `front/` means `src/app/(frontend)/`.
- `editor/` means `src/app/(frontend)/compositions/[id]/_components/`.

## Implementation status

The follow-up preserves the pre-existing working tree and focuses on small, reviewable
refactors. Implementation and validation were completed before committing.

| Items | Status   | Outcome                                                                                                                                                                                                                 |
| ----- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01–08 | Done     | Menu builder wired; unused declarations removed; owner access, title validation, word normalization, corner styles and numeric helpers shared; margins fitted once.                                                     |
| 09    | Done     | Menu scroll listeners follow the open lifecycle; native popover surface styles shared. A generic popover lifecycle hook was unnecessary.                                                                                |
| 10    | Done     | Failed localStorage writes have a shared in-memory fallback for the visit, including remounts and updates from other tabs.                                                                                              |
| 11–12 | Done     | Navigation owns the save-before-switch sequence; document text persistence lives in `useDocumentText`.                                                                                                                  |
| 13    | Done     | Import sources are validated before initializing Payload; user-access arguments are narrowed without casts.                                                                                                             |
| 14    | Partial  | The web-stream cast names the exact Node adapter type. The generic Payload-to-Postgres assertion remains documented at the adapter boundary.                                                                            |
| 15    | Done     | Missing or forbidden records return null; infrastructure errors propagate. Transaction initialization is inside the move action's error handling.                                                                       |
| 16    | Done     | HTTP loading extracted from the store and its response checked. Eviction is documented as oldest confirmation, without changing the policy to LRU.                                                                      |
| 17–22 | Done     | Linear grouping and membership; constants with their owners and units; CSS-owned opacity and stagger values; shared dictionary language and action tone.                                                                |
| 23–25 | Retained | Existing enum-style constants, internal guards, small wrappers and the optional Popover trigger remain where further abstraction or API churn would bring little benefit.                                               |
| 26    | Partial  | Text persistence, synonym result rendering and toolbar buttons extracted. BinderProvider remains the cohesive owner of its state.                                                                                       |
| 27    | Partial  | Composition autosave waits for actual persistence; typing after Escape waits for the menu to close. Large pagination helpers remain grouped around the geometry reader; broader test helper reorganization is deferred. |
| 28    | Partial  | Collection unit fixtures now use valid UUIDs. Assertions at intentional test boundaries remain explicit.                                                                                                                |
| 29–30 | Done     | Lint uses the installed Next flat configs; obsolete pnpm metadata removed; README and handoff updated.                                                                                                                  |

Meaningful regression tests cover unavailable storage, failed writes shared across consumers,
menu listener cleanup, navigation save sequencing and invalid document responses.

## First batch: concrete duplication and unfinished cleanup

### 01. Finish the menu definitions extraction

**Files:** `editor/header/MenuBar.tsx`, `editor/header/menuBarMenus.ts`.

`menuBarMenus.ts` exports an unused builder containing the same menus still defined inside
`MenuBar`. `MenuDefinition` is also declared in both files. Wire the existing builder into
the component and remove the inline definitions, keeping focus, refs and navigation in
`MenuBar`. This is the clearest unfinished refactoring in the working tree. The builder
does not need a more generic menu configuration framework.

### 02. Remove two unused test declarations

**Files:** `tests/e2e/fixtures.ts:7`, `tests/e2e/admin.e2e.spec.ts:8`.

`cleanupTestUsers` is imported but unused in the fixtures; global setup already calls it.
The admin test has an unused `testInfo` argument. Both were confirmed by TypeScript with
`--noUnusedLocals --noUnusedParameters`. Remove them and keep unused-code checking available
through lint or a dedicated check.

### 03. Share the identical owner access rule

**Files:** `src/collections/Compositions/access.ts`, `src/collections/BinderItems/access.ts`.

`ownCompositions` and `ownBinderItems` have identical implementations: refuse anonymous
requests, otherwise filter by `owner`. A shared `ownedByUser` access function in `src/access/`
would express the policy once. Keep `canAddToComposition` separate: it checks ownership
through another collection and has a different responsibility. Preserve access tests.

### 04. Give the shared title validator a neutral home

**Files:** `src/collections/Compositions/validators.ts`, `src/collections/BinderItems/index.ts`.

BinderItems imports its title validator from Compositions even though the validator has no
composition-specific behavior. Move the Payload-specific adapter to a shared collection/field
validation module. Keep `src/lib/titles.ts` free of Payload dependencies; `cleanTitle` and
the Payload field validator have different jobs.

### 05. Move word normalization out of the myThes parser

**Files:** `src/lib/thesaurus/mythes.ts:29`, `src/lib/thesaurus/kaikki.ts:1`,
`front/_features/lexicon/query.ts:1`.

The Kaikki parser and application query normalization depend on a function housed in the
myThes parser. Move `normalizeWord` to a small shared thesaurus module. This makes dependency
direction match the domain and avoids importing a source-specific parser for general word handling.

### 06. Share the corner menu trigger styles

**Files:** `front/_components/ui/AccountMenu/AccountMenu.module.css`,
`front/_components/ui/LanguageMenu/LanguageMenu.module.css`.

The round trigger, hover/open state, transition and focus ring are almost identical.
Extract a shared CSS class for the corner trigger, leaving flag typography, account icon
and email styles local. A new configurable React component is unnecessary for this duplication.

### 07. Reuse the existing numerical primitives

**Files:** `front/_components/editor/pagination/pageGeometry.ts`, `src/lib/pageFormats.ts`,
`src/lib/typography.ts`, `src/lib/binder/tree.ts`,
`front/(home)/_components/LyreButton/useLyrePluck.ts`.

`clamp` already exists locally in page geometry, while the same `Math.min(Math.max(...))`
expression is repeated in four other modules. `finite`, a general unknown-to-number check,
is exported from `pageFormats` and imported by typography. A very small `src/lib/numbers.ts`
would be a reasonable home for these two primitives. Keep rounding and domain-specific
bounds with pages and typography; do not turn this into a general math library.

### 08. Avoid fitting page margins twice on read

**Files:** `src/lib/layout.ts:26`, `src/lib/pageFormats.ts` (`toPageSettings`).

`toLayout` calls `toPageSettings`, which fits margins, then calls `fitLayout`, which fits
them again before fitting typography. Let one layer own the normalization sequence. This
is mostly a clarity improvement; preserve the existing rounding, defaults and invalid-layout tests.

## Targeted refactorings and behavior-related smells

### 09. Put the menu scroll listener under an explicit lifecycle

**File:** `front/_components/ui/Menu/Menu.tsx:94`.

`hide` is recreated on each render. Opening registers that render's function as a scroll
listener; closing after a render removes the latest function, which need not be the one
registered. There is also no explicit unmount cleanup for this listener. Tie subscription
to an effect or another stable lifecycle with the same callback for registration and removal.
This is a concrete lifecycle concern from static inspection, not a browser-tested failure.

`Menu` and `Popover` also repeat live popover state reconciliation, placement and trigger
focus bookkeeping. Consider a small shared hook only after defining the common lifecycle;
keep menu keyboard navigation and panel control behavior separate. Their CSS surface and
entry/exit transitions are another concrete duplication suitable for a shared CSS module.

### 10. Resolve the storage hook's misleading fallback contract

**File:** `front/_hooks/useStoredState.ts`.

The opening comment promises that unavailable storage leaves a preference working for the
visit. In fact, `fallback` never changes and a failed `setItem` only notifies listeners;
the next read still produces the old value. Either implement a small in-memory fallback or
document the actual behavior. Preserving an interactive preference during storage failure
is the more useful behavior and deserves a focused test. Avoid adding a storage abstraction
framework for this one hook.

### 11. Give document navigation a single owner

**Files:** `editor/binder/state/useBinderCommands.ts:85`,
`editor/binder/state/useOpenDocument.ts`.

Commands perform `flushAll`, show the save-failure toast and update browser history.
The pathname hook observes that update and performs another `flushAll` before changing the
open document. Browser back/forward needs a guard too, but the same navigation policy now
lives in two places. Consolidate the save-before-switch decision and history handling while
keeping explicit support for back/forward, deletion (`replace`) and failed saves.
This needs navigation E2E coverage; a generic router wrapper would be excessive.

### 12. Extract document persistence and reconciliation from rendering

**File:** `editor/document/DocumentEditor.tsx:56`.

`DocumentPage` registers the editor, saves text and title, updates the cache and binder,
tracks the shown version, reconciles incoming text, clears history, registers savers,
portals the title and renders the page. A document-specific hook for text persistence and
incoming-version reconciliation would leave a readable composition of title and page UI.
Keep the cache/version rules together so extraction does not split their invariant across hooks.

### 13. Validate import arguments before initializing the database

**File:** `scripts/import-thesaurus.ts:94`.

`process.argv[2] as ThesaurusSource` claims validation that never happens. A typo such as
`wiktionnary` falls through the branches and imports both sources, replacing their data.
Parse the supported source values before `getPayload`, fail with usage on an unknown value,
and make the selected source flow explicit. This is a behavior correction, not just cast removal.

`scripts/set-user-access.ts` similarly indexes `ALLOWED` through casts. A checked field and
value parser would make the accepted CLI input explicit without unsafe indexing.

### 14. Isolate the importer's external type boundaries

**File:** `scripts/import-thesaurus.ts:38` and `:76`.

The importer mixes CLI dispatch, HTTP streaming, parsing and SQL replacement, with
`as unknown as PostgresAdapter`, `response.body as never`, and unchecked `JSON.parse`
passed to a typed Kaikki parser. Retain a small orchestration script and isolate the adapter
and download/stream boundaries. Investigate the actual adapter and stream typings before
replacing casts; a made-up guard would only conceal the same assumption.
The `type Row = ThesaurusEntry` alias adds no distinction and can be removed directly.

### 15. Make error policies explicit at the data boundary

**Files:** `front/_features/binder/queries.ts`, `src/collections/BinderItems/hooks.ts`,
`front/_features/binder/actions.ts`, `front/_features/compositions/actions.ts`.

`findDocument` distinguishes missing/forbidden records from infrastructure failures, while
`getBinder`, owner lookup and deletion lookup broadly catch errors and return `null`.
That can label a database failure as a missing record or silently skip work. Apply an explicit
policy to each lookup; only factor a helper where the policies really match.

Action `try/catch -> ActionResult` blocks are repetitive but not sufficient reason to invent
a generic CRUD layer. A narrower issue is transaction setup outside the move action's
`try` block: decide which errors the action converts and which it deliberately propagates.

### 16. Clarify the document cache's transport and eviction contracts

**Files:** `front/_features/binder/documentStore.ts`,
`front/_features/binder/documentCache.ts`, `front/_features/binder/constants.ts`.

The store combines subscription, cache mutation, in-flight deduplication, fetching and
session-expiry navigation. The HTTP loader is a plausible extraction because its error and
redirect behavior differs from cache bookkeeping. Its declared response type currently
rests on `response.json()`'s unchecked value, and session expiry returns a promise that never
settles. Make that terminal navigation behavior explicit when defining the transport contract.

The cache is described as least-recently-used, but order changes on `setSlot`; opening a
fresh cached document returns without touching its position. Either describe eviction as
oldest-updated-first or implement access-based recency deliberately. Do not add an LRU library.

### 17. Replace repeated array copying and membership scans in tree grouping

**Files:** `src/lib/binder/tree.ts:82`, `front/_features/binder/queries.ts` (`firstDocuments`),
`src/lib/thesaurus/kaikki.ts` (`createKaikkiCollector`).

Several grouping loops rebuild a growing array with `[...previous, item]` on each insertion.
`descendantIds` also uses `found.includes` on every visit. Local mutable arrays inside these
pure calculations, and a separate visited `Set`, are simpler and avoid quadratic work.
Keep traversal order and cycle protection unchanged. There is no need to introduce a generic
tree traversal framework or memoize every tree operation.

## Constants, types and the right amount of abstraction

### 18. Organize constants by ownership rather than by syntax

**Files:** `front/_lib/constants.ts`, `front/_components/editor/constants.ts`,
`editor/binder/constants.ts`, `front/_components/ui/Feedback/constants.ts`.

The global frontend file combines unit conversion, preference lifetime and HTTP status codes.
Editor constants combine formatting defaults with persisted page-break and DOM markers.
Binder constants combine drag/drop operations with save registry keys. These have different
owners. Prefer domain modules such as preferences, page-break definitions and save registry
keys, or colocate a value with its only consumer.

For example, a separate file solely for `TOAST_DURATION` is not intrinsically cleaner than
a named constant next to `Toast`. Shared page geometry constants are useful and should stay
shared. Do not mechanically move every constant to a `constants.ts` file.

### 19. Expose units and genuine animation parameters

**Files:** `front/_hooks/useAutosave.ts`, `front/_components/editor/history.ts`,
`front/_components/ui/Feedback/constants.ts`,
`front/(home)/_components/LyreButton/useLyrePluck.ts`,
`front/(home)/_components/LyreButton/geometry.ts`, `editor/SynonymsPanel.module.css`.

Use consistent unit-bearing names for delays and durations: `AUTOSAVE_DELAY_MS`,
`MERGE_DELAY_MS`, `TOAST_DURATION_MS`; the lyre uses seconds and frequency, so name those
accordingly. The bisection loop's `30` iterations is an actual algorithm parameter worth
naming. The synonyms animation's `min(--position, 30) * 12ms` hides a stagger cap and step;
local custom properties would explain those choices without enlarging global tokens.

Keep SVG coordinates, mathematical coefficients, array offsets and ordinary `0`/`1`
inline where their meaning is already clear. Replacing these with names would add noise.

### 20. Remove values that must be kept in sync across JS and CSS

**Files:** `front/(home)/_components/LyreButton/useLyrePluck.ts`,
`front/(home)/_components/LyreButton/LyreHalf.module.css`,
`front/_components/ui/HomeLink/HomeLink.tsx`, `front/_styles/tokens.css`.

String rest opacity is `0.65` in JS and CSS, explicitly documented as needing to match.
Make a single value drive both, for example through a custom property supplied with the
animation's opacity. `LOGO_SIZE = 28` similarly claims to represent `--control-size: 1.75rem`,
but is an independent pixel size. Let CSS own displayed size while image dimensions describe
the image's aspect ratio/intrinsic sizing.

The identical primary focus ring appears across many CSS modules. Shared focus color/width
tokens are reasonable; retain local offset and shape when the control requires them.

### 21. Give thesaurus policy values a clear shared boundary

**Files:** `src/lib/thesaurus/types.ts`, `src/lib/thesaurus/kaikki.ts`,
`scripts/import-thesaurus.ts`, `front/_features/lexicon/{constants,compose,lexicon}.ts`,
`editor/SynonymsPanel.tsx`.

French is selected independently in the importer, lookup, Kaikki filter, collection default
and rendered word language. A named current dictionary language can express this application
policy while keeping source-format checks explicit. The Kaikki word-length limit and query
length limit both equal `60`; decide whether they are one product rule before merging them.

`MORE_PER_GROUP` is extracted, but `MIN_SHARED_WITH_CURATED` remains exported from the composer
and the `4 * MORE_PER_GROUP` lookup budget lives elsewhere. Keep composition/coherence policy
together, and give the lookup budget multiplier a meaningful explanation. `SESSION_COOKIE`
is also already defined in app code while E2E fixtures repeat `'payload-token'`.

### 22. Remove real type duplication and gratuitous aliases

**Files:** `front/_components/ui/Button/Button.tsx`,
`front/_components/ui/Feedback/ConfirmProvider.tsx`, `front/_components/ui/Menu/types.ts`,
`editor/binder/types.ts`, `editor/SynonymsPanel.tsx`.

The same `'default' | 'danger'` action tone is redeclared in buttons, confirmations and menus.
A shared action tone is reasonable. Toast tones are a different concept and should not be
merged just because they share a literal.

`DropOperation = Operation` adds only a rename; either use the library type directly or make
the application type genuinely express its supported subset. `SynonymResult['more'][number]`
in `GroupsProps` can use the existing `SynonymGroup` name instead. Remove the duplicated
`MenuDefinition` through item 01.

### 23. Reassess blanket enum conversion

**Files:** `front/_components/editor/types.ts`, `front/_hooks/types.ts`,
`front/_features/lexicon/types.ts`, `front/(home)/_components/LyreButton/types.ts`,
`editor/page/types.ts`, `editor/EditorShell.tsx`.

The branch converts several literal unions to runtime enums, while other comparable states
remain literal unions or const-derived types. Enums provide named values, but do not by
themselves remove duplication or validate external input. Agree on a convention and apply
it where shared named values make code easier to read; converting every two-value local
choice is optional churn. Keep `as const` distinct from unsafe `as SomeType` assertions.

### 24. Avoid replacing assertions with weaker implicit assumptions

**Files:** `src/lib/guards.ts`, `front/_components/editor/storedContent.ts`,
`src/lib/binder/tree.ts:62` and `:145`, `front/_features/binder/actions.ts:83`.

`isRecord` and `isObject` repeat the same non-null object test but advertise different types;
both accept arrays. Define the intended object/JSON-object contract and reuse the appropriate
guard, without pretending the shallow check validates a whole serialized editor document.

`inReadingOrder` silently skips a missing entry even though the tree and map came from the
same items. `planMove` mixes `was?.parent` and `was.position`, relying on short-circuiting.
Prefer a structure that retains the original item alongside the placement and makes its
presence evident, instead of adding defensive branches for impossible internal states.

The Payload creation cast reflects hook-populated required fields. Treat it as an external
typing boundary: investigate a suitable input type or narrow adapter rather than adding
fake owner/position values merely to silence TypeScript.

### 25. Reduce low-value wrappers and unused API options

**Files:** `front/_components/editor/storedContent.ts`,
`front/_components/ui/Popover/Popover.tsx`, `front/_lib/constants.ts`.

`toEditorStateJson` only delegates to `JSON.stringify`; its value is a named boundary, not
extra validation. Keep it only if that convention improves the two call sites. `MS_PER_SECOND`
in a global bucket does not justify creating a general constants registry.

`Popover` currently only serves PageSetup through `ref` and `anchor`, but retains a complete
optional trigger-button path (`trigger`, `triggerClassName`, `onTriggerPointerDown`). If
there is no intended near-term caller, removing that unused path would simplify its API
and focus state handling. This is optional scope reduction, not a requirement for correctness.

### 26. Split large UI files only at meaningful boundaries

**Files:** `editor/header/StyleToolbar.tsx`, `editor/SynonymsPanel.tsx`,
`editor/EditorShell.tsx`, `editor/binder/state/BinderProvider.tsx`.

`StyleToolbar` contains reusable control behavior (`ToolButton`), a block-style menu and
the toolbar composition. Moving the control primitive into an adjacent file is reasonable.
`SynonymsPanel` mixes search/copy orchestration, announcements, result groups and attribution;
extracting result rendering would leave a clearer panel. `EditorShell` could separate its
provider composition from `Desk` if those continue to grow.

These are lower-priority readability choices. `BinderProvider` already delegates commands,
navigation and save registration: its remaining composition is not evidence that it needs
several more providers. Likewise, the pure pagination math and DOM measurement split is
useful; avoid breaking each tiny local helper into its own file.

## Tests, tooling and project documentation

### 27. Make E2E helpers reflect shared editor behavior

**Files:** `tests/e2e/toolbar.e2e.spec.ts`, `tests/e2e/pageSettings.e2e.spec.ts`,
`tests/e2e/paginationHelpers.ts`, `tests/e2e/compositions.e2e.spec.ts`.

Toolbar tests are 608 lines and include selection manipulation, saved-content reading,
locators and scenarios. Split helper responsibilities from scenario files, or split menu-bar
and style-toolbar scenarios, while retaining readable tests. Several non-pagination suites
import `openDocument`, hydration and selection helpers from `paginationHelpers`; move only
these shared editor helpers to a neutrally named module.

The `SAVED` timeout policy is duplicated in toolbar and page settings tests. The compositions
test still waits a fixed `1500ms` before reload; poll persisted state instead. Share wait
policies and seeding helpers, not all literal expected values. Tests for geometric output
and boundary values should keep independent expectations.

### 28. Clean test assertions according to their purpose

**Files:** `tests/e2e/{binderHelpers,paginationHelpers,toolbar.e2e.spec,pageSettings.e2e.spec}.ts`,
`tests/int/{binder,documentContent}.int.spec.ts`, `tests/unit/collections/compositions.unit.spec.ts`.

Ordinary setup repeats hook-populated Payload casts and DOM non-null assertions. Typed
seed helpers and explicit failures at DOM lookup boundaries would improve failure messages.
Keep evaluation helpers compatible with Playwright's browser serialization.

Assertions used to deliberately send malformed values are part of negative tests and should
not be removed indiscriminately. The collection unit helper still models a user ID as a
number despite the application using UUID strings; use the existing UUID test helper for
ordinary valid fixtures, reserving invalid IDs for tests that explicitly cover them.

### 29. Finish the repository tooling cleanup

**Files:** `eslint.config.mjs`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`.

Lint is documented as broken and imports `@eslint/eslintrc` without declaring it directly.
Review the installed Next ESLint configuration and restore a working command; do not assume
adding one dependency is the whole fix. The stricter unused-code check found only the two
test declarations in item 02, so enabling that check is a manageable follow-up.

The installed pnpm reports `package.json#pnpm.onlyBuiltDependencies` as ignored, while
`pnpm-workspace.yaml` already has an `allowBuilds` list. Choose the supported package-manager
version/configuration and remove the obsolete duplicate setting. This also avoids two lists
that already differ (`workerd` appears only in the workspace configuration).

### 30. Refresh documentation and remove misleading comments

**Files:** `README.md`, `HANDOFF.md`, `package.json`, `front/_features/binder/queries.ts`,
`tests/e2e/compositions.e2e.spec.ts`, `vitest.setup.ts`.

README still describes the Payload blank template and MongoDB/S3 setup; package metadata
also describes a blank template. Document actual Postgres setup, required environment
variable names, commands and test prerequisites without including secret values.

HANDOFF still refers to `documentDrafts.ts` and `pageAttributes.ts`, and does not describe
the current uncommitted cleanup. Update it after the branch settles. `findDocument` has two
adjacent comments saying almost the same thing; the compositions E2E comment still describes
two redirects although creation now redirects directly to the first document. Remove stale
template comments such as the placeholder in `vitest.setup.ts`.

## Suggested order and limits

1. Finish the menu extraction; remove unused declarations; share exact duplicated access,
   validation and CSS; tidy the tooling.
2. Handle behavior-related items independently: storage fallback, menu listener lifecycle,
   import argument validation, then navigation and document synchronization.
3. Revisit constant ownership, types and UI file boundaries with one consistent convention.
4. Refresh documentation after the intended changes are complete.

Do not extract every string (`Enter`, ARIA roles, Payload collection slugs) into an enum,
merge unrelated limits merely because their numbers match, or build generic action/store/menu
frameworks for the current small set of cases. Server and client validation can both be
necessary; deduplicating their implementation must not remove a trust boundary. Keep
existing pure calculation modules and independent test expectations.

## Initial review verification

- Read the application, collection, shared library, script and test areas referenced above.
- Checked references to confirm that `menuBarMenus` has no consumer.
- Ran `pnpm exec tsc --noEmit --noUnusedLocals --noUnusedParameters --incremental false`:
  it reported only the two unused declarations in item 02.
- Runtime observations in this document are based on code inspection. No database imports,
  integration tests, browser suite or application changes were run for this review.

## Follow-up verification

- TypeScript passes with unused-local and unused-parameter checks enabled.
- 257 unit tests pass in 45 files, including the new storage, menu, navigation and HTTP tests.
- Lint exits successfully with one existing accessibility warning: the navigation tree uses
  `aria-current` without a selection model, while the lint rule expects `aria-selected`.
- Invalid thesaurus source arguments stop with usage before Payload initialization.
- Playwright screenshots of the home page, language menu, editor File menu and Page setup
  surface were inspected after their transitions completed. The scratch runner stays outside
  the repository. Scratch scripts were removed after inspection.
- 53 integration tests pass in 6 files against local Postgres.
- The initial full browser run completed with 238 passing tests, 4 intentionally skipped
  printing tests (Firefox/WebKit), and one Chromium failure while typing after closing Edit.
  Three isolated Chromium reruns passed, but a repeated cross-browser run reproduced Escape
  being sent before the opening toggle had moved focus into the menu. The test now waits for
  Undo to be focused before Escape, then for the menu to close before typing. Waiting for
  closure alone did not resolve the race. No application history behavior was changed.
- After the focus and closure waits were added, the corrected scenario passed all 9
  repeated checks: 3 each on Chromium, Firefox and WebKit, with Playwright traces enabled.
  The full suite was not rerun after this test-only synchronization change.
