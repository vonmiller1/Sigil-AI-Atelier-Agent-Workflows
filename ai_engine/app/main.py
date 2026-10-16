import os
import sys
import json
import shutil
import pickle
import time
import asyncio
from dotenv import load_dotenv

# Ensure workspace root and engine root are in sys.path - reload trigger v10
current_dir = os.path.dirname(os.path.abspath(__file__))
app_dir = os.path.dirname(current_dir)
engine_dir = app_dir
workspace_root = os.path.dirname(engine_dir)

if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)
if engine_dir not in sys.path:
    sys.path.insert(0, engine_dir)

# Load environment keys absolutely
load_dotenv(os.path.join(engine_dir, ".env"), override=True)

from google import genai
from google.genai import types

client = genai.Client()

from fastapi import FastAPI, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import httpx
import uvicorn
from langchain_core.messages import HumanMessage

# RAG imports
from llama_parse import LlamaParse
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from rank_bm25 import BM25Okapi


from call_model import test_model_call, execute_chat_completion
from app.schemas.agent_schema import RunRequest
from app.agents.graph import compiled_graph

app = FastAPI(
    title="Yakkay AI Engine",
    description="Python Microservice for managing model endpoints and agent routing.",
    version="1.0.0"
)

@app.get("/api/engine/debug-env")
async def debug_env():
    import os
    # Return masked keys to avoid printing secrets, but enough to verify correctness
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    google_key = os.environ.get("GOOGLE_API_KEY", "")
    return {
        "GEMINI_API_KEY_prefix": gemini_key[:8] if gemini_key else None,
        "GEMINI_API_KEY_suffix": gemini_key[-8:] if gemini_key else None,
        "GOOGLE_API_KEY_prefix": google_key[:8] if google_key else None,
        "GOOGLE_API_KEY_suffix": google_key[-8:] if google_key else None,
        "client_has_key": hasattr(client, "api_key") or hasattr(client, "_api_key") or client._config.api_key is not None
    }


# Provider Standard Base URLs
PROVIDER_URL_MAP = {
    "OpenAI": "https://api.openai.com/v1",
    "Groq": "https://api.groq.com/openai/v1",
    "Cerebras": "https://api.cerebras.ai/v1",
    "Gemini": "https://generativelanguage.googleapis.com/v1beta/openai",
    "Mistral": "https://api.mistral.ai/v1"
}

class CatalogRequest(BaseModel):
    provider_name: str = Field(..., description="Provider Name: OpenAI, Groq, Cerebras, Gemini, Mistral, or Custom")
    api_key: str = Field(..., description="API Access Key")
    custom_base_url: Optional[str] = Field(None, description="Fallback URL for Custom provider configurations")


@app.post("/api/ai/models/fetch-catalog", status_code=200)
async def fetch_catalog(payload: CatalogRequest):
    provider = payload.provider_name
    api_key = payload.api_key
    custom_url = payload.custom_base_url

    if provider in PROVIDER_URL_MAP:
        base_url = PROVIDER_URL_MAP[provider]
    else:
        if not custom_url:
            raise HTTPException(
                status_code=400,
                detail="Custom provider selected but no custom_base_url was provided."
            )
        base_url = custom_url

    base_url = base_url.strip()
    if "openrouter.ai" in base_url.lower():
        base_url = "https://openrouter.ai/api/v1"
    else:
        base_url = base_url.rstrip("/")
        for suffix in ["/models", "/chat/completions", "/completions", "/chat"]:
            if base_url.lower().endswith(suffix):
                base_url = base_url[:-len(suffix)]
                base_url = base_url.rstrip("/")
                break

    catalog_url = f"{base_url}/models"

    try:
        headers = {"Authorization": f"Bearer {api_key}"}
        async with httpx.AsyncClient(follow_redirects=True) as client:
            try:
                response = await client.get(catalog_url, headers=headers, timeout=10.0)
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Network error communicating with provider: {str(e)}")

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"External provider API key validation failed: {response.text}"
                )
                
            data = response.json()
            raw_models = data.get("data", [])
            if isinstance(data, list):
                raw_models = data
            elif not raw_models and isinstance(data, dict):
                raw_models = [{"id": k} for k in data.keys()]
            
            chat_candidates = []
            for m in raw_models:
                m_id = str(m.get("id", "")).lower()
                if any(junk in m_id for junk in ["embedding", "tts", "whisper", "dall-e", "babbage", "davinci", "text-search"]):
                    continue
                chat_candidates.append(m.get("id"))

            valid_models = []
            for model_id in chat_candidates:
                valid_models.append({
                    "id": model_id,
                    "provider": provider
                })

        if len(valid_models) == 0:
            raise HTTPException(
                status_code=404, 
                detail="No chat models found or available under this provider."
            )

        return {"success": True, "models": valid_models}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred during validation: {str(e)}"
        )


