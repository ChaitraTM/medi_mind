"""Local, persistent RAG retrieval for MediMind.

Modular design: retrieval is a pure-Python TF-IDF cosine implementation backed
by MongoDB (chunks persisted in `document_chunks`). This keeps the app running
reliably in any environment. Qdrant can be swapped in later behind `retrieve()`.
"""
import re
import math
from collections import Counter
from typing import List, Dict

from db import document_chunks

_WORD_RE = re.compile(r"[a-zA-Z]+")
_STOP = set(
    "the a an and or of to in is are was were be been being for on with as by at "
    "this that these those it its from into can could should would may might will "
    "shall do does did have has had not no yes if then than so such about which who "
    "whom what when where why how you your they them their he she his her we our us".split()
)


def tokenize(text: str) -> List[str]:
    return [w for w in _WORD_RE.findall(text.lower()) if len(w) > 2 and w not in _STOP]


def chunk_text(text: str, chunk_size: int = 120, overlap: int = 25) -> List[str]:
    """Split text into word-count chunks with overlap for context continuity."""
    words = text.split()
    if not words:
        return []
    chunks, start = [], 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        if end == len(words):
            break
        start = end - overlap
    return chunks


def _vec(tokens: List[str]) -> Dict[str, float]:
    return dict(Counter(tokens))


def _cosine_tfidf(q_tokens: List[str], d_tokens: List[str], idf: Dict[str, float]) -> float:
    qv, dv = _vec(q_tokens), _vec(d_tokens)
    common = set(qv) & set(dv)
    if not common:
        return 0.0
    num = sum(qv[t] * dv[t] * (idf.get(t, 1.0) ** 2) for t in common)
    q_norm = math.sqrt(sum((qv[t] * idf.get(t, 1.0)) ** 2 for t in qv))
    d_norm = math.sqrt(sum((dv[t] * idf.get(t, 1.0)) ** 2 for t in dv))
    if q_norm == 0 or d_norm == 0:
        return 0.0
    return num / (q_norm * d_norm)


async def retrieve(query: str, document_id: str | None = None, top_k: int = 4) -> List[Dict]:
    """Retrieve top_k relevant chunks. Returns list with `relevance` (0..1)."""
    q_filter = {"document_id": document_id} if document_id else {}
    chunks = await document_chunks.find(q_filter, {"_id": 0}).to_list(5000)
    if not chunks:
        return []

    tokenized = [(c, tokenize(c["text"])) for c in chunks]
    n = len(tokenized)
    df: Counter = Counter()
    for _, toks in tokenized:
        for t in set(toks):
            df[t] += 1
    idf = {t: math.log((n + 1) / (c + 1)) + 1.0 for t, c in df.items()}

    q_tokens = tokenize(query)
    scored = []
    for c, toks in tokenized:
        score = _cosine_tfidf(q_tokens, toks, idf)
        if score > 0:
            scored.append((score, c))
    scored.sort(key=lambda x: x[0], reverse=True)

    results = []
    for score, c in scored[:top_k]:
        results.append(
            {
                "document_id": c["document_id"],
                "document_name": c.get("document_name", "Unknown"),
                "chunk_index": c["chunk_index"],
                "text": c["text"],
                "relevance": round(float(score), 4),
            }
        )
    return results
