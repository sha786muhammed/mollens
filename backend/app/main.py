"""FastAPI application entry point for MolLens."""
import importlib
import logging
import os
import time

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.limiter import limiter
from app.routes import router as molecular_router
from app.services.molscribe_service import get_model

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)
VERSION = "0.1"


def _configured_origins() -> list[str]:
    origins: list[str] = []
    configured = os.getenv("MOLLENS_FRONTEND_ORIGINS", "")
    for origin in configured.split(","):
        cleaned = origin.strip()
        if cleaned:
            origins.append(cleaned)
    return origins

def create_app() -> FastAPI:
    """Application factory for the MolLens backend server."""
    app = FastAPI(
        title="MolLens API",
        description="Convert molecular images or SMILES into optimized 3D structures",
        version=f"{VERSION}.0",
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_configured_origins(),
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SlowAPIMiddleware)

    @app.on_event("startup")
    def load_models() -> None:
        """Load MolScribe model once during startup."""
        try:
            importlib.import_module("rdkit")
            logger.warning("rdkit import check: OK")
        except Exception as exc:
            logger.error("rdkit import check failed: %s", exc)

        get_model()

    @app.middleware("http")
    async def log_request_time(request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration = time.time() - start
        logger.debug("%s %s completed in %.2fs", request.method, request.url.path, duration)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon() -> Response:
        return Response(status_code=204)

    app.include_router(molecular_router)
    return app


async def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    del request
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "details": str(exc),
        },
    )


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
