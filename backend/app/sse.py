import asyncio
import json
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from app.auth import get_current_user_from_token

router = APIRouter()
_clients: list[asyncio.Queue] = []


def broadcast(event: dict) -> None:
    """Push event to all connected SSE clients (non-blocking)."""
    for q in _clients:
        q.put_nowait(event)


@router.get("/api/events")
async def sse_stream(token: str = Query(...)):
    """SSE endpoint — stays open, pushes events when data changes."""
    # Validate token via query param (EventSource can't set headers)
    get_current_user_from_token(token)

    queue: asyncio.Queue = asyncio.Queue()
    _clients.append(queue)

    async def stream():
        try:
            while True:
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if queue in _clients:
                _clients.remove(queue)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disables nginx buffering
            "Connection": "keep-alive",
        },
    )
