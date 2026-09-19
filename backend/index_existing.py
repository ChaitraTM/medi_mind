import asyncio
import db
from rag import index_chunks

async def main():
    chunks = await db.document_chunks.find({}, {"_id": 0}).to_list(1000)
    print(f"Found {len(chunks)} chunks in MongoDB")
    index_chunks(chunks)
    print("Indexed successfully")

if __name__ == "__main__":
    asyncio.run(main())