class TestModelRequest(BaseModel):
    provider_name: str = Field(..., description="Provider Name: OpenAI, Groq, Cerebras, Gemini, Mistral, or Custom")
    api_key: str = Field(..., description="API Access Key")
    custom_base_url: Optional[str] = Field(None, description="Fallback URL for Custom provider configurations")
    model_id: str = Field(..., description="Model ID to test")


@app.post("/api/ai/models/test-model", status_code=200)
async def test_model_endpoint(payload: TestModelRequest):
    result = await test_model_call(
        provider_name=payload.provider_name,
        api_key=payload.api_key,
        custom_base_url=payload.custom_base_url,
        model_id=payload.model_id
    )
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("status_code", 400),
            detail=result.get("error", "Failed to contact selected model.")
        )
    return result


class DatabaseTestRequest(BaseModel):
    engine: str = Field(..., description="Database engine type: postgresql or mysql")
    host: str = Field(..., description="Database hostname or IP")
    port: int = Field(..., description="Database port number")
    databaseName: str = Field(..., description="Database name")
    username: str = Field(..., description="Database username")
    password: str = Field(default="", description="Database password")
    sslMode: bool = Field(False, description="Whether to use SSL mode")


@app.post("/api/engine/database/test", status_code=200)
async def test_database_endpoint(payload: DatabaseTestRequest):
    from app.utils.db_manager import db_manager
    try:
        # Run synchronous db connection check in a thread to keep FastAPI non-blocking
        await asyncio.to_thread(db_manager.test_temp_connection, payload.dict())
        return {"success": True, "message": "Database connection verified successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Database connection verification failed: {str(e)}"
        )


SCHEMA_CACHE = {}

def reflect_schema(db_connection_id: str, nocache: bool = False):
    if not nocache and db_connection_id in SCHEMA_CACHE:
        return SCHEMA_CACHE[db_connection_id]

    from app.utils.db_manager import db_manager
    from sqlalchemy import inspect
    
    engine = db_manager.get_engine(db_connection_id)
    inspector = inspect(engine)
    
    schema_list = []
    for table_name in inspector.get_table_names():
        try:
            pk_constraint = inspector.get_pk_constraint(table_name) or {}
            pk_cols = set(pk_constraint.get("constrained_columns", []))
        except Exception:
            pk_cols = set()
            
        columns = []
        try:
            for col in inspector.get_columns(table_name):
                col_name = col["name"]
                col_type = str(col["type"])
                nullable = col.get("nullable", True)
                is_pk = col_name in pk_cols or col.get("primary_key", False)
                columns.append({
                    "name": col_name,
                    "type": col_type,
                    "nullable": nullable,
                    "primary_key": is_pk
                })
        except Exception as e:
            # If get_columns fails for a specific table, still include table but with empty columns
            pass
            
        try:
            fkeys = inspector.get_foreign_keys(table_name) or []
        except Exception:
            fkeys = []
            
        schema_list.append({
            "table": table_name,
            "columns": columns,
            "foreign_keys": fkeys
        })
    
    SCHEMA_CACHE[db_connection_id] = schema_list
    return schema_list


@app.get("/api/engine/database/{db_connection_id}/schema")
async def get_database_schema(db_connection_id: str, nocache: bool = False):
    try:
        schema = await asyncio.to_thread(reflect_schema, db_connection_id, nocache)
        return {"status": "success", "schema": schema}
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail=f"Database connection not found: {str(e)}"
            )
        raise HTTPException(
            status_code=400,
            detail=f"Failed to reflect database schema: {str(e)}"
        )


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the sender (system, user, assistant)")
    content: str = Field(..., description="Content of the message")


