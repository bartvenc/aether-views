#  backend/app/queue_manager.py
from collections import deque
from dataclasses import dataclass
from datetime import datetime
import threading
import uuid
from typing import Any, Dict, Optional, Callable
import asyncio
import time


@dataclass
class QueueItem:
    id: str
    query: str
    timestamp: datetime
    processor_func: Callable
    status: str = 'pending'
    result: Any = None
    error: Optional[str] = None


class RequestQueue:
    def __init__(self, max_workers: int = 1):
        self.queue = deque()
        self.results: Dict[str, QueueItem] = {}
        self.max_workers = max_workers
        self.active_workers = 0
        self.lock = threading.Lock()
        self.processing_lock = threading.Lock()
        self.loop = None
        self._start_worker()

    def add_request(self, query: str, processor_func: Callable) -> str:
        request_id = str(uuid.uuid4())
        item = QueueItem(
            id=request_id,
            query=query,
            timestamp=datetime.now(),
            processor_func=processor_func
        )
        with self.lock:
            self.queue.append(item)
            self.results[request_id] = item
        return request_id

    def get_status(self, request_id: str) -> Dict:
        item = self.results.get(request_id)
        if not item:
            return {'status': 'not_found'}

        response = {
            'status': item.status,
            'position': self._get_position(request_id),
        }

        if item.status == 'completed':
            response['result'] = item.result
        elif item.status == 'error':
            response['error'] = item.error

        return response

    def _get_position(self, request_id: str) -> int:
        for i, item in enumerate(self.queue):
            if item.id == request_id:
                return i
        return -1

    async def process_item(self, item: QueueItem):
        try:
            if asyncio.iscoroutinefunction(item.processor_func):
                result = await item.processor_func(item.query)
            else:
                result = item.processor_func(item.query)

            with self.lock:
                item.status = 'completed'
                item.result = result
                print(f"Completed processing {item.id}")
        except Exception as e:
            print(f"Error processing item {item.id}: {e}")
            with self.lock:
                item.status = 'error'
                item.error = str(e)
                print(f"Error processing {item.id}: {str(e)}")

    def process_next(self):
        with self.lock:
            if not self.queue or self.active_workers >= self.max_workers:
                return

            self.active_workers += 1
            item = self.queue.popleft()
            item.status = 'processing'

        try:
            with self.processing_lock:
                if asyncio.iscoroutinefunction(item.processor_func):
                    future = asyncio.run_coroutine_threadsafe(
                        item.processor_func(item.query),
                        self.loop
                    )
                    result = future.result()
                else:
                    result = item.processor_func(item.query)

                with self.lock:
                    item.status = 'completed'
                    item.result = result
                    print(f"Completed processing {item.id}")
        except Exception as e:
            with self.lock:
                item.status = 'error'
                item.error = str(e)
                print(f"Error processing {item.id}: {str(e)}")
        finally:
            with self.lock:
                self.active_workers -= 1

    def _start_worker(self):
        def run_event_loop():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_forever()

        loop_thread = threading.Thread(target=run_event_loop, daemon=True)
        loop_thread.start()

        start_time = time.time()
        while not self.loop and time.time() - start_time < 5:
            time.sleep(0.1)

        if not self.loop:
            raise RuntimeError("Failed to initialize event loop")

        def worker():
            while True:
                if self.queue and self.active_workers < self.max_workers:
                    self.process_next()
                threading.Event().wait(0.1)

        worker_thread = threading.Thread(target=worker, daemon=True)
        worker_thread.start()

    @property
    def queue_length(self) -> int:
        return len(self.queue)
