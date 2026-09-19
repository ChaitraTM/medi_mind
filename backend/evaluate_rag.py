import asyncio
import logging
from typing import List, Dict

from rag import retrieve, _retrieve_tfidf, _retrieve_semantic, QDRANT_AVAILABLE

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("evaluate_rag")

# Sample evaluation dataset based on the demo documents
TEST_QUERIES = [
    {
        "query": "What are the symptoms of iron deficiency anemia?",
        "expected_keywords": ["fatigue", "weakness", "pale", "shortness of breath", "pica"]
    },
    {
        "query": "How is type 2 diabetes managed?",
        "expected_keywords": ["metformin", "lifestyle", "sglt2", "glp-1"]
    },
    {
        "query": "What are the recommended blood pressure targets?",
        "expected_keywords": ["130", "80", "ace", "arb"]
    },
    {
        "query": "How is community-acquired pneumonia treated?",
        "expected_keywords": ["curb", "antibiotics", "vaccination"]
    }
]

def calculate_metrics(results: List[Dict], expected_keywords: List[str]):
    """Calculate basic retrieval metrics."""
    if not results:
        return {"recall": 0.0, "mrr": 0.0}
        
    hits = 0
    first_hit_rank = 0
    
    for rank, res in enumerate(results, 1):
        text = res["text"].lower()
        # A result is considered relevant if it contains at least 2 of the expected keywords
        found = sum(1 for k in expected_keywords if k.lower() in text)
        if found >= 2:
            hits += 1
            if first_hit_rank == 0:
                first_hit_rank = rank
                
    recall = 1.0 if hits > 0 else 0.0
    mrr = (1.0 / first_hit_rank) if first_hit_rank > 0 else 0.0
    
    return {"recall": recall, "mrr": mrr}

async def run_eval(method_name: str, retrieval_func):
    logger.info(f"--- Evaluating {method_name} ---")
    total_recall = 0.0
    total_mrr = 0.0
    
    for item in TEST_QUERIES:
        results = await retrieval_func(item["query"], top_k=4)
        metrics = calculate_metrics(results, item["expected_keywords"])
        total_recall += metrics["recall"]
        total_mrr += metrics["mrr"]
        
    avg_recall = total_recall / len(TEST_QUERIES)
    avg_mrr = total_mrr / len(TEST_QUERIES)
    
    logger.info(f"Results for {method_name}: Recall@4 = {avg_recall:.2f}, MRR = {avg_mrr:.2f}")

async def main():
    logger.info(f"Qdrant / Semantic available: {QDRANT_AVAILABLE}")
    
    await run_eval("TF-IDF", _retrieve_tfidf)
    
    if QDRANT_AVAILABLE:
        await run_eval("Semantic", _retrieve_semantic)
        await run_eval("Hybrid", retrieve)

if __name__ == "__main__":
    asyncio.run(main())
