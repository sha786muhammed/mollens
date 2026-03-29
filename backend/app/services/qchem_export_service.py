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


def generate_pdb(atoms: list[dict[str, Any]]) -> str:
    """Generate a simple PDB text using atom coordinates."""
    normalized = _normalize_atoms(atoms)
    lines = []
    for idx, atom in enumerate(normalized, start=1):
        lines.append(
            "HETATM"
            f"{idx:5d} "
            f"{str(atom['element'])[:2]:>2}  MOL A   1    "
            f"{atom['x']:8.3f}{atom['y']:8.3f}{atom['z']:8.3f}"
            "  1.00  0.00           "
            f"{str(atom['element'])[:2]:>2}"
        )
    lines.append("END")
    return "\n".join(lines) + "\n"


def generate_sdf(atoms: list[dict[str, Any]]) -> str:
    """Generate a minimal SDF (V2000) text without bond records."""
    normalized = _normalize_atoms(atoms)
    lines = [
        "MolLens",
        "  MolLens 3D Export",
        "",
        f"{len(normalized):>3}{0:>3}  0  0  0  0            999 V2000",
    ]
    for atom in normalized:
        lines.append(
            f"{atom['x']:>10.4f}{atom['y']:>10.4f}{atom['z']:>10.4f} "
            f"{str(atom['element'])[:3]:<3} 0  0  0  0  0  0  0  0  0  0  0  0"
        )
    lines.extend(["M  END", "$$$$"])
    return "\n".join(lines) + "\n"


def generate_mol(atoms: list[dict[str, Any]]) -> str:
    """Generate a minimal MOL (V2000) text without bond records."""
    sdf_text = generate_sdf(atoms)
    return "\n".join(sdf_text.splitlines()[:-1]) + "\n"
