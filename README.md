# MediMind — Multi-Agent AI Medical Assistant

**Evidence-grounded AI for safer medical assistance.**
B.Tech Major Project (Phase-II). A complete, runnable, end-to-end multi-agent medical assistant.

> ⚠️ **MediMind is an academic research prototype** and is not intended to diagnose, treat, cure, or
> prevent any disease. AI-generated information may be inaccurate and should not replace professional
> medical advice. Imaging results are labelled **ACADEMIC DEMONSTRATION — NOT A CLINICAL DIAGNOSIS**.

---

## What it does

A user query flows through a real multi-agent pipeline:

```
USER → INPUT GUARDRAIL → ORCHESTRATOR → SPECIALIZED AGENT → RETRIEVAL/ANALYSIS
     → CONFIDENCE ESTIMATION → HUMAN REVIEW (when required) → FINAL RESPONSE
```

- **AI Assistant** — chat with live agent execution timeline, confidence %, evidence sources, disclaimer.
- **Orchestrator** — routes each query to one agent: `MEDICAL_QA`, `DOCUMENT_QA`, `WEB_RESEARCH`,
  `CHEST_XRAY`, `SKIN_LESION`, `BRAIN_TUMOR`, `GENERAL`.
- **Medical RAG** — upload PDFs → text extraction → chunking → TF-IDF retrieval → grounded answers with sources.
- **Web Search Agent** — Tavily when configured, else a built-in **Demo Web Search** fallback.
- **Confidence Estimation** — application-level score (retrieval relevance, supporting chunks, answer/evidence
  overlap, search quality). Levels HIGH / MEDIUM / LOW. Low confidence escalates to Web Search.
- **Medical Imaging** — chest X-ray / skin lesion / brain tumor. Uses a modular **demonstration inference
  adapter** (swap in real PyTorch models later). Every result goes to clinician review.
- **Clinician Review** — Approve / Reject / Request Second Review, persisted with an audit trail.
- **Agent Workflow** — interactive graph that highlights the nodes executed by a live query.
- **Analytics** — real metrics from stored executions.
- **Voice** — OpenAI Whisper (STT) + OpenAI TTS via the Emergent Universal Key.

## Tech stack

- **Frontend:** React, Tailwind CSS, shadcn/ui, reactflow, recharts, Phosphor icons.
- **Backend:** Python FastAPI.
- **Database:** MongoDB (persistent). Retrieval is modular so Qdrant can be connected later.
- **LLM:** OpenAI GPT-5.4 via the Emergent Universal Key (behind a service abstraction).

## Demo Mode

The app runs **immediately** after deployment with local fallbacks. It never crashes if
OpenAI/Tavily/ElevenLabs/Qdrant keys are missing — it degrades gracefully and labels simulated
output as **ACADEMIC DEMONSTRATION RESULT**. A demo knowledge base (3 PDFs) auto-seeds on startup.

## Run locally

**Backend**
```bash
cd backend
pip install -r requirements.txt
# configure .env (see below)
uvicorn server:app --host 0.0.0.0 --port 8001   # (managed by supervisor in this environment)
```

**Frontend**
```bash
cd frontend
yarn install
yarn start
```

## Environment configuration (`backend/.env`)

Copy `backend/.env.example`. The app works in Demo Mode with the optional values absent.

| Variable | Purpose | Required |
|---|---|---|
| `MONGO_URL`, `DB_NAME` | MongoDB connection | yes |
| `EMERGENT_LLM_KEY` | LLM + voice (OpenAI/Anthropic/Gemini via Universal Key) | recommended |
| `LLM_PROVIDER`, `LLM_MODEL` | e.g. `openai` / `gpt-5.4` | optional |
| `TAVILY_API_KEY` | live web search (else demo fallback) | optional |
| `ELEVENLABS_API_KEY` | alternate voice provider | optional |
| `QDRANT_URL`, `QDRANT_API_KEY` | vector DB (else local TF-IDF) | optional |

## API endpoints

`GET /api/health` · `GET /api/config` · `GET /api/dashboard` · `POST /api/chat` ·
`POST /api/documents/upload` · `GET /api/documents` · `DELETE /api/documents/{id}` ·
`POST /api/documents/{id}/query` · `POST /api/web-search` · `POST /api/imaging/chest-xray` ·
`POST /api/imaging/skin-lesion` · `POST /api/imaging/brain-tumor` · `GET /api/reviews` ·
`POST /api/reviews/{id}/approve|reject|second-review` · `GET /api/analytics` ·
`GET /api/conversations` · `POST /api/voice/transcribe` · `POST /api/voice/speak`

## Live demo checklist

1. Ask "What are the common symptoms of iron deficiency anemia?" → RAG + evidence + confidence.
2. Upload a PDF → ask a question about it → grounded answer + sources.
3. Ask "What are the symptoms of Ehlers-Danlos syndrome?" → low confidence → Web Search fallback.
4. Upload a chest X-ray / skin lesion / brain scan → prediction + confidence + Pending Review.
5. Open Clinician Review → Approve/Reject → status persists.
6. Open Agent Workflow → run a query → watch nodes light up.
7. Voice: click the mic, speak, and press Listen on a response.
