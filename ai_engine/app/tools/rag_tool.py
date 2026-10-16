import os
import pickle
import asyncio
import numpy as np
from qdrant_client import QdrantClient
from flashrank import Ranker, RerankRequest
from google import genai
from google.genai import types

client = genai.Client()

# Initialize the global FlashRanker model once on load to avoid loading overhead per query
try:
    ranker = Ranker(model_name="ms-marco-MiniLM-L-12-v2")
except Exception as e:
    import logging
    logging.error(f"Failed to initialize FlashRanker model: {str(e)}")
    ranker = None

async def search_knowledge_base(query: str, kb_id: str) -> str:
    """
    Search the specified knowledge base for relevant passages using hybrid search (BM25 + Qdrant) 
    combined via RRF and reranked with FlashRank.
    """
    try:
        bm25_pickle_path = f"app/data/bm25/bm25_{kb_id}.pkl"
        if not os.path.exists(bm25_pickle_path):
            return f"Error: Knowledge base index '{kb_id}' not found."

        # 1. Load BM25 index and raw texts
        def load_bm25():
            with open(bm25_pickle_path, "rb") as f:
                return pickle.load(f)

        data = await asyncio.to_thread(load_bm25)
        bm25 = data["bm25"]
        texts_for_bm25 = data["texts"]

        # 2. Run BM25 search (top 25)
        def run_bm25_search():
            tokenized_query = query.lower().split()
            bm25_scores = bm25.get_scores(tokenized_query)
            bm25_top_indices = np.argsort(bm25_scores)[::-1][:25]
            return [texts_for_bm25[i] for i in bm25_top_indices]

        bm25_results = await asyncio.to_thread(run_bm25_search)

        # 3. Run Qdrant vector search (top 25)
        response = await client.aio.models.embed_content(
            model="models/gemini-embedding-2",
            contents=query,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        query_vector = response.embeddings[0].values

        def run_qdrant_search():
            qdrant = QdrantClient(path="app/data/qdrant_db")
            collection_name = f"kb_{kb_id}"
            
            if not qdrant.collection_exists(collection_name):
                return []
                
            qdrant_hits = qdrant.query_points(
                collection_name=collection_name,
                query=query_vector,
                limit=25
            ).points
            return [hit.payload["text"] for hit in qdrant_hits]

        vector_results = await asyncio.to_thread(run_qdrant_search)

        # 4. Reciprocal Rank Fusion (RRF, k=60)
        rrf_scores = {}
        K = 60

        for rank, text in enumerate(bm25_results):
            rrf_scores[text] = rrf_scores.get(text, 0.0) + 1.0 / (K + rank)

        for rank, text in enumerate(vector_results):
            rrf_scores[text] = rrf_scores.get(text, 0.0) + 1.0 / (K + rank)

        # Sort by fused score descending, take top 25 chunks
        sorted_chunks = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        top_chunks = [text for text, score in sorted_chunks[:25]]

        if not top_chunks:
            return "No relevant context found in this knowledge base."

        # 5. Rerank with FlashRank (ms-marco-MiniLM-L-12-v2)
        if ranker is None:
            # Fallback if ranker failed to load
            return "\n\n---\n\n".join(top_chunks[:5])

        def run_flashrank():
            passages = [{"id": i, "text": chunk} for i, chunk in enumerate(top_chunks)]
            rerank_request = RerankRequest(query=query, passages=passages)
            results = ranker.rerank(rerank_request)
            return [result["text"] for result in results[:5]]

        final_chunks = await asyncio.to_thread(run_flashrank)

        # 6. Join the text chunks with separators
        return "\n\n---\n\n".join(final_chunks)

    except Exception as e:
        import logging
        logging.error(f"Search knowledge base error for kb_id {kb_id}: {str(e)}")
        return f"Error searching knowledge base: {str(e)}"
