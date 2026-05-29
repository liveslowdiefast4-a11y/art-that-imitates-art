# ATIA MVP Design v2 (Executable Specification) — FINAL

**Author**: Grok-Build Elite Operator (documentation-writer skill active)  
**Date**: 2026-05-27  
**Status**: ✅ APPROVED — Ready for Phase 1 Implementation (PRs 1-2)  
**Based on**:
- `docs/archon/ARCHON_DESIGN_Art_That_Imitates_Art_v1.md` (Archon v1, immutable historical source)
- `README.md` (post-bootstrap user decisions, locked scope)
- `AGENTS.md` (sacred project standards: TS strict + Zod, Clean Architecture + DDD, TDD 90%+)
- 2026 ComfyUI API research + @saintno/comfyui-sdk + Vercel AI SDK + xAI structured outputs

**Scope Lock**: This document is the executable specification for the MVP slice. All future implementation must trace back to decisions and PR plan herein.

---

## Overview

Art That Imitates Art (ATIA) MVP delivers a **reliable, process-transparent faithful imitation system** for 4 historical oil masters (Vermeer, van Gogh, Rembrandt, John Singer Sargent). It does not perform generic style transfer. Instead, a hybrid Clean Architecture stack (TypeScript Next.js orchestration + Python/ComfyUI execution faculties) analyzes reference images through a Director and parallel Analysis Collective, enriches the request via a pre-computed Signature Library, then executes multi-stage technique simulation (layer ordering, glazing, regional handling, finishing) on a single RTX 4090/5090-class GPU, completing end-to-end in a target of <12 minutes (hard limit 15 min) while emitting machine-readable process traces for static visualization.

The MVP proves the core riskiest element identified in Archon v1: the Signature Library, plus the hybrid TS↔Python contract boundary. Success is defined as producing outputs that working artists and conservators recognize as demonstrating informed understanding of specific historical techniques and layering logic (not pastiche), with full auditability of the simulated process via static layer-order diagrams and traces.

---

## Key Decisions

### Decision 1: Hybrid Stack (TS + Python/ComfyUI)
TypeScript (Next.js + tRPC + Zod + Vercel AI SDK + @ai-sdk/xai) owns orchestration, reasoning, Director, Analysis, UI, and process docs. Python (FastAPI + Pydantic + ComfyUI) owns Execution Faculties.

### Decision 2: MVP Cuts (Strict User Scope Lock)
Faithful mode + 4 artists + static traces only. Realistic performance target with pre-computation and staged passes.

### Decision 3: Signature Library as File-Based JSON + Codegen
Git-tracked JSON files (simplicity, reproducibility). JSON Schema as SSOT with Pydantic/Zod codegen. De-risks #1 Archon risk early.

### Decision 4: 4 Artists
Vermeer, van Gogh, Rembrandt, John Singer Sargent (Sargent for bravura/loose brushwork contrast).

### Decision 5: Aggressive Near-Zero External LLM Costs
All development and PR 12 runs limited, heavily cached, smallest viable models only.

### Decision 6: Lighter Parallelism for Early Phase
In-process TS + HTTP to local Python service. Full isolation reserved for post-approval implementation PRs.

---

## 14-PR Implementation Roadmap

### **PR 1: Scaffold Next.js + Core TS Stack** (No dependencies)
**Goal**: Bootstrap production-grade TypeScript foundation.
**Risk**: Low | **Duration**: 1–2 days
**Definition of Done**:
- Strict TS + Zod + tRPC compiles; npm run typecheck + lint green
- Vitest suite runs; 90%+ coverage on lib/ stubs
- UI shell renders without errors
- Self-critique (≥6 points) + design reference in PR

---

### **PR 2: Python Execution Skeleton + Mandatory Docker Repro** (Depends on PR 1)
**Goal**: Establish reproducible dev environment with FastAPI + ComfyUI + validated contract echo.
**Risk**: Medium | **Duration**: 1–2 days
**Definition of Done**:
- `docker-compose up` brings healthy FastAPI (:8000/health) + ComfyUI (:8188/system_stats) within 2 min
- `/execute` endpoint echoes ExecutionRequest; contract roundtrip passes
- All subsequent PRs must use Docker (no native fallback)
- 90%+ coverage; self-critique (≥6)

---

### **PR 3: Signature Library v0 Schema + Seed** (No hard deps)
**Goal**: Complete Zod ArtistSignature schema + all 4 artists minimal viable seeds.
**Risk**: **HIGH** | **Duration**: 2–3 days
**Definition of Done**:
- Zod ArtistSignature + loader service (hot-reload dev); 90%+ coverage
- `signatures/v0/` index + complete minimal seeds for all 4 (deep Vermeer + Sargent; van Gogh/Rembrandt baseline)
- Roundtrip tests (TS Zod ↔ Pydantic) 100%; `docs/contracts.md` skeleton
- Self-critique (≥6) + scope clarified (this PR = loader + all 4 minimal; PR7 = enrichment)

