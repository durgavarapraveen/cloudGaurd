# app/sse/manager.py

import asyncio
from collections import defaultdict

class SSEManager:
    def __init__(self):
        self._queues: dict[str, list[asyncio.Queue]] = defaultdict(list)
        self._user_context: dict[str, str] = {}  # user_id → current page

    def add_client(self, user_id: str) -> asyncio.Queue:
        q = asyncio.Queue()
        self._queues[user_id].append(q)
        return q

    def remove_client(self, user_id: str, q: asyncio.Queue):
        queues = self._queues.get(user_id, [])
        if q in queues:
            queues.remove(q)
        if not queues:
            self._queues.pop(user_id, None)


    def get_context(self, user_id: str) -> str | None:
        return self._user_context.get(user_id)

    def is_connected(self, user_id: str) -> bool:
        return bool(self._queues.get(user_id))

    async def push(self, user_id: str, event: str, data: str):
        for q in self._queues.get(user_id, []):
            await q.put({"event": event, "data": data})

    async def push_to_all(self, event: str, data: str):
        for user_id in list(self._queues.keys()):
            await self.push(user_id, event, data)

# singleton — import this everywhere
sse_manager = SSEManager()