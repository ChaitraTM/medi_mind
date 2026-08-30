"""MongoDB connection and base document helpers for MediMind."""
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Any
import uuid

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# Collections
documents = db.documents
document_chunks = db.document_chunks
conversations = db.conversations
messages = db.messages
imaging_analyses = db.imaging_analyses
clinician_reviews = db.clinician_reviews
agent_executions = db.agent_executions
evidence_sources = db.evidence_sources
