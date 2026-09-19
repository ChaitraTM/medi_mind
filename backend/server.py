"""MediMind — Multi-Agent AI Medical Assistant. FastAPI backend."""
import base64
import logging
from typing import Optional, List

from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import os
from pypdf import PdfReader
import io

from db import (
    documents, document_chunks, conversations, messages,
    imaging_analyses, clinician_reviews, agent_executions,
    new_id, now_iso,
)
from rag import chunk_text, retrieve, index_chunks, delete_document_chunks
from agents import (
    input_guardrail, orchestrate_intent, medical_qa_agent, web_search_agent,
    output_guardrail, estimate_confidence, vision_infer, DISCLAIMER,
)
from web_search import web_search, web_provider
from llm_service import llm_available, transcribe_audio, synthesize_speech
from seed_data import DEMO_DOCUMENTS

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("medimind")

security_logger = logging.getLogger("medimind.security")
sec_handler = logging.FileHandler("security_audit.log")
sec_handler.setFormatter(logging.Formatter("%(asctime)s - SECURITY_AUDIT - %(message)s"))
security_logger.addHandler(sec_handler)
security_logger.setLevel(logging.INFO)

app = FastAPI(title="MediMind API")
api = APIRouter(prefix="/api")

MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_PDF_BYTES = 15 * 1024 * 1024


# ------------- Schemas -------------
class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)
    conversation_id: Optional[str] = None
    document_id: Optional[str] = None


class WebSearchRequest(BaseModel):
    query: str = Field(..., max_length=1000)


class SpeakRequest(BaseModel):
    text: str = Field(..., max_length=4000)
    voice: str = "nova"


class ReviewActionRequest(BaseModel):
    note: Optional[str] = Field(None, max_length=2000)


# ------------- Helpers -------------
async def record_execution(agent_name, input_type, status, confidence, handoff_reason, query, start, end):
    doc = {
        "id": new_id(), "agent_name": agent_name, "input_type": input_type,
        "status": status, "confidence": confidence, "handoff_reason": handoff_reason,
        "query": (query or "")[:300], "start_time": start, "end_time": end,
    }
    await agent_executions.insert_one({**doc})
    return doc


# ------------- Health / Config -------------
@api.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "MediMind",
        "demo_mode": not (llm_available() and web_provider() == "tavily"),
        "llm_active": llm_available(),
        "web_provider": web_provider(),
        "voice_active": llm_available(),
    }


@api.get("/config")
async def config():
    return {
        "llm_active": llm_available(),
        "llm_model": os.environ.get("LLM_MODEL", "gpt-5.4"),
        "llm_provider": os.environ.get("LLM_PROVIDER", "openai"),
        "web_provider": web_provider(),
        "voice_active": llm_available(),
        "vector_db": "qdrant" if os.environ.get("QDRANT_URL") else "local-tfidf",
        "disclaimer": DISCLAIMER,
        "demo_mode": not (llm_available() and web_provider() == "tavily"),
    }


