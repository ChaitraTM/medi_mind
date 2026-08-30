# MediMind — PRD & Project Memory

## Original Problem Statement
Build MediMind, a Multi-Agent AI Medical Assistant (B.Tech Major Project Phase-II). A complete,
runnable, end-to-end full-stack app demonstrating: input guardrail → orchestrator → specialized agent
→ retrieval/analysis → confidence estimation → human review → final response. Demo-first with graceful
local fallbacks; every major button performs a real operation.

## User Choices (locked)
- LLM: OpenAI **GPT-5.4** via Emergent Universal Key (service abstraction).
- Database: **MongoDB** (persistent).
- Voice: **OpenAI STT/TTS** via Universal Key (Whisper + tts-1).
- Web Search: **built-in Demo Web Search** fallback (Tavily optional).
- Design: professional clinical "Swiss high-contrast" (Manrope + IBM Plex Sans + JetBrains Mono; blue/teal).

## Architecture
- Backend (FastAPI): `server.py` (routes), `agents.py` (guardrails/orchestrator/agents/confidence/vision),
  `rag.py` (chunking + TF-IDF retrieval), `web_search.py` (Tavily + demo fallback), `llm_service.py`
  (LLM + STT/TTS via emergentintegrations), `seed_data.py` (demo KB), `db.py` (Mongo).
- Frontend (React): `Layout` + pages Dashboard, Assistant, Imaging, Documents, Review, Workflow,
  Analytics, Settings. Shared: Indicators (ConfidenceRing/Badge, StatusBadge), ExecutionTimeline, EvidencePanel.
- Collections: documents, document_chunks, conversations, messages, imaging_analyses,
  clinician_reviews, agent_executions.

## Personas
- **Student presenter** — demonstrates the full workflow live at a college review.
- **Reviewer/faculty** — inspects agent routing, evidence, confidence, human-in-the-loop, analytics.
- **Clinician (simulated)** — approves/rejects AI imaging predictions.

## Core Requirements (static)
Multi-agent orchestration, RAG with sources, application-level confidence, low-confidence web fallback,
imaging demonstration inference with mandatory clinician review + audit trail, agent workflow
visualization, analytics from real executions, voice, persistent MongoDB, demo mode, safety guardrails,
persistent medical disclaimer.

## Implemented (2026-06)
- ✅ All 20 API endpoints working with Pydantic schemas + friendly error handling.
- ✅ Chat pipeline: input guardrail (emergency/dangerous), orchestrator (keyword + LLM), RAG agent,
  web search agent, confidence estimation, output guardrail, execution steps recorded.
- ✅ Low-confidence RAG → Web Search handoff (verified).
- ✅ Document upload (PDF extract → chunk → index), document Q&A, delete (demo protected).
- ✅ Imaging (chest/skin/brain) → prediction + confidence + bounding box/segmentation overlays +
  PENDING CLINICIAN REVIEW; deterministic demonstration adapter (modular).
- ✅ Clinician review approve/reject/second-review with persistence + audit trail.
- ✅ Agent Workflow reactflow graph with live node highlighting from real chat execution.
- ✅ Analytics + Dashboard from stored data. Voice STT/TTS via Universal Key.
- ✅ Demo KB auto-seed (3 PDFs). Persistent disclaimer + academic labels throughout.
- ✅ Testing agent: 100% backend (25/25) + 100% frontend critical flows.

## Backlog / Future (P1/P2)
- P1: Connect real Qdrant vector DB (retrieval already modular).
- P1: Replace demonstration vision adapter with real PyTorch/inference-service models.
- P2: Store imaging images in GridFS/object storage instead of base64 in Mongo (scale).
- P2: Paginate reviews list with thin projection (avoid large base64 payloads).
- P2: Tavily live web search toggle; ElevenLabs voice option.
- P2: Formal evaluation dataset run to populate scientific metrics.

## Next tasks
- Optional polish: memoize reactflow arrays to silence a console warning (non-blocking).
