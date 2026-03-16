"""
NMOS IS-07 — Event & Tally
Provides real-time tally and event data over WebSocket
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

logger = logging.getLogger("nmos.is07")
router = APIRouter(prefix="/x-nmos/events/v1.0", tags=["IS-07"])

# ── Event source registry ─────────────────────────────────────────────────────

class EventSource(BaseModel):
    id: str
    label: str
    description: str = ""
    format: str  # urn:x-nmos:format:event
    event_type: str  # boolean, number/integer, number/real, string, object
    node_id: str
    device_id: str

class EventPayload(BaseModel):
    source_id: str
    flow_id: str
    origin_timestamp: str
    sync_timestamp: str
    creation_timestamp: str
    event_type: str
    payload: Dict[str, Any]

# In-memory state
event_sources: Dict[str, EventSource] = {}
event_state: Dict[str, Any] = {}  # source_id -> latest value
ws_subscriptions: Dict[str, Set[WebSocket]] = {}  # source_id -> subscribers

# ── Tally helpers ─────────────────────────────────────────────────────────────

def _ts() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ")

async def emit_tally(source_id: str, pgm: bool, pvw: bool):
    """Emit a tally event for a source"""
    payload = {
        "source_id": source_id,
        "flow_id": f"flow-{source_id}",
        "origin_timestamp": _ts(),
        "sync_timestamp": _ts(),
        "creation_timestamp": _ts(),
        "event_type": "object",
        "payload": {
            "value": {
                "pgm": {"type": "boolean", "value": pgm},
                "pvw": {"type": "boolean", "value": pvw},
            }
        }
    }
    event_state[source_id] = payload
    await _broadcast(source_id, payload)

async def _broadcast(source_id: str, payload: dict):
    subs = ws_subscriptions.get(source_id, set())
    dead = set()
    for ws in subs:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.add(ws)
    subs.difference_update(dead)

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/sources")
async def list_sources():
    return list(event_sources.values())

@router.get("/sources/{source_id}")
async def get_source(source_id: str):
    if source_id not in event_sources:
        from fastapi import HTTPException
        raise HTTPException(404, "Source not found")
    return event_sources[source_id]

@router.get("/sources/{source_id}/state")
async def get_state(source_id: str):
    return event_state.get(source_id, {})

@router.post("/sources")
async def register_source(source: EventSource):
    event_sources[source.id] = source
    ws_subscriptions.setdefault(source.id, set())
    return source

@router.websocket("/sources/{source_id}/state")
async def ws_state(ws: WebSocket, source_id: str):
    await ws.accept()
    ws_subscriptions.setdefault(source_id, set()).add(ws)
    # Send current state immediately
    if source_id in event_state:
        await ws.send_json(event_state[source_id])
    try:
        while True:
            msg = await ws.receive_text()
            data = json.loads(msg)
            if data.get("command") == "subscription":
                # Client updating subscription
                pass
    except WebSocketDisconnect:
        ws_subscriptions.get(source_id, set()).discard(ws)
