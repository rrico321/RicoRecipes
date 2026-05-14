---
phase: 01-foundations
plan: 03
subsystem: ci-deploy-wiring
tags: [ci, github-actions, vercel, neon, turbo-remote-cache, preview-deploy]
requirements: [FOUND-02, FOUND-03, FOUND-04]
dependency_graph:
  requires:
    - Plan 01-01 (Turbo + pnpm task graph proven locally across 9 stubs)
    - Plan 01-02 (apps/mcp Next.js workspace with /api/health + /api/mcp/[transport])
  provides:
    - GitHub Actions four-gate CI on every PR (build/typecheck/test/lint via Turbo)
    - Vercel project `rico-recipes-mcp` with Root Directory = apps/mcp
    - Neon Postgres provisioned via Vercel-managed integration; DATABASE_URL + companion vars in Preview + Production scopes
    - Turbo remote cache wired (TURBO_TOKEN secret + TURBO_TEAM variable in GitHub Actions; local `turbo link` complete)
    - Public preview URL pattern `https://rico-recipes-mcp-git-<branch>-robert-ricos-projects.vercel.app` returning 200 to /api/health
  affects:
    - Phase 2 — Drizzle migrations target the same Vercel project's DATABASE_URL; Neon project is in place for branch-per-PR wiring
    - Phase 3 — Deployment Protection must be re-enabled together with Clerk MCP OAuth + `withMcpAuth` BEFORE any tool registers (T-03-05)
tech-stack:
  added:
    - "actions/checkout@v4"
    - "pnpm/action-setup@v3 (pnpm 10)"
    - "actions/setup-node@v4 (Node 22)"
    - "Vercel Git integration (auto preview deploys per PR)"
    - "Neon Postgres (Vercel-managed integration)"
    - "Turbo remote cache (Vercel-backed; free tier)"
  patterns:
    - "Four-gate CI = `pnpm turbo run build typecheck test lint` (ROADMAP success criterion #1 exercised in CI, not just claimed)"
    - "fetch-depth: 2 in actions/checkout (Turbo affected-graph requirement; RESEARCH.md Pitfall 7)"
    - "TURBO_TOKEN as Actions secret; TURBO_TEAM as Actions variable (NOT secret — Pattern 10)"
    - "Vercel-managed Neon integration auto-injects DATABASE_URL + 17 companion vars; no code reads them in Phase 1"
    - "One Vercel project per deployable app (apps/mcp only in Phase 1; apps/web + apps/cli get their own in Phase 4)"
key-files:
  created:
    - .github/workflows/ci.yml
  modified: []
decisions:
  - "Vercel project name: `rico-recipes-mcp` (team scope `robert-ricos-projects`)"
  - "Neon DATABASE_URL + 17 companion env vars scoped to Production + Preview only — Development scope intentionally NOT enabled in Phase 1 (no code reads DB in Phase 1; Phase 2 will add Development scope for local Drizzle work)"
  - "Vercel Deployment Protection (Hobby default: Require Login) disabled for Phase 1 to satisfy FOUND-04's 'public internet' clause — must be re-enabled in Phase 3 together with Clerk MCP OAuth + withMcpAuth"
  - "PR #1 squash-merged into main (branch deleted) — keeps history linear; the three CI iteration commits collapse into a single ci: commit on main"
metrics:
  duration: ~30 minutes (incl. Vercel + Neon + Turbo onboarding)
  tasks_completed: 3
  files_created: 1
  files_modified: 0
completed: 2026-05-14
---

# Phase 01 Plan 03: CI + Vercel + Neon Deployment Wiring Summary

One-liner: Closes Phase 1 by wiring GitHub Actions four-gate CI on every PR, linking `apps/mcp` to a Vercel project (`rico-recipes-mcp`) with Neon Postgres provisioned via the Vercel-managed integration, enabling Turbo remote cache, and proving FOUND-04 with a public-internet curl of `/api/health` against a real preview URL.

## What Was Built

