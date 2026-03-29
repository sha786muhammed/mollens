"""Service layer for molecular image workflows."""
from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from typing import Any

from fastapi import HTTPException, UploadFile

from app.services.molscribe_service import image_to_smiles
from app.services.pubchem_service import get_smiles_from_name
from app.services.structure_service import canonicalize_smiles, generate_3d_from_smiles
from app.utils.image_utils import crop_image


SUPPORTED_IMAGE_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
}
logger = logging.getLogger(__name__)


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


def process_uploaded_image(
    content: bytes,
    filename: str,
    content_type: str,
    *,
    x: int | None = None,
    y: int | None = None,
    width: int | None = None,
    height: int | None = None,
) -> dict[str, Any]:
    """Persist an uploaded image, optionally crop it, then run OCSR and 3D generation."""
    suffix = Path(filename).suffix or _suffix_from_content_type(content_type)
    temp_file_path = ""
    crop_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name

        target_image_path = temp_file_path
        crop_params = [x, y, width, height]
        has_any_crop_param = any(value is not None for value in crop_params)
        if has_any_crop_param:
            if not all(value is not None for value in crop_params):
                return error_response("Crop parameters x, y, width, and height must all be provided")

            try:
                crop_path = crop_image(temp_file_path, x, y, width, height)
                target_image_path = crop_path
            except ValueError as exc:
                logger.warning("Crop failed for upload-image: %s", exc)
                return error_response(str(exc))

        return run_image_pipeline(target_image_path)
    except Exception as exc:
        logger.exception("Image processing pipeline failed")
        return error_response("Image processing failed", str(exc))
    finally:
        if crop_path and os.path.exists(crop_path):
            os.unlink(crop_path)
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)


def run_image_pipeline(image_path: str) -> dict[str, Any]:
    """Run MolScribe, validate the predicted SMILES, and build a 3D structure."""
    recognition_result = image_to_smiles(image_path)
    if "error" in recognition_result:
        return error_response(recognition_result.get("error") or "No molecule detected in image")
    if "predicted_smiles" not in recognition_result:
        return error_response("No molecule detected in image")

    predicted_smiles = recognition_result["predicted_smiles"]
    canonical_smiles = canonicalize_smiles(predicted_smiles)
    if not canonical_smiles:
        logger.warning("Invalid MolScribe SMILES prediction from upload-image: %s", predicted_smiles)
        return {
            "error": "OCSR predicted invalid SMILES",
            "details": None,
            "predicted_smiles": predicted_smiles,
        }

    structure_result = generate_3d_from_smiles(canonical_smiles)
    if "error" in structure_result:
        return {
            "predicted_smiles": canonical_smiles,
            "confidence": recognition_result.get("confidence", 0.0),
            **structure_result,
        }

    return {
        "predicted_smiles": canonical_smiles,
        "confidence": recognition_result.get("confidence", 0.0),
        "input_smiles": structure_result.get("input_smiles"),
        "inchi": structure_result.get("inchi"),
        "inchikey": structure_result.get("inchikey"),
        "molecular_weight": structure_result.get("molecular_weight"),
        "logp": structure_result.get("logp"),
        "h_bond_donors": structure_result.get("h_bond_donors"),
        "h_bond_acceptors": structure_result.get("h_bond_acceptors"),
        "topological_polar_surface_area": structure_result.get("topological_polar_surface_area"),
        "energy": structure_result.get("energy"),
        "atom_count": structure_result["atom_count"],
        "atoms": structure_result["atoms"],
        "conformer_count": structure_result.get("conformer_count"),
    }


def generate_structure_from_chemical_name(name: str) -> dict[str, Any]:
    """Resolve a chemical name to SMILES and generate a 3D structure."""
    normalized_name = (name or "").strip()
    if not normalized_name:
        return error_response("No chemical name provided")

    resolved_smiles = get_smiles_from_name(normalized_name)
    if not resolved_smiles:
        return error_response(f"Chemical name '{normalized_name}' not found")

    structure = generate_3d_from_smiles(resolved_smiles)
    if "error" in structure:
        return {"name": normalized_name, "resolved_smiles": resolved_smiles, **structure}

    return {"name": normalized_name, "resolved_smiles": resolved_smiles, **structure}


def error_response(message: str, details: str | None = None) -> dict[str, Any]:
    """Standard error response payload."""
    response = {"error": message}
    if details:
        response["details"] = details
    return response


def _suffix_from_content_type(content_type: str) -> str:
    mapping = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    return mapping.get(content_type, ".img")
