"""FastAPI application entry point for MolLens."""
import importlib
import logging
import time

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router as molecular_router
from app.services.molscribe_service import get_model

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)
VERSION = "0.1"

def create_app() -> FastAPI:
    """Application factory for the MolLens backend server."""
    app = FastAPI(
        title="MolLens API",
        description="Convert molecular images or SMILES into optimized 3D structures",
        version=f"{VERSION}.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"http://(localhost|127.0.0.1):\d+",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
        return response

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon() -> Response:
        return Response(status_code=204)

    app.include_router(molecular_router)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
