"""Image utilities for preprocessing molecular images."""
from __future__ import annotations

import importlib
import tempfile
from pathlib import Path


def crop_image(image_path: str, x: int, y: int, width: int, height: int) -> str:
    """Crop an image region and return a temporary file path for the cropped image."""
    if x < 0 or y < 0 or width <= 0 or height <= 0:
        raise ValueError("Crop parameters must be non-negative with positive size.")

    source_path = Path(image_path)
    if not source_path.exists() or not source_path.is_file():
        raise ValueError("Image file not found for cropping.")

    try:
        pillow_image = importlib.import_module("PIL.Image")
    except ModuleNotFoundError as exc:
        raise ValueError("Pillow is not installed.") from exc

    try:
        with pillow_image.open(source_path) as image:
            image_width, image_height = image.size
            if x + width > image_width or y + height > image_height:
                raise ValueError("Crop region exceeds image bounds.")

            cropped = image.crop((x, y, x + width, y + height))
            suffix = source_path.suffix or ".png"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as out_file:
                cropped.save(out_file.name)
                return out_file.name
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Failed to crop image: {exc}") from exc
