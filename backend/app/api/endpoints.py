"""Compatibility wrapper that exposes the active API router."""

from app.routes.molecular_routes import router

__all__ = ["router"]
