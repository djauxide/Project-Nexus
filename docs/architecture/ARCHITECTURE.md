# NEXUS v4 Architecture

## Overview

NEXUS v4 is a software-defined broadcast platform built on SMPTE ST 2110 IP media transport. It replaces traditional hardware routers, switchers, multiviewers, and monitoring with containerized microservices running on commodity hardware.

## System Layers

### Client Layer
- Web UI (React 18 + TypeScript) — primary control surface
- Touch Panel (React, optimized for 10" touchscreens)
- Mobile PWA — monitoring and basic control

### API Gateway (Node.js + Fastify)
- REST API for configuration and state
- WebSocket for real-time tally, PTP, and flow updates
- gRPC for inter-service communication
- Role-based access: VIEWER / OPERATOR / ENGINEER / TRAINER

### Control Services
| Service | Language | Function |
|---------|----------|----------|
| Switcher | Go | 4 M/E banks, sub-frame cut latency |
| NMOS Registry | Python | IS-04 discovery, IS-05 connection |
| Recorder | Go | ST 2110 → ProRes/DNxHD/H.264 |
| PTP Monitor | C | Grandmaster status, offset tracking |

### Media Services
| Service | Language | Function |
|---------|----------|----------|
| ST 2110 Router | Rust + DPDK | Packet routing, jitter buffering |
| SDI Bridge | FPGA (VHDL) | SDI ↔ ST 2110 conversion |
| PTP Grandmaster | C (linuxptp) | <50ns sync, GNSS locked |

### Data Layer
| Store | Purpose |
|-------|---------|
| PostgreSQL 15 | Configuration, audit log |
| Redis 7 | Real-time state, pub/sub |
| InfluxDB 2 | Metrics time-series |
| MinIO / S3 | Recording storage |

## Network Architecture

```
400GbE Core (2 switches, redundant)
    │
100GbE Spine (4 switches)
    │
25GbE Leaf (7 switches)
    │
Endpoints: SDI Bridges, Switchers, MV, Replay, Recorders
```

## PTP Timing

- Profile: SMPTE ST 2059-2
- Domain: 0
- Clock Class: 6 (GNSS locked)
- Typical offset: 4–12ns
- Maximum tolerance: 100ns (critical alert at 50ns)

## ST 2110 Flows

| Standard | Content | Flows |
|----------|---------|-------|
| ST 2110-20 | Video | 64 active |
| ST 2110-30 | Audio (AES-67) | 128 flows |
| ST 2110-31 | AES3 | 16 flows |
| ST 2110-40 | ANC data | 32 flows |

## Security

- Zero-trust network policies (Kubernetes NetworkPolicy)
- JWT authentication with 8h expiry
- Role-based access control at API and WebSocket level
- TLS everywhere in production
- Secrets via Vault / Kubernetes Secrets
- Container images scanned with Trivy on every build