# ------------- Chat (Orchestrator pipeline) -------------
@api.post("/chat")
async def chat(req: ChatRequest):
    query = (req.message or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    steps: List[dict] = []
    start = now_iso()

    # 1. Input Guardrail
    security_logger.info(f"Received chat request (conv_id={req.conversation_id}, doc_id={req.document_id})")
    guard = input_guardrail(query)
    steps.append({
        "label": "Input Guardrail",
        "status": "warning" if not guard["passed"] else "done",
        "detail": guard["message"] if not guard["passed"] else "No unsafe content detected",
    })

    if not guard["passed"]:
        if guard.get("injection"):
            security_logger.warning("Prompt injection detected and blocked.")
        else:
            security_logger.warning("Safety violation detected and blocked.")
        response_text = f"⚠ {guard['message']}\n\n{DISCLAIMER}"
        await record_execution("Input Guardrail", "text", "blocked",
                               0, "safety_block", query, start, now_iso())
        msg = await _persist_message(req.conversation_id, query, response_text,
                                     "Safety Guardrail", "GENERAL",
                                     {"confidence_score": 0, "confidence_level": "N/A",
                                      "evidence_strength": "N/A", "requires_review": False},
                                     [], steps, emergency=guard.get("emergency", False))
        return msg

    # 2. Orchestrator
    routing = await orchestrate_intent(query, has_document=bool(req.document_id))
    intent, agent = routing["intent"], routing["agent"]
    security_logger.info(f"Routed to {agent} (Intent: {intent})")
    steps.append({"label": "Orchestrator", "status": "done",
                  "detail": f"Intent Detected: {intent} ({routing['method']})"})
    steps.append({"label": f"Agent: {agent}", "status": "running", "detail": "Executing specialized agent"})

    exec_start = now_iso()
    handoff_reason = None

    # 3. Route to agent
    if intent == "WEB_RESEARCH":
        result = await web_search_agent(query)
        source_type = "web"
    elif intent in ("MEDICAL_QA", "DOCUMENT_QA", "GENERAL"):
        doc_id = req.document_id if intent == "DOCUMENT_QA" else None
        result = await medical_qa_agent(query, document_id=doc_id)
        source_type = "rag"
    else:
        # Imaging intents reached via chat -> guide user to imaging page
        result = {
            "answer": (f"This request looks like a {intent.replace('_', ' ').title()} task. "
                       "Please use the Medical Imaging page to upload the image so the "
                       f"{agent} can analyze it."),
            "evidence": [], "used_llm": False,
            "confidence": {"confidence_score": 0, "confidence_level": "N/A",
                           "evidence_strength": "N/A", "requires_review": False},
        }
        source_type = "routing"

    steps[-1]["status"] = "done"
    steps.append({"label": "Evidence Retrieved", "status": "done",
                  "detail": f"{len(result['evidence'])} source(s) retrieved"})
    conf = result["confidence"]
    steps.append({"label": "Confidence Checked", "status": "done",
                  "detail": f"{conf['confidence_score']}% ({conf['confidence_level']})"})

    await record_execution(agent, "text", "success", conf["confidence_score"],
                           None, query, exec_start, now_iso())

    # 4. Low confidence -> Web Search fallback
    if source_type == "rag" and conf["confidence_level"] == "LOW":
        handoff_reason = "Low RAG confidence — escalated to Web Search Agent"
        steps.append({"label": "Handoff: Web Search Agent", "status": "running",
                      "detail": handoff_reason})
        web_result = await web_search_agent(query)
        await record_execution("Web Search Agent", "text", "success",
                               web_result["confidence"]["confidence_score"],
                               handoff_reason, query, now_iso(), now_iso())
        if web_result["confidence"]["confidence_score"] >= conf["confidence_score"]:
            result = web_result
            agent = "Web Search Agent"
            conf = result["confidence"]
        steps[-1]["status"] = "done"
        steps.append({"label": "Updated Evidence", "status": "done",
                      "detail": f"{len(result['evidence'])} web source(s)"})

    # Output Validation
    if "IMPORTANT SECURITY INSTRUCTION" in result["answer"] or "<untrusted_data>" in result["answer"]:
        security_logger.warning("Data leakage or instruction bleed detected in output. Redacting.")
        result["answer"] = "I cannot fulfill this request due to a security constraint."

    security_logger.info(f"Agent execution completed successfully (Confidence: {conf['confidence_score']})")

    # 5. Output Guardrail
    final_answer = output_guardrail(result["answer"], bool(result["evidence"]), intent)
    if not result.get("used_llm"):
        final_answer = "ACADEMIC DEMONSTRATION RESULT\n\n" + final_answer if "ACADEMIC DEMONSTRATION" not in final_answer else final_answer
    steps.append({"label": "Response Generated", "status": "done",
                  "detail": "Output guardrail applied + disclaimer attached"})

    msg = await _persist_message(req.conversation_id, query, final_answer, agent, intent,
                                 conf, result["evidence"], steps,
                                 handoff_reason=handoff_reason)
    return msg


async def _persist_message(conversation_id, question, response, agent, intent, conf,
                           evidence, steps, emergency=False, handoff_reason=None):
    if not conversation_id:
        conversation_id = new_id()
        title = question[:60] + ("..." if len(question) > 60 else "")
        await conversations.insert_one({
            "id": conversation_id, "title": title, "created_at": now_iso(),
            "updated_at": now_iso(),
        })
    else:
        await conversations.update_one({"id": conversation_id},
                                       {"$set": {"updated_at": now_iso()}})

    msg = {
        "id": new_id(), "conversation_id": conversation_id, "role": "assistant",
        "question": question, "response": response, "agent": agent, "intent": intent,
        "confidence_score": conf.get("confidence_score", 0),
        "confidence_level": conf.get("confidence_level", "N/A"),
        "evidence_strength": conf.get("evidence_strength", "N/A"),
        "requires_review": conf.get("requires_review", False),
        "sources": evidence, "execution_steps": steps, "emergency": emergency,
        "handoff_reason": handoff_reason, "disclaimer": DISCLAIMER,
        "timestamp": now_iso(),
    }
    await messages.insert_one({**msg})
    msg.pop("_id", None)
    return msg


# ------------- Documents -------------
@api.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    contents = await file.read()
    if len(contents) > MAX_PDF_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 15 MB).")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        reader = PdfReader(io.BytesIO(contents))
        text = "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception as e:  # noqa: BLE001
        logger.warning("PDF parse failed: %s", e)
        raise HTTPException(status_code=400, detail="Could not read the PDF. Please try another file.")

    if not text.strip():
        raise HTTPException(status_code=400, detail="No extractable text found in the PDF.")

    doc_id = new_id()
    doc = {
        "id": doc_id, "filename": file.filename, "status": "READY",
        "num_chunks": 0, "upload_date": now_iso(), "is_demo": False,
        "size_kb": round(len(contents) / 1024, 1),
    }
    chunks = chunk_text(text)
    chunk_docs = [{
        "id": new_id(), "document_id": doc_id, "document_name": file.filename,
        "chunk_index": i, "text": c,
    } for i, c in enumerate(chunks)]
    if chunk_docs:
        await document_chunks.insert_many(chunk_docs)
        index_chunks(chunk_docs)
    doc["num_chunks"] = len(chunk_docs)
    await documents.insert_one({**doc})
    return doc


