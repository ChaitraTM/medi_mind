"""MediMind end-to-end backend tests."""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or None
if not BASE_URL:
    # Fallback to reading frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Health / Config ----------
def test_health(s):
    r = s.get(f"{API}/health", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "demo_mode" in data
    assert "llm_active" in data
    assert "web_provider" in data


def test_config(s):
    r = s.get(f"{API}/config", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert "llm_model" in d and "disclaimer" in d


# ---------- Chat ----------
def test_chat_medical_qa(s):
    r = s.post(f"{API}/chat", json={"message": "What are the common symptoms of iron deficiency anemia?"}, timeout=120)
    assert r.status_code == 200
    d = r.json()
    assert "confidence_score" in d and "confidence_level" in d
    assert isinstance(d.get("sources"), list)
    assert isinstance(d.get("execution_steps"), list) and len(d["execution_steps"]) >= 3
    assert d.get("disclaimer")
    assert d.get("agent")  # some medical agent
    assert d.get("intent") in ("MEDICAL_QA", "GENERAL", "DOCUMENT_QA")


def test_chat_low_confidence_escalation(s):
    r = s.post(f"{API}/chat", json={"message": "What are the symptoms of Ehlers-Danlos syndrome?"}, timeout=180)
    assert r.status_code == 200
    d = r.json()
    # Should have handoff to web search OR agent updated to web
    labels = [st.get("label", "") for st in d.get("execution_steps", [])]
    handoff = d.get("handoff_reason") or any("Web Search" in l or "Handoff" in l for l in labels)
    assert handoff, f"Expected handoff to Web Search Agent. Steps: {labels}"


def test_chat_emergency(s):
    r = s.post(f"{API}/chat", json={"message": "I have severe chest pain and cannot breathe"}, timeout=60)
    assert r.status_code == 200
    d = r.json()
    assert d.get("emergency") is True
    assert d.get("agent") == "Safety Guardrail"
    assert "emergency" in (d.get("response") or "").lower()


def test_chat_web_research_keyword(s):
    r = s.post(f"{API}/chat", json={"message": "Find the latest treatment recommendations for hypertension"}, timeout=120)
    assert r.status_code == 200
    d = r.json()
    assert d.get("agent") == "Web Search Agent" or d.get("intent") == "WEB_RESEARCH"


def test_chat_empty(s):
    r = s.post(f"{API}/chat", json={"message": ""}, timeout=30)
    assert r.status_code == 400


# ---------- Documents ----------
def test_list_demo_documents(s):
    r = s.get(f"{API}/documents", timeout=30)
    assert r.status_code == 200
    docs = r.json()
    demo = [d for d in docs if d.get("is_demo")]
    assert len(demo) >= 3, f"Expected >=3 seeded demo docs, got {len(demo)}"
    for d in demo:
        assert d.get("status") == "READY"
        assert d.get("num_chunks", 0) > 0


def _make_pdf_bytes():
    """Create a small valid PDF using pypdf."""
    from pypdf import PdfWriter
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(100, 750, "MediMind test document.")
    c.drawString(100, 730, "Hypertension is treated with lifestyle changes and medication such as ACE inhibitors.")
    c.drawString(100, 710, "Aspirin can reduce cardiovascular risk in select patients.")
    c.save()
    return buf.getvalue()


UPLOADED = {}


def test_upload_pdf(s):
    try:
        pdf_bytes = _make_pdf_bytes()
    except Exception:
        pytest.skip("reportlab not available")
    r = requests.post(f"{API}/documents/upload",
                      files={"file": ("TEST_upload.pdf", pdf_bytes, "application/pdf")}, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "READY"
    assert d["num_chunks"] > 0
    UPLOADED["id"] = d["id"]


def test_query_demo_document(s):
    docs = s.get(f"{API}/documents").json()
    demo = next((d for d in docs if d.get("is_demo")), None)
    assert demo
    r = s.post(f"{API}/documents/{demo['id']}/query",
               json={"query": "What are the recommended treatments?"}, timeout=120)
    assert r.status_code == 200
    d = r.json()
    assert "answer" in d
    assert isinstance(d.get("sources"), list)
    assert "confidence_score" in d


def test_delete_demo_refused(s):
    docs = s.get(f"{API}/documents").json()
    demo = next((d for d in docs if d.get("is_demo")), None)
    r = s.delete(f"{API}/documents/{demo['id']}", timeout=30)
    assert r.status_code == 400


def test_delete_uploaded_doc(s):
    if not UPLOADED.get("id"):
        pytest.skip("no uploaded doc")
    r = s.delete(f"{API}/documents/{UPLOADED['id']}", timeout=30)
    assert r.status_code == 200


# ---------- Web Search ----------
def test_web_search(s):
    r = s.post(f"{API}/web-search", json={"query": "hypertension guidelines"}, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["provider"] == "demo"
    assert isinstance(d["results"], list)


# ---------- Imaging + Reviews ----------
def _tiny_png():
    # 1x1 PNG
    import base64
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    )


REVIEWS = {}


@pytest.mark.parametrize("path,key", [
    ("chest-xray", "chest"),
    ("skin-lesion", "skin"),
    ("brain-tumor", "brain"),
])
def test_imaging(path, key):
    r = requests.post(f"{API}/imaging/{path}",
                      files={"file": (f"TEST_{key}.png", _tiny_png(), "image/png")},
                      timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "PENDING CLINICIAN REVIEW"
    assert "prediction" in d and "confidence" in d
    assert "ACADEMIC DEMONSTRATION" in d["analysis"]
    assert d.get("review_id")
    REVIEWS[key] = d["review_id"]


def test_list_reviews(s):
    r = s.get(f"{API}/reviews", timeout=30)
    assert r.status_code == 200
    revs = r.json()
    assert len(revs) >= 3
    for r_ in revs[:3]:
        assert "image" in r_ and "prediction" in r_ and "confidence" in r_
        assert isinstance(r_.get("audit_trail"), list)


def test_approve_review(s):
    rid = REVIEWS.get("chest")
    assert rid
    r = s.post(f"{API}/reviews/{rid}/approve", timeout=30)
    assert r.status_code == 200
    assert r.json()["status"] == "APPROVED"
    # Re-GET to verify persistence
    revs = s.get(f"{API}/reviews").json()
    rec = next(x for x in revs if x["id"] == rid)
    assert rec["status"] == "APPROVED"
    assert any(a["action"] == "APPROVED" for a in rec["audit_trail"])


def test_reject_review(s):
    rid = REVIEWS.get("skin")
    assert rid
    r = s.post(f"{API}/reviews/{rid}/reject", timeout=30)
    assert r.status_code == 200
    assert r.json()["status"] == "REJECTED"


def test_second_review(s):
    rid = REVIEWS.get("brain")
    assert rid
    r = s.post(f"{API}/reviews/{rid}/second-review", timeout=30)
    assert r.status_code == 200
    assert r.json()["status"] == "SECOND_REVIEW"


# ---------- Analytics / Conversations / Dashboard ----------
def test_analytics(s):
    r = s.get(f"{API}/analytics", timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ["total_queries", "agent_usage", "average_confidence",
              "pending_reviews", "approved_reviews", "rejected_reviews"]:
        assert k in d
    assert d["evaluation_metrics"] == "Evaluation data not available yet."


def test_conversations(s):
    r = s.get(f"{API}/conversations", timeout=30)
    assert r.status_code == 200
    convs = r.json()
    assert isinstance(convs, list)
    if convs:
        assert isinstance(convs[0].get("messages"), list)


def test_dashboard(s):
    r = s.get(f"{API}/dashboard", timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ["total_conversations", "documents_indexed", "imaging_analyses",
              "pending_reviews", "average_confidence", "recent_activity"]:
        assert k in d


# ---------- Voice ----------
def test_voice_speak(s):
    r = s.post(f"{API}/voice/speak", json={"text": "Hello from MediMind test."}, timeout=60)
    if r.status_code == 503:
        pytest.skip("Voice not configured")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("audio_base64")


def test_voice_transcribe_missing_file():
    r = requests.post(f"{API}/voice/transcribe", timeout=30)
    assert r.status_code in (422, 400)
