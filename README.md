# Art That Imitates Art (ATIA)

**Museum-quality artistic imitation via a self-improving multi-agent Atelier architecture.**

This repository is the implementation home for the system first designed by **Archon** (Self-Improving Architecture Design Agent) in May 2026.

## North Star (from the original Archon design)

A reliable artistic reasoning and execution system that can replicate not just visual appearance but **technique, process, intent, and emotional truth** of master works — at gallery/museum fidelity, on demand, with strong process transparency.

See the immutable historical source:
- [docs/archon/ARCHON_DESIGN_Art_That_Imitates_Art_v1.md](docs/archon/ARCHON_DESIGN_Art_That_Imitates_Art_v1.md)

## Current Status (Post-Bootstrap)

- **Repo**: Clean dedicated git repository at `liveslowdiefast4-a11y/art-that-imitates-art`
- **Elite Overlay**: AGENTS.md v2.0 (sacred) + `.grok/` configuration installed via the Grok Build Playbook
- **Governing Standards**: Strict adherence to [AGENTS.md](AGENTS.md) (Plan Mode, TDD, 90%+ coverage, TS strict + Zod, Clean Architecture + DDD, parallel isolation, brutal honesty, self-critique)
- **Status**: Design v2 approved. Ready for implementation via 14-PR roadmap.

## MVP Scope (User Decisions Locked)

1. **Mode**: Faithful Imitation only
2. **Artists**: 4 major (Vermeer, van Gogh, Rembrandt, John Singer Sargent)
3. **Media**: Digital + simulated traditional oil (via ComfyUI)
4. **Performance**: <12 min target, <15 min hard cap on RTX 4090/5090-class hardware
5. **Transparency**: Static layer-order visualization + process traces (full X-ray video deferred)
6. **Environment**: Docker Compose mandatory from PR 2 onward
7. **Costs**: Aggressive near-zero external LLM API spend

## Architecture Intent (High Level)

Hybrid Clean Architecture:
- **TypeScript layer**: Next.js + tRPC + Zod (orchestration, Director, Analysis Collective, UI, Signature Library, process docs)
- **Python inference workers**: ComfyUI + custom nodes (Technique Simulator, Regional Copyists, Master Finisher, Curator Critic)
- Strong contract enforcement (Zod ↔ Pydantic via JSON Schema)

## Documentation

- **[docs/design/ATIA_MVP_Design_v2_FINAL.md](docs/design/ATIA_MVP_Design_v2_FINAL.md)** — Canonical executable specification (14 PRs, all contracts, risks, DoD)
- **[docs/design/DESIGN_REVIEWS.md](docs/design/DESIGN_REVIEWS.md)** — 2-pass review artifacts and resolution summary
- **[AGENTS.md](AGENTS.md)** — Sacred project standards
- **[docs/archon/ARCHON_DESIGN_Art_That_Imitates_Art_v1.md](docs/archon/ARCHON_DESIGN_Art_That_Imitates_Art_v1.md)** — Immutable historical visionary source

## 14-PR Implementation Roadmap

| PR | Title | Risk | DoD |
|----|-------|------|-----|
| 1 | Scaffold Next.js + Core TS Stack | Low | Strict TS + Zod compiles; UI shell renders; 90%+ coverage |
| 2 | Python Execution Skeleton + Docker | Medium | `docker-compose up` brings healthy FastAPI + ComfyUI; contract roundtrips |
| 3 | Signature Library v0 Schema + Seed | **High** | Zod loader + all 4 artists minimal viable; roundtrip tests pass; 90%+ coverage |
| 4 | Core Execution Contracts + Bridge | **Highest** | Full ExecutionRequest/Result/ProcessTrace; codegen; roundtrips 100%; CI green |
| 5 | tRPC Orchestration + Director Stub | Medium | Director + Analysis via xAI + Zod; error handling; cost controls; 90%+ |
| 6 | Vermeer Technique Simulator Faculty | High | End-to-end tRPC → faculty → ComfyUI → ProcessTrace; timing report; 90%+ |
| 7 | Remaining Artists Seed Data | Medium | Full signatures (van Gogh/Rembrandt/Sargent); quality spot-check; 90%+ |
| 8 | Regional Copyists Faculty | High | Masked execution; results merge; regional trace entries; 90%+ |
| 9 | Master Finisher + Compositing | High | Layer assembly + glazing passes; full ProcessTrace; <11 min end-to-end; 90%+ |
| 10 | Curator Critic + Re-execution | Medium-High | Heuristic + lightweight path; budget guards; retry loop; 90%+ |
| 11 | Static Process Visualization | Low-Medium | Component renders traces; layer timeline + SVG; 90%+ |
| 12 | Full 4-Artist End-to-End + Hardware Gate | **Critical** | <15 min runs on real 4090/5090; timing report + artifacts; near-zero costs; 90%+ |
| 13 | Polish, Error States, UX, Docs | Low | Error taxonomy; loading states; trace download; final coverage ≥90% |
| 14 | MVP Closure + Validation Report | Low | Hardware validation summary; "ready" checklist; v0.1 issues logged |

## Contributing / Working in This Repo

- **Plan Mode is mandatory** for anything >1 file or >15 minutes.
- Never edit without showing diffs and obtaining explicit approval.
- All complex work uses strict parallel isolation (worktrees) + parallel-isolation-error-handling protocol.
- After every major slice: Critic Loop (≥8 brutal criticisms) + Recursive Self-Improvement.
- **90%+ test coverage** on all new code. Strict TDD (Red → Green → Refactor).
- TS strict mode + Zod validation everywhere. Clean Architecture + DDD.

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Docker + Docker Compose
- RTX 4090/5090-class GPU (for PR 12 hardware validation)

### Quick Start (After PR 1-2 Land)

```bash
# Clone and install
git clone https://github.com/liveslowdiefast4-a11y/art-that-imitates-art.git
cd art-that-imitates-art
npm install

# Bring up Docker environment (PR 2+)
docker-compose up -d

# Start dev server (PR 1+)
npm run dev

# Run tests
npm run test
```

## Project Timeline

- **MVP**: 6–10 weeks (elite execution, full TDD, parallel safe tracks)
- **v0.1**: Post-MVP improvements (advanced failure memory, reinterpretation mode)
- **Transcendent** (v1.0): Animation, Ghost Artist, full self-improvement (9–18 months per Archon vision)

## References

- **Archon v1**: `docs/archon/ARCHON_DESIGN_Art_That_Imitates_Art_v1.md` (immutable)
- **ComfyUI API**: https://docs.comfy.org/development/comfyui-server/comms_routes
- **Vercel AI SDK + xAI**: https://docs.x.ai/developers/model-capabilities/text/structured-outputs
- **Zod ↔ Pydantic patterns**: datamodel-code-generator, zod-to-json-schema

---

**Status**: ✅ Design approved. 🚀 Ready for Phase 1 implementation (PRs 1-2).

*Produced under strict Plan Mode + AGENTS.md sacred standards. Checkpoint: design/atia-mvp-v2-approved.*