@api.get("/documents")
async def list_documents():
    docs = await documents.find({}, {"_id": 0}).sort("upload_date", -1).to_list(500)
    return docs


@api.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    doc = await documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if doc.get("is_demo"):
        raise HTTPException(status_code=400, detail="Demo documents cannot be deleted.")
    await documents.delete_one({"id": doc_id})
    await document_chunks.delete_many({"document_id": doc_id})
    delete_document_chunks(doc_id)
    return {"deleted": doc_id}


@api.post("/documents/{doc_id}/query")
async def query_document(doc_id: str, req: WebSearchRequest):
    doc = await documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    result = await medical_qa_agent(req.query, document_id=doc_id)
    conf = result["confidence"]
    answer = output_guardrail(result["answer"], bool(result["evidence"]), "DOCUMENT_QA")
    await record_execution("Document RAG Agent", "document", "success",
                           conf["confidence_score"], None, req.query, now_iso(), now_iso())
    return {
        "answer": answer, "sources": result["evidence"],
        "confidence_score": conf["confidence_score"],
        "confidence_level": conf["confidence_level"],
        "evidence_strength": conf["evidence_strength"],
        "document": doc["filename"], "disclaimer": DISCLAIMER,
        "used_llm": result.get("used_llm", False),
    }


# ------------- Web Search -------------
@api.post("/web-search")
async def web_search_endpoint(req: WebSearchRequest):
    results = await web_search(req.query)
    return {"provider": web_provider(), "results": results,
            "demo": web_provider() == "demo"}


# ------------- Imaging -------------
async def _handle_imaging(modality: str, agent_name: str, file: UploadFile):
    contents = await file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 8 MB).")
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a valid image file.")

    start = now_iso()
    result = vision_infer(modality, contents)
    b64 = base64.b64encode(contents).decode("utf-8")
    data_url = f"data:{file.content_type};base64,{b64}"

    analysis_id = new_id()
    review_id = new_id()
    analysis = {
        "id": analysis_id, "modality": modality, "agent": agent_name,
        "filename": file.filename, "image": data_url,
        "prediction": result["prediction"], "confidence": result["confidence"],
        "analysis": result["analysis"], "status": "PENDING CLINICIAN REVIEW",
        "review_id": review_id, "created_at": start,
        "bounding_box": result.get("bounding_box"),
        "segmentation": result.get("segmentation"),
        "labels_considered": result.get("labels_considered", []),
    }
    await imaging_analyses.insert_one({**analysis})

    review = {
        "id": review_id, "analysis_id": analysis_id, "modality": modality,
        "agent": agent_name, "filename": file.filename, "image": data_url,
        "prediction": result["prediction"], "confidence": result["confidence"],
        "explanation": result["analysis"], "status": "PENDING",
        "created_at": start, "updated_at": start,
        "bounding_box": result.get("bounding_box"),
        "segmentation": result.get("segmentation"),
        "audit_trail": [{"action": "CREATED", "at": start,
                         "note": "Analysis submitted for clinician review"}],
    }
    await clinician_reviews.insert_one({**review})

    await record_execution(agent_name, "image", "success", result["confidence"],
                           "requires_human_review", file.filename, start, now_iso())

    analysis.pop("_id", None)
    analysis["disclaimer"] = DISCLAIMER
    return analysis


