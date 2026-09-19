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

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
    from sentence_transformers import SentenceTransformer
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False
    
import logging
logger = logging.getLogger("medimind.rag")

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


async def _retrieve_tfidf(query: str, document_id: str | None = None, top_k: int = 4) -> List[Dict]:
    """Retrieve top_k relevant chunks using TF-IDF."""
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


# ---------------- Semantic & Qdrant Setup ----------------
COLLECTION_NAME = "medimind_chunks"

_qdrant = None
_embedder = None

def get_embedder():
    global _embedder
    if _embedder is None and QDRANT_AVAILABLE:
        logger.info("Loading sentence-transformers model...")
        _embedder = SentenceTransformer('all-MiniLM-L6-v2')
    return _embedder

def get_qdrant():
    global _qdrant
    if _qdrant is None and QDRANT_AVAILABLE:
        import os
        qdrant_url = os.environ.get("QDRANT_URL")
        qdrant_api_key = os.environ.get("QDRANT_API_KEY")
        if qdrant_url:
            _qdrant = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        else:
            _qdrant = QdrantClient(path="qdrant_data")
            
        try:
            _qdrant.get_collection(COLLECTION_NAME)
        except Exception:
            embedder = get_embedder()
            if embedder:
                dim = embedder.get_sentence_embedding_dimension()
                _qdrant.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
                )
    return _qdrant


def index_chunks(chunks: List[Dict]):
    """Index a list of chunk dictionaries into Qdrant."""
    if not QDRANT_AVAILABLE:
        return
    try:
        qclient = get_qdrant()
        embedder = get_embedder()
        if not qclient or not embedder or not chunks:
            return

        texts = [c["text"] for c in chunks]
        embeddings = embedder.encode(texts)
        
        points = []
        for i, c in enumerate(chunks):
            points.append(
                PointStruct(
                    id=c["id"],
                    vector=embeddings[i].tolist(),
                    payload={
                        "document_id": c["document_id"],
                        "document_name": c.get("document_name", "Unknown"),
                        "chunk_index": c["chunk_index"],
                        "text": c["text"],
                    }
                )
            )
        qclient.upsert(collection_name=COLLECTION_NAME, points=points)
    except Exception as e:
        logger.error(f"Failed to index chunks to Qdrant: {e}")


def delete_document_chunks(document_id: str):
    """Delete chunks of a document from Qdrant."""
    if not QDRANT_AVAILABLE:
        return
    try:
        qclient = get_qdrant()
        if qclient:
            qclient.delete(
                collection_name=COLLECTION_NAME,
                points_selector=Filter(
                    must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
                )
            )
    except Exception as e:
        logger.error(f"Failed to delete document from Qdrant: {e}")


async def _retrieve_semantic(query: str, document_id: str | None = None, top_k: int = 4) -> List[Dict]:
    qclient = get_qdrant()
    embedder = get_embedder()
    if not qclient or not embedder:
        return []
        
    query_vector = embedder.encode([query])[0].tolist()
    
    query_filter = None
    if document_id:
        query_filter = Filter(
            must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
        )
        
    results = qclient.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=query_filter,
        limit=top_k,
    )
    
    scored = []
    for res in results.points:
        payload = res.payload
        scored.append({
            "document_id": payload["document_id"],
            "document_name": payload.get("document_name", "Unknown"),
            "chunk_index": payload["chunk_index"],
            "text": payload["text"],
            "relevance": round(float(res.score), 4),
        })
    return scored


async def retrieve(query: str, document_id: str | None = None, top_k: int = 4) -> List[Dict]:
    """Retrieve top_k relevant chunks using Hybrid (Semantic + TF-IDF) if available."""
    tfidf_results = await _retrieve_tfidf(query, document_id, top_k=top_k*2)
    
    if not QDRANT_AVAILABLE:
        return tfidf_results[:top_k]
        
    try:
        semantic_results = await _retrieve_semantic(query, document_id, top_k=top_k*2)
    except Exception as e:
        logger.warning(f"Semantic retrieval failed: {e}. Falling back to TF-IDF.")
        return tfidf_results[:top_k]
        
    # Hybrid merging (Reciprocal Rank Fusion)
    rrf = {}
    lookup = {}
    
    for rank, res in enumerate(semantic_results):
        key = (res["document_id"], res["chunk_index"])
        rrf[key] = rrf.get(key, 0.0) + (1.0 / (60.0 + rank + 1.0))
        lookup[key] = res
        
    for rank, res in enumerate(tfidf_results):
        key = (res["document_id"], res["chunk_index"])
        rrf[key] = rrf.get(key, 0.0) + (1.0 / (60.0 + rank + 1.0))
        if key not in lookup:
            lookup[key] = res
            
    sorted_keys = sorted(rrf.keys(), key=lambda k: rrf[k], reverse=True)
    
    final_results = []
    for k in sorted_keys[:top_k]:
        r = lookup[k].copy()
        # Scale RRF score to 0..1 roughly for the confidence estimator
        scaled_relevance = min(rrf[k] * 30.0, 1.0)
        r["relevance"] = round(scaled_relevance, 4)
        final_results.append(r)
        
    return final_results
