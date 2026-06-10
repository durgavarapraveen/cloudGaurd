# app/sse/router.py

import asyncio
import json
from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse
from .sse_manager import sse_manager
from .sse_dependencies import require_sse_eligible
from models.userModel import User

router = APIRouter(prefix="/sse", tags=["sse"])


async def event_stream(user_id: str, request: Request):
    q = sse_manager.add_client(user_id)
    print(q)
    # ← Add this to test immediately on connect
    await sse_manager.push(
        user_id,
        event="connected",
        data={"message": "SSE connected successfully!"}  # ✅ dict, NOT json.dumps
    )
    
    try:
        while True:
            if await request.is_disconnected():
                break
            try:
                msg = await asyncio.wait_for(q.get(), timeout=20.0)                

                yield f"event: {msg['event']}\n"
                yield f"data: {json.dumps(msg['data'])}\n\n"
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
    finally:
        sse_manager.remove_client(user_id, q)


@router.get("/stream")
async def sse_stream(
    request: Request,
    current_user: User = Depends(require_sse_eligible),
):
    return StreamingResponse(
        event_stream(current_user.id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )



@router.post("/tasks")
async def create_task(
    payload: dict,
    current_user: User = Depends(require_sse_eligible),
):
    # ... create task logic ...
    
    # Push SSE event to frontend
    await sse_manager.push(
        current_user.id,
        event="task_update",
        data={"message": "Task created!", "task": payload}
    )
    
    return {"ok": True}