@api.post("/imaging/chest-xray")
async def imaging_chest(file: UploadFile = File(...)):
    return await _handle_imaging("CHEST_XRAY", "Chest X-ray Agent", file)


@api.post("/imaging/skin-lesion")
async def imaging_skin(file: UploadFile = File(...)):
    return await _handle_imaging("SKIN_LESION", "Skin Lesion Agent", file)


@api.post("/imaging/brain-tumor")
async def imaging_brain(file: UploadFile = File(...)):
    return await _handle_imaging("BRAIN_TUMOR", "Brain Tumor Agent", file)


# ------------- Clinician Reviews -------------
@api.get("/reviews")
async def list_reviews():
    revs = await clinician_reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return revs


async def _update_review(review_id: str, new_status: str, action: str, note: str, clinician_note: str = None):
    rev = await clinician_reviews.find_one({"id": review_id})
    if not rev:
        raise HTTPException(status_code=404, detail="Review not found.")
    ts = now_iso()
    entry = {"action": action, "at": ts, "note": note}
    if clinician_note and clinician_note.strip():
        entry["clinician_note"] = clinician_note.strip()
    set_fields = {"status": new_status, "updated_at": ts}
    if clinician_note and clinician_note.strip():
        set_fields["clinician_note"] = clinician_note.strip()
    await clinician_reviews.update_one(
        {"id": review_id},
        {"$set": set_fields, "$push": {"audit_trail": entry}},
    )
    await imaging_analyses.update_one(
        {"review_id": review_id},
        {"$set": {"status": {"APPROVED": "APPROVED", "REJECTED": "REJECTED",
                             "SECOND_REVIEW": "PENDING SECOND REVIEW"}.get(new_status, new_status)}},
    )
    updated = await clinician_reviews.find_one({"id": review_id}, {"_id": 0})
    return updated


@api.post("/reviews/{review_id}/approve")
async def approve_review(review_id: str, req: ReviewActionRequest = ReviewActionRequest()):
    return await _update_review(review_id, "APPROVED", "APPROVED",
                                "Clinician approved the AI analysis", req.note)


@api.post("/reviews/{review_id}/reject")
async def reject_review(review_id: str, req: ReviewActionRequest = ReviewActionRequest()):
    return await _update_review(review_id, "REJECTED", "REJECTED",
                                "Clinician rejected the AI analysis", req.note)


@api.post("/reviews/{review_id}/second-review")
async def second_review(review_id: str, req: ReviewActionRequest = ReviewActionRequest()):
    return await _update_review(review_id, "SECOND_REVIEW", "REQUEST_SECOND_REVIEW",
                                "Clinician requested a second review", req.note)


# ------------- Conversations -------------
@api.get("/conversations")
async def list_conversations():
    convs = await conversations.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    for c in convs:
        msgs = await messages.find({"conversation_id": c["id"]}, {"_id": 0}).to_list(200)
        c["messages"] = msgs
        c["message_count"] = len(msgs)
    return convs


