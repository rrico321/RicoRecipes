# Phase 1 — Discussion Log

**Date:** 2026-05-14
**Mode:** discuss (default)

## Areas Presented

1. App scaffolding scope **(selected)**
2. Vercel project layout (not selected — defaulted in CONTEXT.md `<open_decisions>`)
3. MCP smoke endpoint definition (not selected — defaulted)
4. CI gates + Neon branching (not selected — defaulted)

## Area 1: App scaffolding scope

**Q1: How much do the not-yet-needed apps/packages actually do in Phase 1?**
- Options: Thin stubs (rec) / Real shells / MCP-only with roadmap amendment
- User: "I'm not sure"
- Claude expanded tradeoff inline (pipeline-proving vs over-design vs roadmap-amendment cost), recommended thin stubs, then re-asked.

**Q2: Confirm thin-stubs approach.**
- Options: Yes — thin stubs (rec) / Real shells for mcp + web / Thin stubs but skip mobile
- User: "Sure" → locked thin stubs.

**Q3: How should apps/mcp and apps/web relate as Next.js apps?**
- Options: Two separate Next.js apps (rec) / Single Next app with MCP mounted / Standalone Node MCP service
- User: "What do you recommend"
- Claude recommended two separate Next.js apps and locked it (independent blast radius, cleaner withMcpAuth, matches roadmap dependency graph).

## Deferred Ideas

None — discussion stayed inside Phase 1 scope.

## Claude's Discretion (defaults applied)

The three unselected gray areas were defaulted in `<open_decisions>` with reasoning:
- Vercel project layout → separate Vercel project per deployable app.
- MCP smoke endpoint → mcp-handler with zero tools + separate `/api/health` for the criterion-4 smoke check.
- CI gates / Neon branching → GitHub Actions for the three gates; no Neon branching until Phase 2.
- Bonus: env var workflow → `vercel env pull` + committed `.env.example`. Turborepo remote cache → enable from day 1.

Planner should revisit these only if Phase 1 planning surfaces a concrete reason to choose otherwise; otherwise treat as locked.
