"""Validation helpers for MolLens API inputs."""


def sanitize_text(value: str, *, max_length: int, field_name: str) -> str:
    """Trim and validate untrusted text inputs."""
    normalized = (value or "").strip()
    if not normalized:
        raise ValueError(f"No {field_name} provided")
    if len(normalized) > max_length:
        raise ValueError("Input too long")
    if any(ord(char) < 32 or ord(char) == 127 for char in normalized):
        raise ValueError(f"Invalid characters in {field_name}")
    return normalized


def parse_optional_int_form_field(value: str | None, field_name: str) -> int | None:
    """Normalize multipart form fields where empty strings should be treated as None."""
    if value is None or value == "":
        return None

    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(f"Invalid integer value for {field_name}") from exc