# ------------- Analytics -------------
@api.get("/analytics")
async def analytics():
    total_conversations = await conversations.count_documents({})
    total_messages = await messages.count_documents({})
    total_docs = await documents.count_documents({})
    total_chunks = await document_chunks.count_documents({})
    total_imaging = await imaging_analyses.count_documents({})
    pending = await clinician_reviews.count_documents({"status": "PENDING"})
    approved = await clinician_reviews.count_documents({"status": "APPROVED"})
    rejected = await clinician_reviews.count_documents({"status": "REJECTED"})
    second = await clinician_reviews.count_documents({"status": "SECOND_REVIEW"})

    execs = await agent_executions.find({}, {"_id": 0}).to_list(5000)
    agent_usage = {}
    confs = []
    for e in execs:
        agent_usage[e["agent_name"]] = agent_usage.get(e["agent_name"], 0) + 1
        if e.get("confidence"):
            confs.append(e["confidence"])
    avg_conf = round(sum(confs) / len(confs), 1) if confs else 0

    rag_queries = sum(1 for e in execs if "RAG" in e.get("agent_name", ""))
    web_queries = sum(1 for e in execs if e.get("agent_name") == "Web Search Agent")
    imaging_queries = sum(1 for e in execs if e.get("input_type") == "image")

    return {
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "documents_indexed": total_docs,
        "chunks_indexed": total_chunks,
        "imaging_analyses": total_imaging,
        "pending_reviews": pending,
        "approved_reviews": approved,
        "rejected_reviews": rejected,
        "second_review_requests": second,
        "average_confidence": avg_conf,
        "total_queries": len(execs),
        "rag_queries": rag_queries,
        "web_searches": web_queries,
        "imaging_queries": imaging_queries,
        "agent_usage": agent_usage,
        "average_latency_ms": "Evaluation data not available yet.",
        "evaluation_metrics": "Evaluation data not available yet.",
    }


# ------------- Dashboard summary -------------
@api.get("/dashboard")
async def dashboard():
    total_conversations = await conversations.count_documents({})
    total_docs = await documents.count_documents({})
    total_imaging = await imaging_analyses.count_documents({})
    pending = await clinician_reviews.count_documents({"status": "PENDING"})
    execs = await agent_executions.find({}, {"_id": 0}).to_list(5000)
    confs = [e["confidence"] for e in execs if e.get("confidence")]
    avg_conf = round(sum(confs) / len(confs), 1) if confs else 0

    recent = await agent_executions.find({}, {"_id": 0}).sort("end_time", -1).to_list(8)
    return {
        "total_conversations": total_conversations,
        "documents_indexed": total_docs,
        "imaging_analyses": total_imaging,
        "pending_reviews": pending,
        "average_confidence": avg_conf,
        "recent_activity": recent,
    }


# ------------- Voice -------------
@api.post("/voice/transcribe")
async def voice_transcribe(file: UploadFile = File(...)):
    if not llm_available():
        raise HTTPException(status_code=503,
                            detail="Voice not configured. Add EMERGENT_LLM_KEY to enable speech-to-text.")
    contents = await file.read()
    text, ok = await transcribe_audio(contents, filename=file.filename or "audio.webm")
    if not ok:
        raise HTTPException(status_code=502, detail="Transcription failed. Please try again.")
    return {"text": text}


@api.post("/voice/speak")
async def voice_speak(req: SpeakRequest):
    if not llm_available():
        raise HTTPException(status_code=503,
                            detail="Voice not configured. Add EMERGENT_LLM_KEY to enable text-to-speech.")
    b64, ok = await synthesize_speech(req.text, voice=req.voice)
    if not ok:
        raise HTTPException(status_code=502, detail="Speech synthesis failed.")
    return {"audio_base64": b64, "format": "mp3"}


# ------------- Startup: seed demo knowledge base -------------
@app.on_event("startup")
async def seed_demo():
    for demo in DEMO_DOCUMENTS:
        existing = await documents.find_one({"filename": demo["filename"], "is_demo": True})
        if existing:
            continue
        doc_id = new_id()
        chunks = chunk_text(demo["text"])
        chunk_docs = [{
            "id": new_id(), "document_id": doc_id, "document_name": demo["filename"],
            "chunk_index": i, "text": c,
        } for i, c in enumerate(chunks)]
        if chunk_docs:
            await document_chunks.insert_many(chunk_docs)
            index_chunks(chunk_docs)
        await documents.insert_one({
            "id": doc_id, "filename": demo["filename"], "status": "READY",
            "num_chunks": len(chunk_docs), "upload_date": now_iso(),
            "is_demo": True, "size_kb": round(len(demo["text"]) / 1024, 1),
        })
    logger.info("MediMind startup complete. LLM=%s WebProvider=%s", llm_available(), web_provider())


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
