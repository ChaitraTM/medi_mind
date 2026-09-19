"""Web search agent with Tavily support and a built-in demo fallback."""
import os
import logging

logger = logging.getLogger("medimind.web")

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")

# Small, safe, clearly-labelled demo knowledge for the fallback search.
DEMO_WEB_CORPUS = [
    {
        "title": "Iron Deficiency Anemia — Overview (Demo Web Source)",
        "content": "Iron deficiency anemia is the most common nutritional deficiency worldwide. Common symptoms include fatigue, weakness, pale skin, shortness of breath, dizziness, cold hands and feet, brittle nails and pica. Management typically involves identifying the cause and oral iron supplementation.",
        "url": "https://demo.medimind.local/anemia",
        "keywords": ["anemia", "iron", "fatigue", "deficiency", "symptoms"],
    },
    {
        "title": "Type 2 Diabetes — Current Management (Demo Web Source)",
        "content": "Management of type 2 diabetes emphasises lifestyle modification, metformin as first-line therapy, and newer agents such as SGLT2 inhibitors and GLP-1 receptor agonists which also offer cardiovascular and renal benefits. Individualised HbA1c targets are recommended.",
        "url": "https://demo.medimind.local/diabetes",
        "keywords": ["diabetes", "metformin", "sglt2", "glp-1", "treatment", "hba1c"],
    },
    {
        "title": "Hypertension Guidelines Summary (Demo Web Source)",
        "content": "Blood pressure targets are generally below 130/80 mmHg for most adults. First-line agents include ACE inhibitors, ARBs, calcium channel blockers and thiazide diuretics. Lifestyle measures include reduced sodium intake, weight loss and regular exercise.",
        "url": "https://demo.medimind.local/hypertension",
        "keywords": ["hypertension", "blood pressure", "ace", "arb", "guidelines", "treatment"],
    },
    {
        "title": "Community-Acquired Pneumonia — Recent Recommendations (Demo Web Source)",
        "content": "Recent recommendations for community-acquired pneumonia emphasise severity assessment (e.g., CURB-65), appropriate empirical antibiotics, and de-escalation based on culture results. Vaccination remains a key preventive measure.",
        "url": "https://demo.medimind.local/pneumonia",
        "keywords": ["pneumonia", "antibiotics", "curb-65", "respiratory", "infection"],
    },
    {
        "title": "General Medical Evidence Note (Demo Web Source)",
        "content": "This is a demonstration web result used when no external search provider is configured. It provides general, educational, non-diagnostic information for academic project demonstration only.",
        "url": "https://demo.medimind.local/general",
        "keywords": [],
    },
]


async def _tavily_search(query: str, max_results: int = 4):
    import requests
    resp = requests.post(
        "https://api.tavily.com/search",
        json={"api_key": TAVILY_API_KEY, "query": query, "max_results": max_results,
              "search_depth": "basic", "include_answer": False},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    return [
        {"title": r.get("title", "Result"), "content": r.get("content", ""),
         "url": r.get("url", ""), "score": float(r.get("score", 0.5)), "provider": "tavily"}
        for r in data.get("results", [])
    ]


def _demo_search(query: str, max_results: int = 2):
    import requests
    try:
        url = "https://en.wikipedia.org/w/api.php"
        # Search for titles
        search_params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "format": "json",
            "utf8": 1,
            "srlimit": max_results
        }
        res = requests.get(url, params=search_params, timeout=10)
        res.raise_for_status()
        search_data = res.json()
        
        results = []
        for item in search_data.get("query", {}).get("search", []):
            title = item["title"]
            
            # Fetch snippet for the title
            extract_params = {
                "action": "query",
                "prop": "extracts",
                "exchars": 800,
                "explaintext": 1,
                "titles": title,
                "format": "json"
            }
            ex_res = requests.get(url, params=extract_params, timeout=10)
            ex_res.raise_for_status()
            pages = ex_res.json().get("query", {}).get("pages", {})
            
            for page_id, page_data in pages.items():
                if "extract" in page_data:
                    results.append({
                        "title": f"Wikipedia: {title}",
                        "content": page_data["extract"],
                        "url": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
                        "score": 0.85,
                        "provider": "wikipedia"
                    })
        
        if results:
            return results
    except Exception as e:
        logger.warning("Wikipedia API failed: %s", e)
        
    # Fallback to local demo corpus if Wikipedia fails or has no results
    low = query.lower()
    scored = []
    for item in DEMO_WEB_CORPUS:
        score = sum(1 for k in item["keywords"] if k in low)
        scored.append((score, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    picked = [s for s in scored if s[0] > 0][:max_results]
    if not picked:
        picked = [(0, DEMO_WEB_CORPUS[-1])]
    return [
        {"title": item["title"], "content": item["content"], "url": item["url"],
         "score": 0.35 + 0.1 * min(score, 3), "provider": "demo"}
        for score, item in picked
    ]

async def web_search(query: str, max_results: int = 4):
    if TAVILY_API_KEY:
        try:
            return await _tavily_search(query, max_results)
        except Exception as e:  # noqa: BLE001
            logger.warning("Tavily failed, falling back to wikipedia/demo search: %s", e)
    return _demo_search(query, max_results)


def web_provider() -> str:
    return "tavily" if TAVILY_API_KEY else "demo"
