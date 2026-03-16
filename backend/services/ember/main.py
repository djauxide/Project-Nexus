"""
NEXUS — Ember+ Gateway Service
Implements Ember+ consumer (client) for Lawo, Grass Valley, Riedel, SSL, Studer
Ember+ is an open protocol used by virtually all broadcast audio/routing vendors.

Spec: https://github.com/Lawo/ember-plus
Transport: TCP, default port 9000
Encoding: BER (Basic Encoding Rules) over Glow DTD
"""
import asyncio
import json
import logging
import os
import struct
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Callable
from datetime import datetime

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("ember")

# ── Ember+ BER/Glow Constants ─────────────────────────────────────────────────

# Glow application tags
GLOW_ROOT          = 0x60  # Application 0
GLOW_ELEMENT_COLL  = 0x61  # Application 1
GLOW_NODE          = 0x62  # Application 2
GLOW_PARAMETER     = 0x63  # Application 3
GLOW_COMMAND       = 0x64  # Application 4
GLOW_STREAM_COLL   = 0x65  # Application 5
GLOW_STREAM_ENTRY  = 0x66  # Application 6
GLOW_QUALIFIED_NODE = 0x6D # Application 13
GLOW_QUALIFIED_PARAM = 0x6E # Application 14
GLOW_MATRIX        = 0x6F  # Application 15
GLOW_QUALIFIED_MATRIX = 0x70 # Application 16
GLOW_SIGNAL        = 0x71  # Application 17
GLOW_CONNECTION    = 0x72  # Application 18

# BER universal tags
BER_BOOLEAN   = 0x01
BER_INTEGER   = 0x02
BER_OCTET_STR = 0x04
BER_UTF8_STR  = 0x0C
BER_SEQUENCE  = 0x30
BER_SET       = 0x31
BER_REAL      = 0x09
BER_RELATIVE_OID = 0x0D

# Ember+ command types
CMD_SUBSCRIBE   = 30
CMD_UNSUBSCRIBE = 31
CMD_GET_DIR     = 32
CMD_INVOKE      = 33

# ── BER Encoding/Decoding ─────────────────────────────────────────────────────

def ber_encode_length(length: int) -> bytes:
    if length < 0x80:
        return bytes([length])
    elif length < 0x100:
        return bytes([0x81, length])
    elif length < 0x10000:
        return bytes([0x82, length >> 8, length & 0xFF])
    else:
        return bytes([0x83, length >> 16, (length >> 8) & 0xFF, length & 0xFF])

def ber_decode_length(data: bytes, pos: int):
    b = data[pos]
    if b < 0x80:
        return b, pos + 1
    n = b & 0x7F
    length = int.from_bytes(data[pos+1:pos+1+n], 'big')
    return length, pos + 1 + n

def ber_encode_integer(value: int) -> bytes:
    if value == 0:
        return b'\x02\x01\x00'
    n = (value.bit_length() + 8) // 8
    return bytes([BER_INTEGER]) + ber_encode_length(n) + value.to_bytes(n, 'big', signed=True)

def ber_encode_utf8(s: str) -> bytes:
    encoded = s.encode('utf-8')
    return bytes([BER_UTF8_STR]) + ber_encode_length(len(encoded)) + encoded

def ber_encode_real(value: float) -> bytes:
    import struct
    packed = struct.pack('>d', value)
    return bytes([BER_REAL]) + ber_encode_length(8) + packed

def ber_encode_oid(path: List[int]) -> bytes:
    """Encode a relative OID (Ember+ path)"""
    encoded = []
    for component in path:
        if component < 0x80:
            encoded.append(component)
        else:
            parts = []
            while component > 0:
                parts.append(component & 0x7F)
                component >>= 7
            parts.reverse()
            for i, p in enumerate(parts):
                if i < len(parts) - 1:
                    encoded.append(p | 0x80)
                else:
                    encoded.append(p)
    return bytes([BER_RELATIVE_OID]) + ber_encode_length(len(encoded)) + bytes(encoded)

def build_get_dir(path: List[int]) -> bytes:
    """Build a GetDirectory command for a given path"""
    oid = ber_encode_oid(path)
    cmd_data = bytes([GLOW_COMMAND]) + ber_encode_length(3) + ber_encode_integer(CMD_GET_DIR)
    node_data = bytes([0xA0]) + ber_encode_length(len(oid)) + oid  # context [0] = path
    node_data += bytes([0xA2]) + ber_encode_length(len(cmd_data)) + cmd_data  # context [2] = command
    node = bytes([GLOW_QUALIFIED_NODE]) + ber_encode_length(len(node_data)) + node_data
    root = bytes([GLOW_ROOT]) + ber_encode_length(len(node))
    return _framed(root + node)

def _framed(data: bytes) -> bytes:
    """Wrap in Ember+ S101 framing"""
    # S101 frame: SOF(0x00) + length(2) + data + EOF(0xFF)
    length = len(data)
    return bytes([0x00]) + struct.pack('>H', length) + data + bytes([0xFF])

# ── Ember+ Node/Parameter Tree ────────────────────────────────────────────────