class ChatRequest(BaseModel):
    provider_name: str = Field(..., description="Provider Name: OpenAI, Groq, Cerebras, Gemini, Mistral, or Custom")
    api_key: str = Field(..., description="API Access Key")
    custom_base_url: Optional[str] = Field(None, description="Fallback URL for Custom provider configurations")
    model_id: str = Field(..., description="Model ID to invoke")
    messages: List[ChatMessage] = Field(..., description="History of chat messages")


@app.post("/api/ai/models/chat", status_code=200)
async def chat_endpoint(payload: ChatRequest):
    msg_list = [{"role": m.role, "content": m.content} for m in payload.messages]
    result = await execute_chat_completion(
        provider_name=payload.provider_name,
        api_key=payload.api_key,
        custom_base_url=payload.custom_base_url,
        model_id=payload.model_id,
        messages=msg_list
    )
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("status_code", 500),
            detail=result.get("error", "Failed to complete chat invocation.")
        )
    return result


def get_message_content_as_str(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                if "text" in block:
                    parts.append(block["text"])
                elif block.get("type") == "text" and "text" in block:
                    parts.append(block["text"])
        return "".join(parts)
    if isinstance(content, dict):
        if "text" in content:
            return content["text"]
        elif content.get("type") == "text" and "text" in content:
            return content["text"]
    return str(content)


@app.post("/api/engine/run", status_code=200)
async def run_engine(payload: RunRequest):
    # 1. Prepare initial graph state
    initial_state = {
        "messages": [HumanMessage(content=payload.prompt)],
        "instructions": payload.agent_config.instructions,
        "tools": payload.agent_config.tools,
        "auth_vault": payload.auth_vault,
        "provider_name": payload.agent_config.provider_name,
        "api_key": payload.agent_config.api_key,
        "custom_base_url": payload.agent_config.custom_base_url,
        "model_id": payload.agent_config.model_id,
        "active_kb_ids": payload.agent_config.active_kb_ids,
        "active_db_ids": payload.agent_config.active_db_ids,
        "trace": []
    }

    async def event_generator():
        last_assistant_message = ""
        try:
            # Run graph using astream to capture events in real time
            async for event in compiled_graph.astream(initial_state):
                for node_name, node_output in event.items():
                    # Yield any newly added trace events
                    trace_list = node_output.get("trace", [])
                    for trace_item in trace_list:
                        yield f"data: {json.dumps(trace_item)}\n\n"

                    # Track last assistant response text
                    messages = node_output.get("messages", [])
                    if messages:
                        last_msg = messages[-1]
                        if hasattr(last_msg, "type") and last_msg.type == "ai":
                            last_assistant_message = get_message_content_as_str(last_msg.content)

            # Yield final final_output text
            yield f"data: {json.dumps({'type': 'final_output', 'output': last_assistant_message})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


async def run_ingestion_in_background(kb_id: str, temp_file_path: str):
    try:
        # 1. Run LlamaParse Ingestion
        parser = LlamaParse(result_type="markdown")
        documents = await asyncio.to_thread(parser.load_data, temp_file_path)
        parsed_text = "\n\n".join(doc.text for doc in documents)

        # 2. Two-step structural Markdown chunking logic
        headers_to_split_on = [("#", "Header 1"), ("##", "Header 2"), ("###", "Header 3")]
        markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
        md_docs = markdown_splitter.split_text(parsed_text)
        
        recursive_splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=200)
        chunks = recursive_splitter.split_documents(md_docs)

        if not chunks:
            raise ValueError("No text chunks found in document")

        # 3. Embed chunks in batches with rate limit safety sleeps
        chunk_embeddings = []
        # 80 chunks * ~300 tokens/chunk = ~24,000 tokens (Safely under 30K TPM limit)
        batch_size = 80
        total_batches = (len(chunks) - 1) // batch_size + 1

        for i in range(0, len(chunks), batch_size):
            batch_chunks = chunks[i : i + batch_size]
            
            # Convert LangChain Documents to native Google GenAI Content types
            batch_contents = [
                types.Content(parts=[types.Part.from_text(text=doc.page_content)])
                for doc in batch_chunks
            ]

            print(f"  Embedding batch {i // batch_size + 1}/{total_batches} ({len(batch_chunks)} chunks)...")

            # Execute native batch embedding
            response = await client.aio.models.embed_content(
                model="models/gemini-embedding-2",
                contents=batch_contents,
                config=types.EmbedContentConfig(output_dimensionality=768)
            )

            # Extract values and append
            batch_embs = [emb.values for emb in response.embeddings]
            chunk_embeddings.extend(batch_embs)

            # Throttle by 60 seconds to completely reset the 30K TPM window
            if i + batch_size < len(chunks):
                print("  Sleeping for 60 seconds to respect the 30K Tokens-Per-Minute limit...")
                await asyncio.sleep(60)

        # 4. Persistent Qdrant Store
        qdrant = QdrantClient(path="app/data/qdrant_db")
        collection_name = f"kb_{kb_id}"
        
        # Recreate collection to overwrite if exists
        if qdrant.collection_exists(collection_name):
            qdrant.delete_collection(collection_name)

        qdrant.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=768, distance=Distance.COSINE),
        )

        points = [
            PointStruct(
                id=idx,
                vector=chunk_embeddings[idx],
                payload={"text": chunks[idx].page_content, "metadata": chunks[idx].metadata},
            )
            for idx in range(len(chunks))
        ]
        qdrant.upsert(collection_name=collection_name, points=points)

        # 5. Persistent BM25 Keyword Store
        texts_for_bm25 = [doc.page_content for doc in chunks]
        tokenized_corpus = [text.lower().split() for text in texts_for_bm25]
        bm25 = BM25Okapi(tokenized_corpus)

        # Serialize BM25 along with raw text list to pickle file
        bm25_pickle_path = f"app/data/bm25/bm25_{kb_id}.pkl"
        with open(bm25_pickle_path, "wb") as f:
            pickle.dump({
                "bm25": bm25,
                "texts": texts_for_bm25
            }, f)

        # Send webhook update: ready
        async with httpx.AsyncClient() as client_http:
            await client_http.post("http://localhost:5000/api/knowledge/status", json={
                "kb_id": kb_id,
                "status": "ready"
            })
        print(f"Ingestion background job completed and status updated for kb_id {kb_id}")

    except Exception as e:
        import logging
        logging.error(f"Ingestion background job failed for kb_id {kb_id}: {str(e)}")
        # Send webhook update: failed
        try:
            async with httpx.AsyncClient() as client_http:
                await client_http.post("http://localhost:5000/api/knowledge/status", json={
                    "kb_id": kb_id,
                    "status": "failed",
                    "error": str(e)
                })
        except Exception as web_err:
            logging.error(f"Failed to send failure webhook for kb_id {kb_id}: {str(web_err)}")

    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass


