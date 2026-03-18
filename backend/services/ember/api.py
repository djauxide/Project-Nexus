"""Ember+ FastAPI HTTP/WebSocket gateway with device presets and auto-reconnect."""
import asyncio
import json
import logging
import os
from typing import Dict, List, Optional, Set
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .main import EmberClient

logger = logging.getLogger("ember.api")

# ── Known device presets ──────────────────────────────────────────────────────
# Pre-configured Ember+ tree paths for common broadcast hardware

DEVICE_PRESETS: Dict[str, dict] = {
    "lawo-mc256": {
        "label": "Lawo mc²56 Audio Console",
        "vendor": "Lawo",
        "model": "mc²56",
        "default_port": 9000,
        "matrix_path": "1.1",          # Main audio matrix
        "fader_base": "1.2",           # Fader parameters
        "known_paths": {
            "input_gain":    "1.2.1",
            "output_gain":   "1.2.2",
            "bus_assign":    "1.3.1",
            "program_out":   "1.4.1",
            "clean_feed":    "1.4.2",
        },
    },
    "gv-korona": {
        "label": "Grass Valley Korona Router",
        "vendor": "Grass Valley",
        "model": "Korona",
        "default_port": 9000,
        "matrix_path": "1.1",
        "known_paths": {
            "video_matrix":  "1.1.1",
            "audio_matrix":  "1.1.2",
            "source_labels": "1.2.1",
            "dest_labels":   "1.2.2",
            "lock_status":   "1.3.1",
        },
    },
    "riedel-artist": {
        "label": "Riedel Artist Intercom",
        "vendor": "Riedel",
        "model": "Artist",
        "default_port": 9000,
        "matrix_path": "1.1",
        "known_paths": {
            "port_config":   "1.1.1",
            "crosspoint":    "1.1.2",
            "key_panel":     "1.2.1",
            "gpio_in":       "1.3.1",
            "gpio_out":      "1.3.2",
        },
    },
    "ssl-system-t": {
        "label": "SSL System T Audio Console",
        "vendor": "Solid State Logic",
        "model": "System T",
        "default_port": 9000,
        "matrix_path": "1.1",
        "known_paths": {
            "fader_level":   "1.2.1",
            "channel_on":    "1.2.2",
            "bus_routing":   "1.3.1",
            "monitor_out":   "1.4.1",
        },
    },
    "nevion-virtuoso": {
        "label": "Nevion Virtuoso Media Server",
        "vendor": "Nevion",
        "model": "Virtuoso",
        "default_port": 9000,
        "matrix_path": "1.1",
        "known_paths": {
            "input_status":  "1.1.1",
            "output_config": "1.1.2",
            "alarm_status":  "1.2.1",
        },
    },
}

# ── Device registry ───────────────────────────────────────────────────────────

clients: Dict[str, EmberClient] = {}
ws_clients: Set[WebSocket] = set()
reconnect_tasks: Dict[str, asyncio.Task] = {}