@dataclass
class EmberParameter:
    path: List[int]
    identifier: str
    description: str = ""
    value: Any = None
    minimum: Any = None
    maximum: Any = None
    access: str = "readWrite"  # none, read, write, readWrite
    format: str = ""
    type: str = "integer"      # integer, real, string, boolean, enum, trigger
    enum_entries: List[str] = field(default_factory=list)
    is_online: bool = True
    subscribers: List[Callable] = field(default_factory=list)

    def to_dict(self):
        return {
            "path": self.path,
            "identifier": self.identifier,
            "description": self.description,
            "value": self.value,
            "minimum": self.minimum,
            "maximum": self.maximum,
            "access": self.access,
            "type": self.type,
            "enum_entries": self.enum_entries,
            "is_online": self.is_online,
        }

@dataclass
class EmberNode:
    path: List[int]
    identifier: str
    description: str = ""
    is_online: bool = True
    is_root: bool = False
    children: Dict[int, Any] = field(default_factory=dict)  # int -> EmberNode | EmberParameter

    def get_child(self, number: int):
        return self.children.get(number)

    def add_child(self, number: int, child):
        self.children[number] = child

@dataclass
class EmberMatrix:
    path: List[int]
    identifier: str
    description: str = ""
    target_count: int = 0
    source_count: int = 0
    connections: Dict[int, List[int]] = field(default_factory=dict)  # target -> [sources]
    target_labels: Dict[int, str] = field(default_factory=dict)
    source_labels: Dict[int, str] = field(default_factory=dict)

    def connect(self, target: int, sources: List[int]):
        self.connections[target] = sources

    def to_dict(self):
        return {
            "path": self.path,
            "identifier": self.identifier,
            "description": self.description,
            "target_count": self.target_count,
            "source_count": self.source_count,
            "connections": self.connections,
            "target_labels": self.target_labels,
            "source_labels": self.source_labels,
        }

# ── Ember+ TCP Client ─────────────────────────────────────────────────────────

