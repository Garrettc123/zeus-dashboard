"""Garcar Base Contract sidecar for zeus-dashboard (role: ui_control_plane)."""
from collections import deque
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI

SYSTEM = "zeus-dashboard"
ROLE = "ui_control_plane"
VERSION = "1.0.0"
CONTRACT_VERSION = "1.0.0"

app = FastAPI(title=f"{SYSTEM} Garcar Base Contract", version=VERSION)

_events: deque[dict[str, Any]] = deque(maxlen=1000)
_counters: dict[str, int] = {
    "requests_total": 0,
    "health_checks": 0,
    "meta_checks": 0,
    "metrics_checks": 0,
    "events_checks": 0,
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/health")
async def health() -> dict[str, Any]:
    _counters["health_checks"] += 1
    _counters["requests_total"] += 1
    return {
        "status": "healthy",
        "system": SYSTEM,
        "version": VERSION,
        "timestamp": _now(),
    }


@app.get("/meta")
async def meta() -> dict[str, Any]:
    _counters["meta_checks"] += 1
    _counters["requests_total"] += 1
    return {
        "system": SYSTEM,
        "role": ROLE,
        "contract_version": CONTRACT_VERSION,
        "endpoints": ["/health", "/meta", "/metrics", "/events"],
        "event_bus_topic_schema": "garcar.{system}.{event_type}",
    }


@app.get("/metrics")
async def metrics() -> dict[str, Any]:
    _counters["metrics_checks"] += 1
    _counters["requests_total"] += 1
    return dict(_counters)


@app.get("/events")
async def events() -> dict[str, Any]:
    _counters["events_checks"] += 1
    _counters["requests_total"] += 1
    ev = list(_events)
    return {"events": ev, "total": len(ev)}