---

### **PR 4: Core Execution Contracts + Bridge Validation** (Depends on PR 3)
**Goal**: Complete all hybrid contracts (ExecutionRequest, Brief, Plan, FacultyResult, ProcessTrace); JSON Schema codegen.
**Risk**: **HIGHEST** | **Duration**: 2–3 days
**Definition of Done**:
- Full ExecutionRequest, ArtisticBrief, ExecutionPlan, FacultyResult, ProcessTrace in lib/contracts
- JSON Schema exported as SSOT; Pydantic via codegen; roundtrip fixtures 100%
- `docs/contracts.md` + CI contract tests green
- 90%+ coverage; self-critique (≥6) + Risks table cross-ref

---

### **PR 5: tRPC Orchestration + Director Stub** (Depends on PR 1, 4)
**Goal**: Wire tRPC generate; implement Director + Analysis with @ai-sdk/xai + Zod.
**Risk**: Medium | **Duration**: 1–2 days
**Definition of Done**:
- tRPC generate fully wired; orchestrator invokes Director + Analysis (real or mocked)
- ArtisticBrief + Analysis match PR4 shapes; Zod validation in place
- Near-zero cost controls enforced; 90%+ coverage
- Error taxonomy + Pino logging; self-critique (≥6)

---

### **PR 6: Vermeer Technique Simulator Faculty (First Real Faculty)** (Depends on PR 2–5)
**Goal**: Python TechniqueSimulator; build + submit seeded ComfyUI workflow; end-to-end trace capture.
**Risk**: High | **Duration**: 2–3 days
**Definition of Done**:
- End-to-end tRPC → Vermeer faculty → ComfyUI → ProcessTrace + image artifact succeeds in Docker
- Timing report attached; trace sidecar validates against contract
- 90%+ coverage + integration; self-critique (≥6)
- Acceptance: Outputs demonstrate informed Vermeer technique

---

### **PR 7: Remaining Artists Seed Data** (Depends on PR 3)
**Goal**: Full enrichment signatures for van Gogh, Rembrandt, Sargent.
**Risk**: Medium | **Duration**: 1–2 days
**Definition of Done**:
- Enrichment utilities + full depth seeds for all 3 (on top of PR3 minimal)
- All 4 now production v0 depth; cross-validation tests pass; 90%+ coverage
- Explicit PR note: "PR3 = loader + minimal; this = enrichment depth only"
- Quality spot-checks pass; self-critique (≥6)

---

### **PR 8: Regional Copyists Faculty** (Depends on PR 6)
**Goal**: Masked regional execution; integrate with ExecutionPlan risk areas; merge results.
**Risk**: High | **Duration**: 2–3 days
**Definition of Done**:
- Regional Copyists decomposes + executes masked passes; results merge without artifacts
- Regional contract extensions validated; 90%+ coverage
- Self-critique (≥6) + design + Risks table cross-ref
- Acceptance: Vermeer run with ≥1 regional pass produces valid trace, timing < budget

---

### **PR 9: Master Finisher + Compositing Faculty** (Depends on PR 8)
**Goal**: Final synthesis, glazing simulation, layer assembly, complete ProcessTrace.
**Risk**: High | **Duration**: 2–3 days
**Definition of Done**:
- Full layer assembly + ≥1 glazing pass produces coherent final + complete ProcessTrace in Docker
- 90%+ coverage; all contracts roundtrip; self-critique (≥6)
- Acceptance: End-to-end (PR6+8+9) Vermeer < 11 min with trace matching signature primitives

---

### **PR 10: Curator Critic + Targeted Re-execution** (Depends on PR 9)
**Goal**: Critic (heuristic + lightweight primary; vision LLM optional + guarded). Retry loop (0–1).
**Risk**: Medium-High | **Duration**: 2–3 days
**Definition of Done**:
- Primary heuristic+lightweight + optional vision escalation with 30s/cost guards
- Retry loop (max 1) works; scores + feedback roundtrip; 90%+ coverage
- Self-critique (≥6) + Key Decision #5 cross-ref
- Acceptance: Critic passes good trace, forces 1 retry on bad layer, never exceeds budget

---

### **PR 11: Static Process Visualization Component** (Depends on PR 4, 6)
**Goal**: React component consuming ProcessTrace; timeline + cards + SVG/Canvas layer preview.
**Risk**: Low-Medium | **Duration**: 1–2 days
**Definition of Done**:
- Component renders accurate timeline + layer preview from fixtures; no perf regression
- 90%+ coverage; accessibility + perf checks; self-critique (≥6)
- Acceptance: Artist-reviewer confirms traces legible

---

