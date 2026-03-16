"""
NMOS IS-08 — Audio Channel Mapping
Maps audio channels between senders and receivers
"""
import logging
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("nmos.is08")
router = APIRouter(prefix="/x-nmos/channelmapping/v1.0", tags=["IS-08"])

# ── Models ────────────────────────────────────────────────────────────────────

class AudioChannel(BaseModel):
    label: str
    symbol: str  # e.g. "L", "R", "C", "LFE", "Ls", "Rs"

class InputChannel(BaseModel):
    channel_index: int
    input_id: str

class OutputMap(BaseModel):
    output_id: str
    channel_index: int
    input_id: Optional[str] = None
    input_channel: Optional[int] = None

class AudioInput(BaseModel):
    id: str
    label: str
    caps: Dict = {}
    channels: List[AudioChannel] = []
    parent: Dict = {}  # {type: "source", id: "..."}

class AudioOutput(BaseModel):
    id: str
    label: str
    caps: Dict = {}
    channels: List[AudioChannel] = []
    parent: Dict = {}  # {type: "receiver", id: "..."}
    source_id: Optional[str] = None

# ── State ─────────────────────────────────────────────────────────────────────

audio_inputs: Dict[str, AudioInput] = {}
audio_outputs: Dict[str, AudioOutput] = {}
# channel_map[output_id][channel_index] = {input_id, input_channel}
channel_map: Dict[str, Dict[int, Dict]] = {}

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/inputs")
async def list_inputs():
    return list(audio_inputs.values())

@router.get("/inputs/{input_id}")
async def get_input(input_id: str):
    if input_id not in audio_inputs:
        raise HTTPException(404, "Input not found")
    return audio_inputs[input_id]

@router.post("/inputs")
async def register_input(inp: AudioInput):
    audio_inputs[inp.id] = inp
    return inp

@router.get("/outputs")
async def list_outputs():
    return list(audio_outputs.values())

@router.get("/outputs/{output_id}")
async def get_output(output_id: str):
    if output_id not in audio_outputs:
        raise HTTPException(404, "Output not found")
    return audio_outputs[output_id]

@router.post("/outputs")
async def register_output(out: AudioOutput):
    audio_outputs[out.id] = out
    channel_map.setdefault(out.id, {})
    return out

@router.get("/map/activations")
async def get_map():
    """Return current channel mapping"""
    result = {}
    for out_id, channels in channel_map.items():
        result[out_id] = {
            str(ch): mapping for ch, mapping in channels.items()
        }
    return result

@router.post("/map/activations")
async def set_map(mappings: List[OutputMap]):
    """Apply channel mapping — immediate activation"""
    for m in mappings:
        if m.output_id not in audio_outputs:
            raise HTTPException(404, f"Output {m.output_id} not found")
        channel_map.setdefault(m.output_id, {})[m.channel_index] = {
            "input_id": m.input_id,
            "input_channel": m.input_channel,
        }
    return {"activated": len(mappings)}

@router.delete("/map/activations/{output_id}/{channel_index}")
async def clear_channel(output_id: str, channel_index: int):
    if output_id in channel_map:
        channel_map[output_id].pop(channel_index, None)
    return {"cleared": True}

@router.get("/io")
async def get_io():
    """Combined I/O view"""
    return {
        "inputs": {iid: inp.model_dump() for iid, inp in audio_inputs.items()},
        "outputs": {oid: out.model_dump() for oid, out in audio_outputs.items()},
    }
