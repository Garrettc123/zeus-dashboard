# Garcar Autonomous Wiring TODO for zeus-dashboard

Role: `ui_control_plane`

_Live fan-out: 2026-09-12 (wet / CASH_LOCK)_

## Required Garcar Base Contract
- [x] `/health` — **added** via `contract/` Python sidecar (Next.js UI unchanged)
- [x] `/meta` — **added** (role ui_control_plane, contract_version 1.0.0)
- [x] `/metrics` — **added** (JSON counters)
- [x] `/events` — **added** (in-memory ring)

Sidecar: `contract/app.py` + `contract/requirements.txt` + `contract/Dockerfile` (EXPOSE 8080).

## Event Bus Wiring
- [ ] Emit required events for this role (`garcar.zeus-dashboard.{event_type}`).
- [ ] Consume required arbitrage/control-plane events.
- Remaining: NATS/Redis Streams client; Zeus/Atlas dashboard visibility; contract+event tests.

## Current Full-Stack Components
- backend_api: FastAPI contract sidecar (`contract/app.py`)
- frontend_ui: Next.js
- payment_hook: None
- event_bus_connected: False
- observability_connected: False

## Wiring Tasks
1. ~~Add or verify Garcar Base Contract endpoints.~~ **DONE**
2. Add NATS/Redis Streams client and emit/consume required topics.
3. Ensure metrics/events appear in Zeus/Atlas dashboards.
4. Add tests for contract + event wiring.

## Safety
- Draft PR only. Do not auto-merge.
- Respect CASH_LOCK: no live spend / no silent outbound.