app = FastAPI(title="NEXUS Ember+ Gateway", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class DeviceAdd(BaseModel):
    id: str
    host: str
    port: int = 9000
    label: str = ""
    preset: Optional[str] = None  # key from DEVICE_PRESETS

class SetParam(BaseModel):
    path: str
    value: object

class MatrixConnect(BaseModel):
    matrix_path: str
    target: int
    source: int

# ── Helpers ───────────────────────────────────────────────────────────────────

async def _broadcast_ws(message: dict):
    dead = set()
    for ws in ws_clients:
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            dead.add(ws)
    ws_clients.difference_update(dead)

async def _auto_reconnect(device_id: str, host: str, port: int):
    """Reconnect loop — retries every 10s if disconnected."""
    while device_id in clients:
        client = clients.get(device_id)
        if client and not client.connected:
            logger.info(f"Reconnecting Ember+ device: {device_id}")
            await client.connect()
            if client.connected:
                await _broadcast_ws({"type": "device_reconnected", "device": device_id})
        await asyncio.sleep(10)

# ── Device management ─────────────────────────────────────────────────────────

@app.post("/devices")
async def add_device(req: DeviceAdd, background_tasks: BackgroundTasks):
    if req.id in clients:
        raise HTTPException(409, "Device already registered")

    port = req.port
    if req.preset and req.preset in DEVICE_PRESETS:
        preset = DEVICE_PRESETS[req.preset]
        port = port or preset["default_port"]

    client = EmberClient(req.host, port)

    async def on_change(event_type: str, path: str, value):
        await _broadcast_ws({
            "type": event_type,
            "device": req.id,
            "path": path,
            "value": value,
        })

    client.on_change(on_change)
    await client.connect()
    clients[req.id] = client

    # Start auto-reconnect background task
    task = asyncio.create_task(_auto_reconnect(req.id, req.host, port))
    reconnect_tasks[req.id] = task

    # If preset, subscribe to known paths
    if req.preset and req.preset in DEVICE_PRESETS and client.connected:
        preset = DEVICE_PRESETS[req.preset]
        for path in preset.get("known_paths", {}).values():
            await client.subscribe(path)

    return {
        "id": req.id,
        "connected": client.connected,
        "preset": req.preset,
        "preset_info": DEVICE_PRESETS.get(req.preset, {}) if req.preset else None,
    }

@app.delete("/devices/{device_id}")
async def remove_device(device_id: str):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    # Cancel reconnect task
    task = reconnect_tasks.pop(device_id, None)
    if task:
        task.cancel()
    del clients[device_id]
    return {"removed": device_id}

@app.get("/devices")
async def list_devices():
    return [
        {
            "id": did,
            "host": c.host,
            "port": c.port,
            "connected": c.connected,
            "parameters": len(c.parameters),
            "matrices": len(c.matrices),
        }
        for did, c in clients.items()
    ]

@app.get("/devices/presets")
async def list_presets():
    return DEVICE_PRESETS

@app.get("/devices/{device_id}/parameters")
async def get_parameters(device_id: str):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    return {path: p.to_dict() for path, p in clients[device_id].parameters.items()}

@app.get("/devices/{device_id}/matrices")
async def get_matrices(device_id: str):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    return {path: m.to_dict() for path, m in clients[device_id].matrices.items()}

@app.post("/devices/{device_id}/set")
async def set_parameter(device_id: str, req: SetParam):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    if not clients[device_id].connected:
        raise HTTPException(503, "Device not connected")
    await clients[device_id].set_parameter(req.path, req.value)
    return {"success": True}

@app.post("/devices/{device_id}/connect")
async def matrix_connect(device_id: str, req: MatrixConnect):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    if not clients[device_id].connected:
        raise HTTPException(503, "Device not connected")
    await clients[device_id].connect_matrix(req.matrix_path, req.target, req.source)
    await _broadcast_ws({
        "type": "matrix_connected",
        "device": device_id,
        "matrix": req.matrix_path,
        "target": req.target,
        "source": req.source,
    })
    return {"success": True}

@app.post("/devices/{device_id}/subscribe")
async def subscribe(device_id: str, path: str):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    await clients[device_id].subscribe(path)
    return {"success": True}

@app.post("/devices/{device_id}/reconnect")
async def force_reconnect(device_id: str):
    if device_id not in clients:
        raise HTTPException(404, "Device not found")
    await clients[device_id].connect()
    return {"connected": clients[device_id].connected}

# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    ws_clients.add(ws)
    try:
        await ws.send_json({
            "type": "connected",
            "devices": list(clients.keys()),
            "presets": list(DEVICE_PRESETS.keys()),
        })
        while True:
            msg = await ws.receive_text()
            data = json.loads(msg)
            if data.get("action") == "ping":
                await ws.send_json({"type": "pong"})
            elif data.get("action") == "get_devices":
                await ws.send_json({
                    "type": "devices",
                    "data": [{"id": did, "connected": c.connected} for did, c in clients.items()],
                })
    except WebSocketDisconnect:
        ws_clients.discard(ws)

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "devices": len(clients),
        "connected": sum(1 for c in clients.values() if c.connected),
        "presets_available": len(DEVICE_PRESETS),
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8030"))
    uvicorn.run(app, host="0.0.0.0", port=port)
