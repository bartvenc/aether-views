# main.py

import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import structlog
from pydantic import BaseModel
import os
from app.queue_manager import RequestQueue
from app.llm_providers import OllamaProvider, RunpodProvider
from app.search_agent import OnlineAgent
from config import LocalConfig, RemoteConfig

logger = structlog.get_logger()
app = FastAPI(title="Aether Views API", version="1.0.0")

config = RemoteConfig() if os.getenv("SERVER_TYPE") == "remote" else LocalConfig()

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.getenv("SERVER_TYPE") == "remote":
    llm_provider = RunpodProvider(
        api_key=config.RUNPOD_API_KEY,
        endpoint_url=config.RUNPOD_ENDPOINT
    )
else:
    llm_provider = OllamaProvider(
        host=config.OLLAMA_HOST,
        model=config.OLLAMA_MODEL
    )

searcher = OnlineAgent(llm=llm_provider, temperature=0.8)
recommend_queue = RequestQueue(max_workers=1)
search_queue = RequestQueue(max_workers=1)


class QueryRequest(BaseModel):
    query: str


class SearchManager:
    def __init__(self, searcher):
        self.recommend_queue = RequestQueue(max_workers=1)
        self.search_queue = RequestQueue(max_workers=1)
        self.searcher = searcher
        self.processing_lock = asyncio.Lock()

    async def process_request(self, query: str, is_recommendation: bool = True) -> str:
        async with self.processing_lock:
            if is_recommendation:
                request_id = self.recommend_queue.add_request(
                    query, self.searcher.recommend_series_or_movies)
                self.recommend_queue.process_next()
            else:
                request_id = self.search_queue.add_request(
                    query, self.searcher.searchOnline)
                self.search_queue.process_next()
            return request_id


search_manager = SearchManager(searcher)


@app.post("/recommend")
async def recommend(request: QueryRequest):
    logger.info("recommendation_request", query=request.query)
    request_id = recommend_queue.add_request(
        query=request.query,
        processor_func=searcher.recommend_series_or_movies
    )
    recommend_queue.process_next()
    return {"request_id": request_id, "source": "local"}


@app.post("/search")
async def search(request: QueryRequest):
    logger.info("search_request", query=request.query)
    request_id = search_queue.add_request(
        query=request.query,
        processor_func=searcher.searchOnline
    )
    return {"request_id": request_id, "source": "local"}


@app.get("/status/{request_type}/{request_id}")
async def get_status(request_type: str, request_id: str):
    if request_type not in ['recommend', 'search']:
        raise HTTPException(status_code=400, detail="Invalid request type")

    queue = recommend_queue if request_type == 'recommend' else search_queue
    status = queue.get_status(request_id)

    if status['status'] == 'completed':
        return {
            "status": "completed",
            "position": -1,
            "result": {
                "recommendations": status['result'] if request_type == 'recommend' else [],
                "results": status['result'] if request_type == 'search' else []
            }
        }

    return status


@app.get("/health")
async def health_check():
    return {"message": "OK"}


@app.get("/")
async def root():
    return {"message": "OK"}
