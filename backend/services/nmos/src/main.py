"""
NEXUS NMOS IS-04/IS-05 Registry Service
Active polling of external registries + local registration.
"""
import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from uuid import uuid4

import httpx
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
    format: str
    active: bool = True

class ConnectionRequest(BaseModel):
    sender_id: Optional[str] = None
    master_enable: bool = True

# ── State ─────────────────────────────────────────────────────────────────────

nodes_cache: Dict[str, Node] = {}
flows_cache: Dict[str, Flow] = {}
senders_cache: Dict[str, dict] = {}
receivers_cache: Dict[str, dict] = {}
ws_clients: Set[WebSocket] = set()
redis_client: Optional[aioredis.Redis] = None

EXTERNAL_REGISTRIES: List[str] = [
    r.strip() for r in os.getenv("NMOS_REGISTRIES", "").split(",") if r.strip()
]
POLL_INTERVAL = int(os.getenv("NMOS_POLL_INTERVAL", "10"))

# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        redis_client = await aioredis.from_url(redis_url, decode_responses=True)
        await _load_cache()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis unavailable: {e}")
        redis_client = None

    cleanup_task = asyncio.create_task(_cleanup_loop())
    poll_task = asyncio.create_task(_active_poll_loop()) if EXTERNAL_REGISTRIES else None

    yield

    cleanup_task.cancel()
    if poll_task:
        poll_task.cancel()
    if redis_client:
        await redis_client.aclose()

async def _load_cache():
    if not redis_client:
        return
    keys = await redis_client.keys("node:*")
    for key in keys:
        data = await redis_client.get(key)
        if data:
            try:
                nodes_cache[json.loads(data)["id"]] = Node.model_validate_json(data)
            except Exception:
                pass
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

async def _active_poll_loop():
    """Poll external IS-04 registries and merge into local cache."""
    logger.info(f"Active NMOS polling: {EXTERNAL_REGISTRIES}, interval={POLL_INTERVAL}s")
    async with httpx.AsyncClient(timeout=5.0) as client:
        while True:
            for registry_url in EXTERNAL_REGISTRIES:
                await _poll_registry(client, registry_url)
            await asyncio.sleep(POLL_INTERVAL)

async def _poll_registry(client: httpx.AsyncClient, base_url: str):
    base = base_url.rstrip("/")
    endpoints = {
        "nodes":     f"{base}/x-nmos/query/v1.3/nodes",
        "flows":     f"{base}/x-nmos/query/v1.3/flows",
        "senders":   f"{base}/x-nmos/query/v1.3/senders",
        "receivers": f"{base}/x-nmos/query/v1.3/receivers",
    }
    changed = False
    for resource_type, url in endpoints.items():
        try:
            resp = await client.get(url)
            if resp.status_code != 200:
                continue
            items = resp.json()
            if not isinstance(items, list):
                continue
            for item in items:
                rid = item.get("id")
                if not rid:
                    continue
                if resource_type == "nodes":
                    item["last_seen"] = datetime.utcnow().isoformat()
                    try:
                        nodes_cache[rid] = Node.model_validate(item)
                        if redis_client:
                            await redis_client.set(f"node:{rid}", json.dumps(item), ex=120)
                    except Exception:
                        pass
                elif resource_type == "flows":
                    try:
                        flows_cache[rid] = Flow.model_validate(item)
                    except Exception:
                        pass
                elif resource_type == "senders":
                    senders_cache[rid] = item
                elif resource_type == "receivers":
                    receivers_cache[rid] = item
                changed = True
        except Exception as e:
            logger.debug(f"Poll error [{resource_type}] {base_url}: {e}")

    if changed:
        await _broadcast({
            "type": "registry_sync",
            "registry": base_url,
            "nodes": len(nodes_cache),
            "flows": len(flows_cache),
            "timestamp": datetime.utcnow().isoformat(),
        })

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="NEXUS NMOS Registry", version="1.4.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

from .is07 import router as is07_router
from .is08 import router as is08_router
app.include_router(is07_router)
app.include_router(is08_router)

# ── IS-04 Node Registry ───────────────────────────────────────────────────────

