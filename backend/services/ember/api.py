"""Ember+ FastAPI HTTP/WebSocket gateway — loaded by main.py"""
import asyncio
import json
import os
from typing import Dict, List, Optional, Set
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .main import EmberClient
import logging

logger = logging.getLogger("ember.api")

# ── Device registry ───────────────────────────────────────────────────────────
# Multiple Ember+ providers can be connected simultaneously
# e.g. Lawo mc² console + Grass Valley router + Riedel comms

clients: Dict[str, EmberClient] = {}
ws_clients: Set[WebSocket] = set()

app = FastAPI(title="NEXUS Ember+ Gateway", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class DeviceAdd(BaseModel):
    id: str
    host: str
    port: int = 9000
    label: str = ""

class SetParam(BaseModel):
    path: str
    value: object

class MatrixConnect(BaseModel):
    matrix_path: str
    target: int
    source: int

# ── Device management ─────────────────────────────────────────────────────────

@app.post("/devices")
async def add_device(req: DeviceAdd):
    if req.id in clients:
        raise HTTPException(409, "Device already registered")
    client = EmberClient(req.host, req.port)

    async def on_change(event_type, path, value):
        msg = json.dumps({"type": event_type, "device": req.id, "path": path, "value": value})
        dead = set()
        for ws in ws_clients:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.add(ws)
        ws_clients.difference_update(dead)

    client.on_change(on_change)
    await client.connect()
    clients[req.id] = client
    return {"id": req.id, "connected": client.connected}

@app.delete("/devices/{device_id}")
async def remove_device(device_id: str):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    del clients[device_id]
    return {"removed": device_id}

@app.get("/devices")
async def list_devices():
    return [{"id": did, "host": c.host, "port": c.port, "connected": c.connected}
            for did, c in clients.items()]

@app.get("/devices/{device_id}/parameters")
async def get_parameters(device_id: str):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    c = clients[device_id]
    return {path: p.to_dict() for path, p in c.parameters.items()}

@app.get("/devices/{device_id}/matrices")
async def get_matrices(device_id: str):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    c = clients[device_id]
    return {path: m.to_dict() for path, m in c.matrices.items()}

@app.post("/devices/{device_id}/set")
async def set_parameter(device_id: str, req: SetParam):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    await clients[device_id].set_parameter(req.path, req.value)
    return {"success": True}

@app.post("/devices/{device_id}/connect")
async def matrix_connect(device_id: str, req: MatrixConnect):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    await clients[device_id].connect_matrix(req.matrix_path, req.target, req.source)
    return {"success": True}

@app.post("/devices/{device_id}/subscribe")
async def subscribe(device_id: str, path: str):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    await clients[device_id].subscribe(path)
    return {"success": True}

# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    ws_clients.add(ws)
    try:
        await ws.send_json({"type": "connected", "devices": list(clients.keys())})
        while True:
            msg = await ws.receive_text()
            data = json.loads(msg)
            if data.get("action") == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_clients.discard(ws)

@app.get("/health")
async def health():
    return {"status": "healthy", "devices": len(clients),
            "connected": sum(1 for c in clients.values() if c.connected)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8030"))
    uvicorn.run(app, host="0.0.0.0", port=port)
