"""Quantum chemistry input export helpers."""
from __future__ import annotations

from typing import Any


def _normalize_atoms(atoms: list[dict[str, Any]]) -> list[dict[str, float | str]]:
    """Validate and normalize atom coordinate records for export."""
    normalized: list[dict[str, float | str]] = []

    for atom in atoms:
        element = str(atom.get("element", "")).strip()
        if not element:
            raise ValueError("Each atom must include an element symbol.")

        try:
            x = float(atom.get("x"))
            y = float(atom.get("y"))
            z = float(atom.get("z"))
        except (TypeError, ValueError) as exc:
            raise ValueError("Each atom must include numeric x, y, z coordinates.") from exc

        normalized.append({"element": element, "x": x, "y": y, "z": z})

    if not normalized:
        raise ValueError("Atoms list cannot be empty.")

    return normalized


def generate_gaussian_input(
    atoms: list[dict[str, Any]],
    charge: int = 0,
    multiplicity: int = 1,
) -> str:
    """Generate Gaussian .gjf text from atom coordinates."""
    normalized = _normalize_atoms(atoms)

    atom_lines = [
        f"{atom['element']}  {atom['x']:.6f}  {atom['y']:.6f}  {atom['z']:.6f}"
        for atom in normalized
    ]

    parts = [
        "%chk=molecule.chk",
        "#p B3LYP/6-31G(d) Opt",
        "",
        "MolLens Gaussian Export",
        "",
        f"{charge} {multiplicity}",
        *atom_lines,
        "",
    ]

    return "\n".join(parts)


def generate_orca_input(
    atoms: list[dict[str, Any]],
    charge: int = 0,
    multiplicity: int = 1,
) -> str:
    """Generate ORCA .inp text from atom coordinates."""
    normalized = _normalize_atoms(atoms)

    atom_lines = [
        f"  {atom['element']}  {atom['x']:.6f}  {atom['y']:.6f}  {atom['z']:.6f}"
        for atom in normalized
    ]

    parts = [
        "! B3LYP def2-SVP Opt",
        "",
        f"* xyz {charge} {multiplicity}",
        *atom_lines,
        "*",
        "",
    ]

    return "\n".join(parts)