@app.get("/x-nmos/node/v1.3/self")
async def get_self():
    return {
        "id": "nexus-registry-01",
        "label": "NEXUS NMOS Registry",
        "hostname": os.getenv("HOSTNAME", "nmos-registry"),
        "services": [
            {"href": "/x-nmos/query/v1.3/", "type": "urn:x-nmos:service:query"},
            {"href": "/x-nmos/connection/v1.1/", "type": "urn:x-nmos:service:connection"},
        ],
    }

@app.post("/x-nmos/node/v1.3/resource", status_code=status.HTTP_201_CREATED)
async def register_resource(resource_type: str, resource: dict):
    rid = resource.setdefault("id", str(uuid4()))
    if redis_client:
        await redis_client.set(f"{resource_type}:{rid}", json.dumps(resource), ex=120)
    if resource_type == "node":
        resource["last_seen"] = datetime.utcnow().isoformat()
        try:
            nodes_cache[rid] = Node.model_validate(resource)
        except Exception:
            pass
    elif resource_type == "flow":
        try:
            flows_cache[rid] = Flow.model_validate(resource)
        except Exception:
            pass
    elif resource_type == "sender":
        senders_cache[rid] = resource
    elif resource_type == "receiver":
        receivers_cache[rid] = resource
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
    return list(senders_cache.values())

@app.get("/x-nmos/query/v1.3/receivers")
async def query_receivers():
    return list(receivers_cache.values())

# ── IS-05 Connection Management ───────────────────────────────────────────────

@app.post("/x-nmos/connection/v1.1/single/receivers/{receiver_id}")
async def stage_connection(receiver_id: str, req: ConnectionRequest):
    staged = {
        "receiver_id": receiver_id,
        "sender_id": req.sender_id,
        "master_enable": req.master_enable,
        "activation": {"mode": "activate_immediate"},
    }
    if redis_client:
        await redis_client.set(f"staged:{receiver_id}", json.dumps(staged), ex=300)
    return staged

@app.post("/x-nmos/connection/v1.1/single/receivers/{receiver_id}/activate")
async def activate_connection(receiver_id: str):
    staged_data = None
    if redis_client:
        staged_data = await redis_client.get(f"staged:{receiver_id}")
    if not staged_data:
        raise HTTPException(404, "No staged connection")
    staged = json.loads(staged_data)
    activation_time = datetime.utcnow().isoformat()
    staged["activation"]["activation_time"] = activation_time
    if redis_client:
        await redis_client.set(f"active:{receiver_id}", json.dumps(staged))
        await redis_client.delete(f"staged:{receiver_id}")
    await _broadcast({"type": "connection_activated", "data": staged})
    logger.info(f"Activated: {staged.get('sender_id')} -> {receiver_id}")
    return {**staged, "activation_time": activation_time}

@app.get("/x-nmos/connection/v1.1/single/receivers/{receiver_id}/active")
async def get_active_connection(receiver_id: str):
    if not redis_client:
        raise HTTPException(503, "Redis unavailable")
    data = await redis_client.get(f"active:{receiver_id}")
    if not data:
        raise HTTPException(404, "No active connection")
    return json.loads(data)

# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws/registry")
async def registry_ws(ws: WebSocket):
    await ws.accept()
    ws_clients.add(ws)
    try:
        await ws.send_json({
            "type": "initial_state",
            "nodes": len(nodes_cache),
            "flows": len(flows_cache),
            "senders": len(senders_cache),
            "receivers": len(receivers_cache),
            "timestamp": datetime.utcnow().isoformat(),
        })
        while True:
            msg = await ws.receive_text()
            data = json.loads(msg)
            if data.get("action") == "ping":
                await ws.send_json({"type": "pong"})
            elif data.get("action") == "get_nodes":
                await ws.send_json({"type": "nodes", "data": [n.model_dump() for n in nodes_cache.values()]})
            elif data.get("action") == "get_flows":
                await ws.send_json({"type": "flows", "data": [f.model_dump() for f in flows_cache.values()]})
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
    return {
        "status": "healthy",
        "nodes": len(nodes_cache),
        "flows": len(flows_cache),
        "senders": len(senders_cache),
        "receivers": len(receivers_cache),
        "external_registries": len(EXTERNAL_REGISTRIES),
        "redis": redis_client is not None,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)
