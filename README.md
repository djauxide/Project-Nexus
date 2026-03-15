# NEXUS v4 — Unified Broadcast IP Platform

[![CI](https://github.com/nexus-broadcast/nexus-v4-deployment/actions/workflows/ci.yml/badge.svg)](https://github.com/nexus-broadcast/nexus-v4-deployment/actions/workflows/ci.yml)
[![Security Scan](https://github.com/nexus-broadcast/nexus-v4-deployment/actions/workflows/security-scan.yml/badge.svg)](https://github.com/nexus-broadcast/nexus-v4-deployment/actions/workflows/security-scan.yml)

Software-defined broadcast infrastructure replacing traditional hardware routers, switchers, multiviewers, and monitoring with a unified IP-native platform.

## Quick Start

```bash
# Local development
cp .env.example .env
docker-compose up -d

# Access
open http://localhost:3000        # Web UI
open http://localhost:3001        # Grafana
open http://localhost:8080/health # API
```

## Architecture

```
Clients (Web UI / Touch Panel / Mobile)
          │
    API Gateway (Node.js/Fastify)
    REST · WebSocket · gRPC
          │
  ┌───────┼───────────┐
  │       │           │
Control  Media      Data
Services Services   Layer
  │       │           │
Switcher ST 2110   PostgreSQL
(Go)    Router     Redis
NMOS    (Rust/DPDK) InfluxDB
(Python) PTP (C)   MinIO/S3
          │
    Hardware Layer
    SDI Bridges (FPGA)
    PTP Grandmaster (GPS)
    400GbE IP Fabric
```

## Stack

| Layer | Technology |
|-------|-----------|
| API Gateway | Node.js 20 + Fastify |
| Switcher Service | Go 1.21 |
| ST 2110 Router | Rust + DPDK |
| NMOS Registry | Python 3.11 + FastAPI |
| Frontend | React 18 + TypeScript |
| Infrastructure | Terraform + Kubernetes |
| Monitoring | Prometheus + Grafana |
| Databases | PostgreSQL 15 + Redis 7 |

## Modules

| Module | Function |
|--------|----------|
| NEXUS MOSAIC | 32-source multiviewer, 8 layout presets |
| NEXUS SWITCH | 4 M/E virtual production switcher |
| NEXUS SCOPE | Waveform, vectorscope, histogram |
| NEXUS SYNC | PTP ST 2059-2 grandmaster, <50ns |
| NEXUS FLOW | SDN fabric, 400GbE core |
| NEXUS CONNECT | NMOS IS-04/IS-05 management |
| NEXUS SHUFFLE | 128×128 audio matrix, AES-67 |
| NEXUS REPLAY | 5-channel instant replay, 4K/120fps |
| NEXUS VAULT | ST 2110 recording, S3 cloud storage |
| NEXUS CLOUD | RIST/SRT/NDI/HLS contribution |

## Deployment

```bash
# Staging
./scripts/deploy.sh staging v4.0.0-rc1

# Production
./scripts/deploy.sh production v4.0.0

# Health check
./scripts/health-check.sh
```

## Docs

- [Deployment Guide](docs/deployment/DEPLOYMENT.md)
- [Architecture](docs/architecture/ARCHITECTURE.md)
- [API Reference](docs/deployment/API.md)
- [Contributing](CONTRIBUTING.md)

## License

Apache 2.0