### **PR 12: Full 4-Artist End-to-End + Hardware Validation** (Depends on PR 7–11)
**Goal**: Complete pipeline all 4 artists; <15 min on real 4090/5090 GPU; timing + artifacts.
**Risk**: **CRITICAL** | **Duration**: 2–3 days
**Definition of Done**:
- Successful <15 min (target <12) runs for all 4 on real hardware in Docker; valid traces + images attached
- Timing report + coverage audit (≥90%) + quality spot-checks (automated + LLM-judge + human) attached
- All LLM spend provably near-zero (caches + smallest models evidenced); self-critique (≥6)
- Hardware gate passed: "MVP ready" signal

---

### **PR 13: Polish, Error States, UX, Coverage, Docs** (Depends on PR 12)
**Goal**: Complete error taxonomy, loading states, trace download, final docs.
**Risk**: Low | **Duration**: 1–2 days
**Definition of Done**:
- All error states produce RFC 7807 + actionable UX; trace download works
- Final coverage ≥90%; self-critique (≥6); no regressions
- Setup docs + README complete

---

### **PR 14: MVP Closure + Validation Report** (Depends on PR 12, 13)
**Goal**: Validation summary, "MVP ready" checklist, skill extraction, closure.
**Risk**: Low | **Duration**: 1 day
**Definition of Done**:
- Complete validation report (hardware, quality, cost, coverage) + "MVP ready" checklist signed
- All 7 user decisions + design v2 accurate; v0.1 issues logged
- Final self-critique (≥6) + AGENTS ritual complete

---

## Risks Table

| Risk | Severity | Primary PRs | Mitigation | Residual Risk |
|------|----------|------------|------------|---------------|
| **Mediocre Signature Library collapses quality** | High | 3, 7, 12 | Narrow 4 artists, conservation seeding, explicit "emulation" disclaimer, roundtrip tests | Medium-High (artistic judgment inherent) |
| **Hardware/perf target (<15 min) missed** | High | 6, 8-12 | Early timing gates, model flexibility, PR 12 hardware gate | Medium (2026 model perf unknown) |
| **Contract drift (TS Zod ↔ Python Pydantic)** | Medium | 4, 5, 8-12 | JSON Schema SSOT + codegen + exhaustive roundtrips in PR 4 + CI | Low |
| **Non-deterministic output defeats testing** | Medium | 6, 8-12 | Seeded workflows, perceptual metrics, golden fixtures | Medium (inherent to diffusion) |
| **Schedule overrun** | Medium | 6-12 | Narrow PR scope (1–3 days), parallel tracks post-PR4, time-boxed spikes | Medium |
| **LLM cost overrun** | Low | 5, 12 | Aggressive caching + smallest models; PR 12 explicit limits | Low |
| **ComfyUI API instability** | Medium | 2, 6-10, 12 | Docker-pinned versions, custom node source control, early spike validation | Medium |

---

## Self-Critique & Limitations

1. **Signature Library is both greatest strength and single point of failure.** If seeding mediocre, everything collapses. Mitigated by narrow 4 artists + conservation literature, but residual risk real.

2. **Orchestration complexity non-trivial.** Requires world-class tooling + discipline. PR 4 is critical gate.

3. **True emotional resonance may require user-in-the-loop more often than <12 min target allows.** MVP is "credible technique-informed emulation," not "indistinguishable forgery." Honest scope.

4. **Performance targets projected, not validated.** Step counts, Flux/SD3 perf, VRAM assumptions unvalidated until PR 6/12.

5. **PR 3/7 seeding split risks overlap if "minimal" misinterpreted.** Spike executor judgment required inside guardrails.

6. **Curator Critic heuristic rules + secondary model still PR10 invention surface.** Mitigated by TDD targets + budget guards.

7. **Faculty internals, error taxonomy left to implementation.** Intentional; implementers carry necessary invention risk.

8. **External SDK assumptions could drift.** PR 1/2 early spikes must re-validate against live APIs.

All residual risks acceptable inside AGENTS.md elite enforcement (TDD, self-critique, reviewer loops, hardware gate). Design is honest about limits.

---

## References

- **Archon v1**: `docs/archon/ARCHON_DESIGN_Art_That_Imitates_Art_v1.md` (immutable)
- **ComfyUI Routes**: https://docs.comfy.org/development/comfyui-server/comms_routes
- **@saintno/comfyui-sdk**: https://github.com/comfy-addons/comfyui-sdk
- **Vercel AI SDK + xAI**: https://docs.x.ai/developers/model-capabilities/text/structured-outputs
- **JSON Schema ↔ Pydantic**: datamodel-code-generator, zod-to-json-schema

---

**Status: ✅ APPROVED. Ready for Phase 1 Implementation (PRs 1-2).**

*Produced under strict Plan Mode per AGENTS.md. All 7 user decisions locked. 2-pass design review completed.*