@app.post("/api/engine/knowledge/ingest", status_code=200)
async def ingest_knowledge(
    background_tasks: BackgroundTasks,
    kb_id: str = Form(...),
    file: UploadFile = File(...)
):
    temp_file_path = f"app/data/temp_{kb_id}.pdf"
    os.makedirs("app/data/bm25", exist_ok=True)
    os.makedirs("app/data/qdrant_db", exist_ok=True)

    try:
        # 1. Save uploaded file to temp path immediately
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 2. Queue the ingestion background task
        background_tasks.add_task(run_ingestion_in_background, kb_id, temp_file_path)

        return {"success": True, "message": "Ingestion initiated in background"}

    except Exception as e:
        import logging
        logging.error(f"Failed to queue ingestion for kb_id {kb_id}: {str(e)}")
        # Clean up temp file if created
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
        return {"success": False, "message": str(e)}


@app.delete("/api/engine/knowledge/{kb_id}", status_code=200)
async def delete_knowledge(kb_id: str):
    try:
        # Delete Qdrant collection from Qdrant metadata
        qdrant = QdrantClient(path="app/data/qdrant_db")
        collection_name = f"kb_{kb_id}"
        if qdrant.collection_exists(collection_name):
            qdrant.delete_collection(collection_name)

        # Forcefully delete the physical collection directory on disk to clean up empty folders
        collection_dir = f"app/data/qdrant_db/collection/{collection_name}"
        if os.path.exists(collection_dir):
            shutil.rmtree(collection_dir, ignore_errors=True)

        # Delete BM25 pickle
        bm25_pickle_path = f"app/data/bm25/bm25_{kb_id}.pkl"
        if os.path.exists(bm25_pickle_path):
            os.remove(bm25_pickle_path)

        return {"success": True, "message": "Knowledge base index cleaned up successfully"}
    except Exception as e:
        return {"success": False, "message": str(e)}

