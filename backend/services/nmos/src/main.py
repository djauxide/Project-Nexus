"""
NEXUS NMOS IS-04/IS-05 Registry Service
Handles broadcast device discovery and connection management.
"""
import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from uuid import uuid4

import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Models ────────────────────────────────────────────────────────────────────

class Node(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    label: str
    description: str = ""
    hostname: str
    services: List[Dict] = Field(default_factory=list)
    interfaces: List[Dict] = Field(default_factory=list)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    health: str = "healthy"

class Flow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    label: str
    source_id: str
    node_id: str
    device_id: str
    format: str  # video/raw, audio/L24, etc.
    active: bool = True

class Sender(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    label: str
    flow_id: Optional[str] = None
    node_id: str
    device_id: str
    transport: str = "urn:x-nmos:transport:rtp.mcast"
    active: bool = True

class Receiver(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    label: str
    node_id: str
    device_id: str
    format: str
    transport: str = "urn:x-nmos:transport:rtp.mcast"
    subscription: Dict = Field(default_factory=dict)
    active: bool = True

class ConnectionRequest(BaseModel):
    sender_id: Optional[str] = None
    master_enable: bool = True

# ── State ─────────────────────────────────────────────────────────────────────

nodes_cache: Dict[str, Node] = {}
flows_cache: Dict[str, Flow] = {}
ws_clients: Set[WebSocket] = set()
redis_client: Optional[aioredis.Redis] = None

# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    import os
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_client = await aioredis.from_url(redis_url, decode_responses=True)
    await _load_cache()
    cleanup = asyncio.create_task(_cleanup_loop())
    yield
    cleanup.cancel()
    await redis_client.close()

async def _load_cache():
    if not redis_client:
        return
    keys = await redis_client.keys("node:*")
    for key in keys:
        data = await redis_client.get(key)
        if data:
            node = Node.model_validate_json(data)
            nodes_cache[node.id] = node
    logger.info(f"Loaded {len(nodes_cache)} nodes from Redis")

async def _cleanup_loop():
    while True:
        await asyncio.sleep(30)
        now = datetime.utcnow()
        expired = [nid for nid, n in nodes_cache.items()
                   if now - n.last_seen > timedelta(seconds=60)]
        for nid in expired:
            del nodes_cache[nid]
            if redis_client:
                await redis_client.delete(f"node:{nid}")
            logger.info(f"Expired node: {nid}")

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="NEXUS NMOS Registry", version="1.3.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Mount IS-07 and IS-08
from .is07 import router as is07_router, emit_tally
from .is08 import router as is08_router
app.include_router(is07_router)
app.include_router(is08_router)

# ── IS-04 Node Registry ───────────────────────────────────────────────────────

@app.get("/x-nmos/node/v1.3/self")
async def get_self():
    return {"id": "nexus-registry-01", "label": "NEXUS NMOS Registry",
            "hostname": "nmos-registry", "services": []}

@app.post("/x-nmos/node/v1.3/resource", status_code=status.HTTP_201_CREATED)
async def register_resource(resource_type: str, resource: dict):
    rid = resource.setdefault("id", str(uuid4()))
    if redis_client:
        await redis_client.set(f"{resource_type}:{rid}", json.dumps(resource))
    if resource_type == "node":
        nodes_cache[rid] = Node.model_validate(resource)
    elif resource_type == "flow":
        flows_cache[rid] = Flow.model_validate(resource)
    await _broadcast({"type": f"{resource_type}_added", "data": resource})
    return {"id": rid, "registered": True}

@app.get("/x-nmos/query/v1.3/nodes")
async def query_nodes(label: Optional[str] = None):
    result = list(nodes_cache.values())
    if label:
        result = [n for n in result if label.lower() in n.label.lower()]
    return [n.model_dump() for n in result]

@app.get("/x-nmos/query/v1.3/flows")
async def query_flows(format: Optional[str] = None):
    result = list(flows_cache.values())
    if format:
        result = [f for f in result if f.format == format]
    return [f.model_dump() for f in result]

@app.get("/x-nmos/query/v1.3/senders")
async def query_senders():
    if not redis_client:
        return []
    keys = await redis_client.smembers("senders")
    senders = []
    for k in keys:
        data = await redis_client.get(f"sender:{k}")
        if data:
            senders.append(json.loads(data))
    return senders

@app.get("/x-nmos/query/v1.3/receivers")
async def query_receivers():
    if not redis_client:
        return []
    keys = await redis_client.smembers("receivers")
    receivers = []
    for k in keys:
        data = await redis_client.get(f"receiver:{k}")
        if data:
            receivers.append(json.loads(data))
    return receivers

# ── IS-05 Connection Management ───────────────────────────────────────────────

@app.post("/x-nmos/connection/v1.1/single/receivers/{receiver_id}")
async def stage_connection(receiver_id: str, req: ConnectionRequest):
    if not redis_client:
        raise HTTPException(503, "Redis unavailable")
    receiver_data = await redis_client.get(f"receiver:{receiver_id}")
    if not receiver_data:
        raise HTTPException(404, "Receiver not found")
    staged = {
        "receiver_id": receiver_id,
        "sender_id": req.sender_id,
        "master_enable": req.master_enable,
        "activation": {"mode": "activate_immediate"},
    }
    await redis_client.set(f"staged:{receiver_id}", json.dumps(staged))
    return staged

@app.post("/x-nmos/connection/v1.1/single/receivers/{receiver_id}/activate")
async def activate_connection(receiver_id: str):
    if not redis_client:
        raise HTTPException(503, "Redis unavailable")
    staged_data = await redis_client.get(f"staged:{receiver_id}")
    if not staged_data:
        raise HTTPException(404, "No staged connection")
    staged = json.loads(staged_data)
    activation_time = datetime.utcnow().isoformat()
    staged["activation"]["activation_time"] = activation_time
    await redis_client.set(f"active:{receiver_id}", json.dumps(staged))
    await redis_client.delete(f"staged:{receiver_id}")
    await _broadcast({"type": "connection_activated", "data": staged})
    logger.info(f"Activated: {staged.get('sender_id')} -> {receiver_id}")
    return {**staged, "activation_time": activation_time}

# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws/registry")
async def registry_ws(ws: WebSocket):
    await ws.accept()
    ws_clients.add(ws)
    try:
        await ws.send_json({"type": "initial_state", "nodes": len(nodes_cache),
                            "timestamp": datetime.utcnow().isoformat()})
        while True:
            msg = await ws.receive_text()
            data = json.loads(msg)
            if data.get("action") == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_clients.discard(ws)

async def _broadcast(message: dict):
    dead = set()
    for ws in ws_clients:
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    ws_clients.difference_update(dead)

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy", "nodes": len(nodes_cache), "flows": len(flows_cache)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)
