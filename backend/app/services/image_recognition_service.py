"""Image recognition service powered by DECIMER OCSR."""
from __future__ import annotations

import importlib
from pathlib import Path
from typing import Any


def image_to_smiles(image_path: str) -> dict[str, Any]:
    """Run DECIMER OCSR inference on an image and return SMILES + confidence."""
    candidate_path = Path(image_path)
    if not candidate_path.exists() or not candidate_path.is_file():
        return {"error": "Image file not found"}

    try:
        pillow_image = importlib.import_module("PIL.Image")
    except ModuleNotFoundError:
        return {"error": "Pillow is not installed"}

    try:
        with pillow_image.open(candidate_path) as image:
            image.verify()
    except Exception:
        return {"error": "Invalid image file"}

    try:
        decimer_module = importlib.import_module("DECIMER")
    except ModuleNotFoundError:
        return {"error": "DECIMER is not installed"}

    predict_smiles = getattr(decimer_module, "predict_SMILES", None)
    if predict_smiles is None:
        return {"error": "DECIMER predict_SMILES API not available"}

    try:
        prediction = predict_smiles(str(candidate_path))
    except Exception as exc:
        return {"error": f"DECIMER prediction failed: {exc}"}

    predicted_smiles = ""
    confidence = 0.0

    if isinstance(prediction, dict):
        predicted_smiles = str(
            prediction.get("predicted_smiles")
            or prediction.get("smiles")
            or ""
        ).strip()
        confidence = float(prediction.get("confidence", 0.0) or 0.0)
    elif isinstance(prediction, tuple):
        if prediction:
            predicted_smiles = str(prediction[0] or "").strip()
        if len(prediction) > 1 and prediction[1] is not None:
            try:
                confidence = float(prediction[1])
            except (TypeError, ValueError):
                confidence = 0.0
    else:
        predicted_smiles = str(prediction or "").strip()

    if not predicted_smiles:
        return {"error": "DECIMER returned an empty prediction"}

    return {
        "predicted_smiles": predicted_smiles,
        "confidence": confidence,
    }
