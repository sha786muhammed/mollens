"""API routes for MolLens backend."""

import logging
from typing import Any

from fastapi import APIRouter, File, Form, Query, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from slowapi.errors import RateLimitExceeded

from app.core.limiter import limiter
from app.models import ChemicalNameRequest, ExportRequest, SmilesRequest
from app.services.molecular_service import (
    error_response,
    generate_structure_from_chemical_name,
    process_uploaded_image,
    read_validated_upload,
)
from app.services.qchem_export_service import (
    generate_gaussian_input,
    generate_mol,
    generate_orca_input,
    generate_pdb,
    generate_sdf,
)
from app.services.pubchem_service import suggest_chemical_names
from app.services.structure_service import generate_3d_from_molblock, generate_3d_from_smiles
from app.utils.validation import parse_optional_int_form_field, sanitize_text

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
def health() -> dict[str, str]:
    """Simple lightweight health probe endpoint."""
    return {"status": "ok"}


@router.post("/upload-image")
@limiter.limit("10/minute")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    x: str | None = Form(None),
    y: str | None = Form(None),
    width: str | None = Form(None),
    height: str | None = Form(None),
) -> dict[str, Any]:
    """Upload image, run MolScribe recognition, and generate an RDKit 3D structure."""
    del request
    content, filename, content_type = await read_validated_upload(file)

    try:
        try:
            x_val = parse_optional_int_form_field(x, "x")
            y_val = parse_optional_int_form_field(y, "y")
            width_val = parse_optional_int_form_field(width, "width")
            height_val = parse_optional_int_form_field(height, "height")
        except ValueError as exc:
            return error_response(str(exc))

        return await run_in_threadpool(
            process_uploaded_image,
            content,
            filename,
            content_type,
            x=x_val,
            y=y_val,
            width=width_val,
            height=height_val,
        )
    except RateLimitExceeded:
        raise
    except Exception as exc:
        logger.exception("Image processing pipeline failed")
        return error_response("Image processing failed", str(exc))


@router.post("/smiles")
@limiter.limit("60/minute")
async def smiles(request: Request, payload: SmilesRequest) -> dict[str, Any]:
    """Convert SMILES input into an optimized 3D structure."""
    del request
    if payload.molblock:
        result = await run_in_threadpool(generate_3d_from_molblock, payload.molblock, payload.smiles or "")
    else:
        result = await run_in_threadpool(generate_3d_from_smiles, payload.smiles or "")

    if isinstance(result, dict) and "error" in result and "pipeline" not in result:
        result["pipeline"] = {
            "input_format_used": "molblock" if payload.molblock else "smiles",
            "molblock_parse_succeeded": False if payload.molblock else None,
            "smiles_fallback_used": bool(payload.molblock and payload.smiles),
            "normalization_warning": False,
            "notes": "Generation failed before structure optimization"
        }
    return result


@router.post("/chemical-name")
@limiter.limit("30/minute")
async def chemical_name_search(request: Request, payload: ChemicalNameRequest) -> dict[str, Any]:
    """Resolve chemical name via PubChem and generate optimized 3D structure."""
    del request
    return await run_in_threadpool(generate_structure_from_chemical_name, payload.name)


@router.get("/chemical-name-suggestions")
async def chemical_name_suggestions(
    q: str = Query("", min_length=0, description="Partial chemical name"),
    limit: int = Query(8, ge=1, le=20),
) -> dict[str, list[str]]:
    """Get PubChem autocomplete suggestions for chemical names."""
    try:
        sanitized_query = sanitize_text(q, max_length=200, field_name="chemical name query")
    except ValueError:
        return {"suggestions": []}

    suggestions = await run_in_threadpool(suggest_chemical_names, sanitized_query, limit)
    return {"suggestions": suggestions}


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
        return {"error": str(exc), "details": None, "input": ""}


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
        return {"error": str(exc), "details": None, "input": ""}


@router.post("/export-pdb")
async def export_pdb(payload: ExportRequest) -> dict[str, str]:
    """Export atom coordinates to PDB format."""
    try:
        pdb_text = await run_in_threadpool(generate_pdb, payload.atoms)
        return {"input": pdb_text}
    except ValueError as exc:
        return {"error": str(exc), "details": None, "input": ""}


@router.post("/export-sdf")
async def export_sdf(payload: ExportRequest) -> dict[str, str]:
    """Export atom coordinates to SDF format."""
    try:
        sdf_text = await run_in_threadpool(generate_sdf, payload.atoms)
        return {"input": sdf_text}
    except ValueError as exc:
        return {"error": str(exc), "details": None, "input": ""}


@router.post("/export-mol")
async def export_mol(payload: ExportRequest) -> dict[str, str]:
    """Export atom coordinates to MOL format."""
    try:
        mol_text = await run_in_threadpool(generate_mol, payload.atoms)
        return {"input": mol_text}
    except ValueError as exc:
        return {"error": str(exc), "details": None, "input": ""}
