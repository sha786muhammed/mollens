"""MolScribe-powered image to SMILES recognition service."""
from __future__ import annotations

import logging
from typing import Any

from molscribe import MolScribe
from huggingface_hub import hf_hub_download

logger = logging.getLogger(__name__)

_model: Any | None = None


def get_model() -> Any:
    global _model
    if _model is None:
        logger.warning("Loading MolScribe model...")
        ckpt_path = hf_hub_download(
            repo_id="yujieq/MolScribe",
            filename="swin_base_char_aux_1m.pth",
        )
        _model = MolScribe(ckpt_path)
        logger.warning("MolScribe model loaded successfully")
    return _model


def image_to_smiles(image_path: str) -> dict[str, Any]:
    try:
        model = get_model()
        result = model.predict_image_file(image_path)

        logger.warning("MolScribe raw result: %s", result)

        smiles = None
        confidence = None

        if isinstance(result, dict):
            smiles = result.get("smiles")
            confidence = result.get("confidence")

        if not smiles:
            return {"error": "No molecule detected in image"}

        logger.warning("MolScribe predicted: %s", smiles)

        return {
            "predicted_smiles": smiles,
            "confidence": confidence,
        }

    except Exception as e:  # pragma: no cover - runtime dependency behavior
        logger.error("MolScribe prediction failed: %s", e)
        return {"error": str(e)}