**Task 1 — Vercel + Neon + Turbo onboarding (user-driven checkpoint; no committed artifacts):**
- GitHub repo confirmed: `https://github.com/rrico321/RicoRecipes` (main branch)
- Vercel project created via `vercel link --repo`: **`rico-recipes-mcp`** under team **`robert-ricos-projects`** (slug). Root Directory set to `apps/mcp` in Project Settings → Build and Deployment.
- Neon Postgres provisioned via Vercel Storage tab → Neon Postgres (Vercel-managed integration). `DATABASE_URL` + 17 companion env vars (`DATABASE_URL_UNPOOLED`, `PGHOST`, `PGUSER`, `PGDATABASE`, `PGPASSWORD`, `PGHOST_UNPOOLED`, `POSTGRES_*` legacy aliases, `NEON_PROJECT_ID`, etc.) propagated to **Production + Preview** scopes (NOT Development — see Deviations + Phase 2 hand-off).
- Local `.vercel/repo.json` created by `vercel link --repo` and confirmed gitignored (Plan 01-01 already excluded `.vercel/`).
- Turbo remote cache: `npx turbo login` + `npx turbo link` against `robert-ricos-projects` completed locally.
- GitHub Actions: `TURBO_TOKEN` set as a **repository secret**, `TURBO_TEAM` set as a **repository variable** with value `robert-ricos-projects` (after Deviation #1 fix below).

**Task 2 — Four-gate CI workflow (commit `86065e1`, then iterated `b5f8885` + `5f944cd`; landed on main as squash `bd71b8e` via PR #1):**
- `.github/workflows/ci.yml` (38 lines) — exact Pattern 10 shape:
  - `on: push` to main; `pull_request` opened + synchronize
  - Single job `ci` named `Build / Typecheck / Test / Lint`, timeout 15 min, ubuntu-latest
  - `env: TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}`, `TURBO_TEAM: ${{ vars.TURBO_TEAM }}`
  - Steps: `actions/checkout@v4` with `fetch-depth: 2` → `pnpm/action-setup@v3` (version 10) → `actions/setup-node@v4` (node-version 22, cache pnpm) → `pnpm install --frozen-lockfile` → `pnpm turbo run build typecheck test lint`
- All grep contracts from the plan's `<verify>` block satisfied: `fetch-depth: 2`, `TURBO_TOKEN`, `TURBO_TEAM`, `pnpm turbo run build typecheck test lint`, `pnpm/action-setup@v3`, `node-version: 22` all present.

**Task 3 — Public preview smoke (user-driven checkpoint, orchestrator-verified; no committed artifacts):**
- Preview URL produced by Vercel Git integration on PR #1:
  `https://rico-recipes-mcp-git-phase-01-ci-robert-ricos-projects.vercel.app`
- Public-internet curl (verified 2026-05-14 from outside the Vercel network):
  ```
  $ curl -fsS https://rico-recipes-mcp-git-phase-01-ci-robert-ricos-projects.vercel.app/api/health
  {"ok":true,"ts":1778782738319}
  HTTP 200
  ```
- Bonus MCP route check (proves `mcp-handler` is mounted, not just Next's 404 page):
  ```
  $ curl -i -X POST https://<preview>/api/mcp/foo
  HTTP/2 404
  Not found    # plain text — distinct from Next's HTML 404 ("This page could not be found.")
  ```
  The plan's "non-500" bar is met; Phase 3 will replace this with a real Streamable HTTP handshake.

## CI Gate Results

Three CI runs against PR #1 (https://github.com/rrico321/RicoRecipes/pull/1):

| Run | URL | Status | Cache Behavior |
|-----|-----|--------|----------------|
| 25874121947 | [run](https://github.com/rrico321/RicoRecipes/actions/runs/25874121947) | RED | Exposed `TURBO_TEAM`-as-secret bug (Deviation #1) |
| 25874204502 | [run](https://github.com/rrico321/RicoRecipes/actions/runs/25874204502) | GREEN | 40/40 cache MISS + WRITE (first write to remote cache) |
| **25874268374** | **[run](https://github.com/rrico321/RicoRecipes/actions/runs/25874268374)** | **GREEN** | **`FULL TURBO` — 40/40 cache HIT in 875ms (proves remote cache works end-to-end)** |

The third run (25874268374) is the canonical green gate: all four gates (`build`, `typecheck`, `test`, `lint`) ran across all 10 workspaces (apps/mcp's real `next build` plus 9 stub `echo skip`s), and cache hit-rate proves `TURBO_TOKEN` + `TURBO_TEAM` are wired correctly.

## Decisions Confirmed in Execution

1. **Vercel project per deployable app:** Only `apps/mcp` linked in Phase 1; `apps/web`, `apps/cli`, `apps/mobile` will get their own projects in Phases 4/5 (per CONTEXT.md soft default).
2. **Neon via Vercel-managed integration** (not direct Neon dashboard): keeps env-var injection automatic per environment scope and is the path Vercel's Storage UI recommends.
3. **`fetch-depth: 2`** in checkout: required for Turbo's affected-graph (RESEARCH.md Pitfall 7) even though we run all gates unconditionally in Phase 1 — sets the pattern for Phase 2+ when affected-only mode becomes useful.
4. **Build IS in the gate set:** `pnpm turbo run build typecheck test lint` (not just `typecheck test lint`) — the plan's revision pass 1 added `build` so ROADMAP success criterion #1 is actually exercised in CI, not just claimed.
5. **Squash-merge PR #1:** keeps main history linear; the three CI iteration commits (`86065e1`, `b5f8885`, `5f944cd`) collapse into single squash commit `bd71b8e`.
6. **TURBO_TOKEN = secret, TURBO_TEAM = variable:** per RESEARCH.md Pattern 10 and Turborepo docs. TURBO_TEAM is just the team slug (`robert-ricos-projects`) and is not sensitive; TURBO_TOKEN is a credential. The plan stated this explicitly and Deviation #1 below was an execution-time miss.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `TURBO_TEAM` was set as a GitHub Actions secret instead of a variable**
- **Found during:** Task 2, first CI run (`25874121947`) — Turbo failed to authenticate to the remote cache.
- **Issue:** The plan's Task 1 step 8 (and RESEARCH.md Pattern 10) explicitly call for `TURBO_TEAM` to be a repository **variable** (Variables tab), not a secret. During the user's manual GitHub UI setup, both were created in the Secrets tab. Workflow references `${{ vars.TURBO_TEAM }}`, so the value resolved to empty string and Turbo couldn't identify the team scope.
- **Fix:** `gh secret delete TURBO_TEAM && gh variable set TURBO_TEAM --body "robert-ricos-projects"`. Re-ran CI — passed (`25874204502`).
- **Files modified:** none (GitHub Actions settings only).
- **Commit:** n/a — settings change, not code.
- **Doc impact:** Future plan templates that send users to the GitHub Actions UI for `TURBO_TEAM` setup should phrase step 8 with explicit "**Variables tab, NOT Secrets tab**" emphasis. RESEARCH.md Pattern 10 is correct; the plan's wording was correct; the manual UI step was the error vector.

**2. [Rule 2 — Missing critical for Phase 1 success criterion] Vercel Deployment Protection blocked the public smoke check**
- **Found during:** Task 3 — `curl https://<preview>/api/health` returned `HTTP 401` with a Vercel SSO challenge page from a clean machine on a different network.
- **Issue:** Vercel Hobby projects ship with "Require Login" deployment protection enabled by default in 2026 (a posture change since the plan's threat model was written). T-03-06 in the plan was disposed as `accept — standard Vercel preview behavior`, but the standard behavior had changed: previews are no longer publicly reachable without auth. This breaks FOUND-04's "public internet" clause directly.
- **Fix:** User disabled the "Require Login" toggle in Vercel Dashboard → `rico-recipes-mcp` → Settings → Deployment Protection. Re-curled `/api/health` from an external network — got 200.
- **Files modified:** none (Vercel settings only).
- **Commit:** n/a — settings change, not code.
- **Phase 3 reminder (mandatory):** Re-enable Vercel Deployment Protection along with Clerk MCP OAuth + `withMcpAuth` BEFORE any MCP tool registers. This pairs T-02-02 (apps/mcp anonymous in Phase 1, acceptable because zero tools) with T-03-05 (preview URL exposes /api/mcp without auth, acceptable for the same reason). Once tools register, this surface is exploitable and protection must be back on, ideally combined with Clerk-issued tokens so the FOUND-04 smoke pattern (anonymous /api/health) can co-exist with auth-gated /api/mcp.

No architectural changes. Both deviations were configuration / posture issues, not code.

## Authentication Gates

None encountered during execution. Deviation #2 above is a *future* auth requirement (Phase 3) surfacing as a Phase 1 posture decision — not a Phase 1 auth gate.

## Threat Model Dispositions

All six T-03-XX rows from the plan's threat register remain at their planned disposition:

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-03-01 (TURBO_TOKEN in CI logs) | mitigate | ✓ GitHub Actions secret auto-masking confirmed in run logs |
| T-03-02 (DATABASE_URL leak via CI env dump) | mitigate | ✓ CI does not pull Vercel env vars; no `vercel env pull` step in the workflow |
| T-03-03 (malicious workflow PR against TURBO_TOKEN) | accept | Solo dev; revisit in Phase 5 or post-v1 |
| T-03-04 (.vercel/repo.json committed) | mitigate | ✓ `git check-ignore .vercel/repo.json` returns true |
| T-03-05 (anonymous /api/mcp on preview) | accept | Phase 1 mounts ZERO tools; Phase 3 lands `withMcpAuth` BEFORE any tool registers |
| T-03-06 (preview URLs guessable + indexable) | accept | Standard Vercel preview behavior; with Deployment Protection now disabled (Deviation #2), this is more exposed than the plan assumed — Phase 3 will reverse via Clerk-gated MCP + re-enabled Deployment Protection on non-/api/health paths |

## Threat Flags

None new. Deviation #2 widens T-03-06's exposure window but does not introduce new trust boundaries. Tracked for Phase 3 close-out.

## Known Stubs

None new. Phase 1's planned stubs (9 sibling workspaces from Plan 01-01) remain stubs by design; apps/mcp's empty tool-registration callback remains intentional per Plan 01-02 (Phase 3 surface).

## Notes for Phase 2

1. **Vercel project name for `DATABASE_URL`:** `rico-recipes-mcp` (team `robert-ricos-projects`). Phase 2's Drizzle migrations and service layer target this project's env vars.
2. **Neon project:** provisioned via the Vercel-managed integration. `NEON_PROJECT_ID` is set in Vercel env vars (encrypted; visible via `vercel env ls` but value not printed). Phase 2 can configure Neon branch-per-PR from the Vercel Storage tab → Neon project settings — the wiring point is in the Vercel dashboard, not in code.
3. **GAP — Development scope not enabled:** Phase 1 intentionally limited DB env vars to Preview + Production (no code reads them in Phase 1). Phase 2 will need to add the **Development** scope to `DATABASE_URL` + companion vars so local Drizzle (`drizzle-kit push`, `pnpm drizzle-kit migrate`) and any `pnpm dev` runs that touch the DB can succeed. Do this from Vercel Dashboard → `rico-recipes-mcp` → Settings → Environment Variables, or via `vercel env pull apps/mcp/.env.local` once Development scope exists.
4. **`vercel env pull` workflow:** still the recommended local-dev pattern (per CONTEXT.md soft default + RESEARCH.md). Phase 2's `apps/mcp/.env.local` should NOT be committed (Plan 01-01 already ignores `.env*.local`).
5. **Turbo remote cache is already working:** Phase 2's CI runs inherit the cache. Adding new tasks to `turbo.json` will populate the cache automatically.
6. **CI gates are wired:** `.github/workflows/ci.yml` is on main. Phase 2 PRs will trigger the same four-gate workflow with no additional CI plumbing.

## Notes for Phase 3 (Hard Constraint)

**Re-enable Vercel Deployment Protection BEFORE the first MCP tool registers.** The combination of:
- Anonymous `/api/mcp/[transport]` (currently safe because zero tools)
- Disabled Deployment Protection (Deviation #2, currently safe because no tools and no DB reads)

is acceptable for Phase 1 only. Phase 3's first task should:
1. Land `withMcpAuth` + Clerk MCP OAuth provider on `/api/mcp/[transport]`.
2. Re-enable Deployment Protection on the Vercel project (consider "Standard Protection" with bypass for `/api/health` if Vercel supports per-route exclusion, otherwise accept that the smoke endpoint becomes auth-gated post-Phase-3 and update the Phase-3 verification accordingly).
3. Re-run a public-internet smoke against `/api/mcp/[transport]` with a real Streamable HTTP `initialize` payload using Clerk-issued credentials.

## Commit Trail

| Commit | Task | Description |
|--------|------|-------------|
| `86065e1` | Task 2 | ci(01-03): add four-gate GitHub Actions workflow |
| `b5f8885` | Task 2 | ci(01-03): re-trigger CI to verify Turbo remote cache |
| `5f944cd` | Task 2 | ci(01-03): third run to confirm Turbo remote cache HITs |
| `bd71b8e` | Task 2 | ci: add four-gate GitHub Actions workflow (phase 01-03) (#1) — squash-merge of PR #1 onto main |

Tasks 1 and 3 produced no commits (user-driven dashboard / smoke verification).

## Self-Check: PASSED

- `.github/workflows/ci.yml` exists on main: FOUND (verified via `git show main:.github/workflows/ci.yml`)
- Grep contract on `ci.yml`: `fetch-depth: 2`, `TURBO_TOKEN`, `TURBO_TEAM`, `pnpm turbo run build typecheck test lint`, `pnpm/action-setup@v3`, `node-version: 22` — all FOUND
- PR #1 merged: FOUND (`gh pr view 1 --json state` → `MERGED`)
- Branch `phase-01/ci` deleted: FOUND (deleted by `gh pr merge --delete-branch`)
- Squash commit `bd71b8e` on main: FOUND in `git log`
- Three CI runs (25874121947, 25874204502, 25874268374) recorded: FOUND in PR #1 timeline
- Preview URL `https://rico-recipes-mcp-git-phase-01-ci-robert-ricos-projects.vercel.app/api/health` returned HTTP 200 + `{"ok":true,"ts":1778782738319}` from public internet: VERIFIED 2026-05-14
- Vercel project `rico-recipes-mcp` exists with Root Directory = apps/mcp: VERIFIED
- Neon DATABASE_URL + companions in Preview + Production scopes: VERIFIED via `vercel env ls`
- `.vercel/repo.json` is gitignored: VERIFIED (`git check-ignore .vercel/repo.json`)
