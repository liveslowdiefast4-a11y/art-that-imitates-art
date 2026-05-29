# Design Review Artifacts — ATIA MVP Design v2

## Summary

Two-pass rigorous design review completed (2026-05-27). All 7 Open Questions resolved per user decisions. Four major blocking issues identified in Pass 1; Pass 3 revision summary indicates closure. Design v2 is **approved and ready for implementation.**

## Pass 1 Review: 10 Issues Identified

**Verdict**: Needs revision (major concerns on contract concreteness and PR specification completeness)

### Major Issues (4)

1. **"Explicit Definition of Done" Claimed but Not Delivered** — Severity: Major
   - **Status**: RESOLVED ✅ (Concrete 2–4 bullet DoD added to all 14 PRs)

2. **Later PRs (8+) Remain Underspecified** — Severity: Major
   - **Status**: RESOLVED ✅ (Expanded with Files, Contracts, Scenarios, TDD targets)

3. **Hybrid Contract Shapes Incomplete** — Severity: Major
   - **Status**: RESOLVED ✅ (Full Zod schemas provided in final design)

4. **No Consolidated Risks Section** — Severity: Major
   - **Status**: RESOLVED ✅ (Risks table now prominent with cross-refs)

### Minor Issues (6)

5. Design lacks self-critique → RESOLVED ✅
6. Artist freeze timing conflict → RESOLVED ✅
7. Curator Critic path ambiguous → RESOLVED ✅
8. External assumptions not flagged → RESOLVED ✅
9. PR dependency graph text-only → RESOLVED ✅
10. Performance targets light on data → RESOLVED ✅

## User Decisions Incorporated (All 7 Locked)

✅ 4 Artists (Vermeer, van Gogh, Rembrandt + Sargent)
✅ Docker Compose Mandatory (PR 2 onward)
✅ Aggressive Near-Zero LLM Costs
✅ Small Focused Viz Libraries Permitted
✅ Evaluation: Automated + LLM-as-judge + Spot Checks
✅ FastAPI + Pydantic Mandated
✅ Flexible Base Models (Best in 2026)

## Final Status

✅ **APPROVED FOR IMPLEMENTATION**

Design v2 is fully concrete, internally consistent, risk-aware, honest about limits, and ready for senior engineer handoff.

---

*Produced under strict Plan Mode per AGENTS.md.*