class EmberClient:
    def __init__(self, host: str, port: int = 9000):
        self.host = host
        self.port = port
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.root = EmberNode(path=[], identifier="root", is_root=True)
        self.matrices: Dict[str, EmberMatrix] = {}
        self.parameters: Dict[str, EmberParameter] = {}
        self.connected = False
        self._callbacks: List[Callable] = []
        self._recv_buf = bytearray()

    def on_change(self, callback: Callable):
        self._callbacks.append(callback)

    async def connect(self):
        try:
            self.reader, self.writer = await asyncio.wait_for(
                asyncio.open_connection(self.host, self.port), timeout=5.0
            )
            self.connected = True
            logger.info(f"Ember+ connected to {self.host}:{self.port}")
            # Request root directory
            await self._send_raw(build_get_dir([]))
            asyncio.create_task(self._read_loop())
        except Exception as e:
            logger.error(f"Ember+ connect failed: {e}")
            self.connected = False

    async def _send_raw(self, data: bytes):
        if self.writer:
            self.writer.write(data)
            await self.writer.drain()

    async def _read_loop(self):
        while self.connected:
            try:
                chunk = await asyncio.wait_for(self.reader.read(4096), timeout=30.0)
                if not chunk:
                    break
                self._recv_buf.extend(chunk)
                await self._process_buffer()
            except asyncio.TimeoutError:
                # Send keepalive
                await self._send_raw(build_get_dir([]))
            except Exception as e:
                logger.error(f"Ember+ read error: {e}")
                break
        self.connected = False
        logger.warning(f"Ember+ disconnected from {self.host}:{self.port}")

    async def _process_buffer(self):
        """Parse S101 frames from buffer"""
        while len(self._recv_buf) >= 3:
            if self._recv_buf[0] != 0x00:
                self._recv_buf.pop(0)
                continue
            length = struct.unpack('>H', self._recv_buf[1:3])[0]
            if len(self._recv_buf) < 3 + length + 1:
                break
            frame = bytes(self._recv_buf[3:3+length])
            self._recv_buf = self._recv_buf[3+length+1:]
            await self._parse_glow(frame)

    async def _parse_glow(self, data: bytes):
        """Parse Glow DTD and update tree"""
        try:
            pos = 0
            while pos < len(data):
                tag = data[pos]; pos += 1
                length, pos = ber_decode_length(data, pos)
                content = data[pos:pos+length]; pos += length

                if tag == GLOW_QUALIFIED_PARAM:
                    await self._handle_parameter(content)
                elif tag == GLOW_QUALIFIED_MATRIX:
                    await self._handle_matrix(content)
                elif tag == GLOW_QUALIFIED_NODE:
                    await self._handle_node(content)
        except Exception as e:
            logger.debug(f"Glow parse error: {e}")

    async def _handle_parameter(self, data: bytes):
        """Extract parameter path and value"""
        path_str = ""
        value = None
        pos = 0
        while pos < len(data):
            ctx = data[pos]; pos += 1
            length, pos = ber_decode_length(data, pos)
            content = data[pos:pos+length]; pos += length
            if ctx == 0xA0:  # path
                path_str = self._decode_oid(content)
            elif ctx == 0xA1:  # contents
                value = self._decode_value(content)

        if path_str:
            if path_str not in self.parameters:
                self.parameters[path_str] = EmberParameter(
                    path=[], identifier=path_str, value=value
                )
            else:
                self.parameters[path_str].value = value
            for cb in self._callbacks:
                asyncio.create_task(cb("parameter_changed", path_str, value))

    async def _handle_matrix(self, data: bytes):
        """Extract matrix connections"""
        path_str = ""
        connections = {}
        pos = 0
        while pos < len(data):
            ctx = data[pos]; pos += 1
            length, pos = ber_decode_length(data, pos)
            content = data[pos:pos+length]; pos += length
            if ctx == 0xA0:
                path_str = self._decode_oid(content)
            elif ctx == 0xA5:  # connections
                connections = self._decode_connections(content)

        if path_str:
            if path_str not in self.matrices:
                self.matrices[path_str] = EmberMatrix(path=[], identifier=path_str)
            for target, sources in connections.items():
                self.matrices[path_str].connect(target, sources)
            for cb in self._callbacks:
                asyncio.create_task(cb("matrix_changed", path_str, connections))

    async def _handle_node(self, data: bytes):
        pass  # Tree navigation — expand on demand

    def _decode_oid(self, data: bytes) -> str:
        if not data or data[0] != BER_RELATIVE_OID:
            return ""
        length, pos = ber_decode_length(data, 1)
        parts = []
        val = 0
        for b in data[pos:pos+length]:
            val = (val << 7) | (b & 0x7F)
            if not (b & 0x80):
                parts.append(val)
                val = 0
        return ".".join(str(p) for p in parts)

    def _decode_value(self, data: bytes) -> Any:
        if not data:
            return None
        tag = data[0]
        length, pos = ber_decode_length(data, 1)
        content = data[pos:pos+length]
        if tag == BER_INTEGER:
            return int.from_bytes(content, 'big', signed=True)
        elif tag == BER_REAL:
            return struct.unpack('>d', content)[0] if len(content) == 8 else 0.0
        elif tag == BER_UTF8_STR:
            return content.decode('utf-8', errors='replace')
        elif tag == BER_BOOLEAN:
            return content[0] != 0
        return None

    def _decode_connections(self, data: bytes) -> Dict[int, List[int]]:
        return {}  # Full BER decode of connection list — simplified

    async def set_parameter(self, path: str, value: Any):
        """Set a parameter value on the device"""
        path_parts = [int(p) for p in path.split(".")]
        oid = ber_encode_oid(path_parts)
        if isinstance(value, int):
            val_bytes = ber_encode_integer(value)
        elif isinstance(value, float):
            val_bytes = ber_encode_real(value)
        elif isinstance(value, str):
            val_bytes = ber_encode_utf8(value)
        else:
            return

        contents = bytes([0xA1]) + ber_encode_length(len(val_bytes)) + val_bytes
        path_ctx = bytes([0xA0]) + ber_encode_length(len(oid)) + oid
        param_data = path_ctx + contents
        param = bytes([GLOW_QUALIFIED_PARAM]) + ber_encode_length(len(param_data)) + param_data
        root = bytes([GLOW_ROOT]) + ber_encode_length(len(param))
        await self._send_raw(_framed(root + param))

    async def connect_matrix(self, matrix_path: str, target: int, source: int):
        """Connect a matrix crosspoint"""
        path_parts = [int(p) for p in matrix_path.split(".")]
        oid = ber_encode_oid(path_parts)
        # Build connection object
        conn_data = ber_encode_integer(target) + ber_encode_integer(source)
        conn = bytes([GLOW_CONNECTION]) + ber_encode_length(len(conn_data)) + conn_data
        conn_coll = bytes([0xA5]) + ber_encode_length(len(conn)) + conn
        path_ctx = bytes([0xA0]) + ber_encode_length(len(oid)) + oid
        matrix_data = path_ctx + conn_coll
        matrix = bytes([GLOW_QUALIFIED_MATRIX]) + ber_encode_length(len(matrix_data)) + matrix_data
        root = bytes([GLOW_ROOT]) + ber_encode_length(len(matrix))
        await self._send_raw(_framed(root + matrix))

    async def subscribe(self, path: str):
        """Subscribe to parameter changes"""
        path_parts = [int(p) for p in path.split(".")]
        oid = ber_encode_oid(path_parts)
        cmd_data = ber_encode_integer(CMD_SUBSCRIBE)
        cmd = bytes([GLOW_COMMAND]) + ber_encode_length(len(cmd_data)) + cmd_data
        cmd_ctx = bytes([0xA2]) + ber_encode_length(len(cmd)) + cmd
        path_ctx = bytes([0xA0]) + ber_encode_length(len(oid)) + oid
        node_data = path_ctx + cmd_ctx
        node = bytes([GLOW_QUALIFIED_NODE]) + ber_encode_length(len(node_data)) + node_data
        root = bytes([GLOW_ROOT]) + ber_encode_length(len(node))
        await self._send_raw(_framed(root + node))
