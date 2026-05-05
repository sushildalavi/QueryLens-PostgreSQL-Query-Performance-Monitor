from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.routes_collect import router as collect_router
from app.api.routes_queries import router as queries_router
from app.api.routes_regressions import router as regressions_router
from app.api.routes_reports import router as reports_router
from app.config import settings
from app.database import engine

log = logging.getLogger(__name__)

app = FastAPI(
    title="QueryLens",
    description="PostgreSQL query performance monitor",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(queries_router)
app.include_router(regressions_router)
app.include_router(collect_router)
app.include_router(reports_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.exception("unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "internal error"})


@app.get("/health", tags=["health"])
def health():
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = str(exc)
    return {"status": "ok", "db": db_status}
