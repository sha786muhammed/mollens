"""API routes for MolLens backend."""
from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from rdkit import Chem

from app.services.molscribe_service import image_to_smiles
from app.services.molecular_service import read_validated_upload
from app.services.qchem_export_service import (
    generate_gaussian_input,
    generate_orca_input,
)
from app.services.structure_service import generate_3d_from_smiles
from app.utils.image_utils import crop_image

router = APIRouter()
logger = logging.getLogger(__name__)


class SmilesRequest(BaseModel):
    """Payload for SMILES input endpoint."""

    smiles: str = Field(..., description="Molecule in SMILES format")


class ExportRequest(BaseModel):
    """Payload for quantum chemistry export endpoints."""

    atoms: list[dict[str, Any]] = Field(..., description="Atom list with element/x/y/z")
    charge: int = Field(default=0, description="Total molecular charge")
    multiplicity: int = Field(default=1, description="Spin multiplicity")


@router.get("/health")
def health() -> dict[str, str]:
    """Simple lightweight health probe endpoint."""
    return {"status": "ok"}


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    x: str | None = Form(None),
    y: str | None = Form(None),
    width: str | None = Form(None),
    height: str | None = Form(None),
) -> dict[str, Any]:
    """Upload image, run MolScribe recognition, and generate an RDKit 3D structure."""
    content, filename, content_type = await read_validated_upload(file)
    suffix = Path(filename).suffix or _suffix_from_content_type(content_type)

    temp_file_path = ""

    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name

        try:
            x_val = _parse_optional_int_form_field(x, "x")
            y_val = _parse_optional_int_form_field(y, "y")
            width_val = _parse_optional_int_form_field(width, "width")
            height_val = _parse_optional_int_form_field(height, "height")
        except ValueError as exc:
            return {"error": str(exc)}

        result = await run_in_threadpool(
            _process_upload_pipeline_sync,
            temp_file_path,
            x_val,
            y_val,
            width_val,
            height_val,
        )
        return result
    except Exception as exc:
        logger.exception("Image processing pipeline failed")
        return {
            "error": "Image processing failed",
            "details": str(exc),
        }
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)


@router.post("/smiles")
async def smiles(payload: SmilesRequest) -> dict[str, Any]:
    """Convert SMILES input into an optimized 3D structure."""
    return await run_in_threadpool(generate_3d_from_smiles, payload.smiles)


@router.post("/export-gaussian")
async def export_gaussian(payload: ExportRequest) -> dict[str, str]:
    """Export atom coordinates to Gaussian input format."""
    try:
        gaussian_input = await run_in_threadpool(
            generate_gaussian_input,
            payload.atoms,
            payload.charge,
            payload.multiplicity,
        )
        return {"input": gaussian_input}
    except ValueError as exc:
        return {"error": str(exc), "input": ""}


@router.post("/export-orca")
async def export_orca(payload: ExportRequest) -> dict[str, str]:
    """Export atom coordinates to ORCA input format."""
    try:
        orca_input = await run_in_threadpool(
            generate_orca_input,
            payload.atoms,
            payload.charge,
            payload.multiplicity,
        )
        return {"input": orca_input}
    except ValueError as exc:
        return {"error": str(exc), "input": ""}


def _process_upload_pipeline_sync(
    temp_file_path: str,
    x_val: int | None,
    y_val: int | None,
    width_val: int | None,
    height_val: int | None,
) -> dict[str, Any]:
    """Synchronous image pipeline executed in a threadpool."""
    crop_path: str | None = None
    target_image_path = temp_file_path

    try:
        crop_params = [x_val, y_val, width_val, height_val]
        has_any_crop_param = any(value is not None for value in crop_params)
        if has_any_crop_param:
            if not all(value is not None for value in crop_params):
                return {
                    "error": "Crop parameters x, y, width, and height must all be provided"
                }

            try:
                crop_path = crop_image(
                    temp_file_path,
                    x_val,
                    y_val,
                    width_val,
                    height_val,
                )
                target_image_path = crop_path
            except ValueError as exc:
                logger.warning("Crop failed for upload-image: %s", exc)
                return {"error": str(exc)}

        return _run_single_molecule_pipeline(target_image_path)
    finally:
        if crop_path and os.path.exists(crop_path):
            os.unlink(crop_path)


def _run_single_molecule_pipeline(image_path: str) -> dict[str, Any]:
    """Run MolScribe, SMILES validation, and RDKit 3D generation for one image."""
    recognition_result = image_to_smiles(image_path)
    if "error" in recognition_result:
        return {"error": recognition_result.get("error") or "No molecule detected in image"}
    if "predicted_smiles" not in recognition_result:
        return {"error": "No molecule detected in image"}

    predicted_smiles = recognition_result["predicted_smiles"]
    mol = Chem.MolFromSmiles(predicted_smiles)
    if mol is None:
        logger.warning(
            "Invalid MolScribe SMILES prediction from upload-image: %s",
            predicted_smiles,
        )
        return {
            "error": "OCSR predicted invalid SMILES",
            "predicted_smiles": predicted_smiles,
        }

    structure_result = generate_3d_from_smiles(predicted_smiles)
    if "error" in structure_result:
        return {
            "predicted_smiles": predicted_smiles,
            "confidence": recognition_result.get("confidence", 0.0),
            **structure_result,
        }

    return {
        "predicted_smiles": predicted_smiles,
        "confidence": recognition_result.get("confidence", 0.0),
        "energy": structure_result.get("energy"),
        "atom_count": structure_result["atom_count"],
        "atoms": structure_result["atoms"],
        "conformer_count": structure_result.get("conformer_count"),
    }


def _suffix_from_content_type(content_type: str) -> str:
    mapping = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    return mapping.get(content_type, ".img")


def _parse_optional_int_form_field(value: str | None, field_name: str) -> int | None:
    """Normalize multipart form fields where empty strings should be treated as None."""
    if value is None or value == "":
        return None

    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(f"Invalid integer value for {field_name}") from exc
