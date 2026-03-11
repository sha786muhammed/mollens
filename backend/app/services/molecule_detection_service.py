"""Molecule region detection service using OpenCV contour analysis."""
from __future__ import annotations

import importlib
from typing import Any


def detect_molecule_regions(image_path: str) -> list[dict[str, int]]:
    """Detect candidate molecular regions and return bounding boxes."""
    try:
        cv2 = importlib.import_module("cv2")
    except ModuleNotFoundError:
        return []

    image = cv2.imread(image_path)
    if image is None:
        return []

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)
    edges = cv2.erode(edges, kernel, iterations=1)

    contours_data = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = contours_data[0] if len(contours_data) == 2 else contours_data[1]

    height, width = gray.shape
    image_area = float(height * width)

    regions: list[dict[str, int]] = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = float(w * h)

        if area < max(400.0, image_area * 0.002):
            continue

        if area > image_area * 0.95:
            continue

        aspect_ratio = w / float(h) if h > 0 else 999.0
        if aspect_ratio < 0.2 or aspect_ratio > 6.0:
            continue

        regions.append({"x": int(x), "y": int(y), "width": int(w), "height": int(h)})

    regions.sort(key=lambda region: (region["y"], region["x"]))

    deduped: list[dict[str, int]] = []
    for region in regions:
        if not any(_iou(region, existing) > 0.8 for existing in deduped):
            deduped.append(region)

    return deduped


def _iou(a: dict[str, int], b: dict[str, int]) -> float:
    """Compute Intersection over Union for two bounding boxes."""
    ax1, ay1 = a["x"], a["y"]
    ax2, ay2 = a["x"] + a["width"], a["y"] + a["height"]
    bx1, by1 = b["x"], b["y"]
    bx2, by2 = b["x"] + b["width"], b["y"] + b["height"]

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0, inter_x2 - inter_x1)
    inter_h = max(0, inter_y2 - inter_y1)
    intersection = inter_w * inter_h

    if intersection <= 0:
        return 0.0

    area_a = a["width"] * a["height"]
    area_b = b["width"] * b["height"]
    union = area_a + area_b - intersection
    if union <= 0:
        return 0.0

    return intersection / float(union)
