from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import structlog
from pydantic import BaseModel
from typing import Optional
from app.queue_manager import RequestQueue
from app.search_agent import OnlineAgent, OllamaChat
import asyncio

# Initialize logging
logger = structlog.get_logger()

# Initialize FastAPI app
app = FastAPI(title="Aether Views API", version="1.0.0")

# Add CORS middleware before initializing queues
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aetherview.netlify.app",
        "http://localhost:4200",
        "https://www.aether-view.com",
        "https://api.aether-view.com",
        "https://aether-view.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
llm = OllamaChat(model="llama3.1:latest")
searcher = OnlineAgent(llm=llm, temperature=0.8)

# Initialize queues with single worker each
recommend_queue = RequestQueue(max_workers=1)
search_queue = RequestQueue(max_workers=1)

class QueryRequest(BaseModel):
    query: str

class SearchManager:
    def __init__(self, searcher):
        self.recommend_queue = RequestQueue(max_workers=1)
        self.search_queue = RequestQueue(max_workers=1)
        self.searcher = searcher
        self.processing_lock = asyncio.Lock()  # Add processing lock

    async def process_request(self, query: str, is_recommendation: bool = True) -> str:
        async with self.processing_lock:  # Ensure sequential processing
            if is_recommendation:
                request_id = self.recommend_queue.add_request(query, self.searcher.recommend_series_or_movies)
                self.recommend_queue.process_next()
            else:
                request_id = self.search_queue.add_request(query, self.searcher.searchOnline)
                self.search_queue.process_next()
            return request_id

# Initialize the manager
search_manager = SearchManager(searcher)

@app.post("/recommend")
async def recommend(request: QueryRequest):
    logger.info("recommendation_request", query=request.query)
    request_id = recommend_queue.add_request(
        query=request.query,
        processor_func=searcher.recommend_series_or_movies
    )
    recommend_queue.process_next()
    return {"request_id": request_id}

@app.post("/search")
async def search(request: QueryRequest):
    logger.info("search_request", query=request.query)
    request_id = search_queue.add_request(
        query=request.query,
        processor_func=searcher.searchOnline  # Pass the async function
    )
    return {"request_id": request_id}

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
                # For both recommend and search, use the same structure
                "recommendations": status['result'] if request_type == 'recommend' else [],
                "results": status['result'] if request_type == 'search' else []
            }
        }
    
    return status

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "recommend_queue": recommend_queue.queue_length,
        "search_queue": recommend_queue.queue_length
    }
