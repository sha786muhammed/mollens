"""Service layer for molecular image workflows."""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException, UploadFile


SUPPORTED_IMAGE_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
}


async def handle_image_upload(file: UploadFile) -> dict[str, Any]:
    """Validate and accept a molecular image upload."""
    content, filename, content_type = await read_validated_upload(file)
    return {
        "filename": filename,
        "content_type": content_type,
        "size_bytes": len(content),
        "message": "Image accepted. 3D extraction pipeline is placeholder.",
    }


async def read_validated_upload(file: UploadFile) -> tuple[bytes, str, str]:
    """Validate upload metadata and return file content for downstream processing."""
    if file.content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image type. Use PNG, JPEG, WEBP, or GIF.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    return content, (file.filename or "upload-image"), file.content_type
