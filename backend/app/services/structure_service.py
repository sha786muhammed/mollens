"""RDKit-backed molecular structure generation services."""
from __future__ import annotations

from typing import Any


INVALID_SMILES_RESPONSE = {"error": "Invalid SMILES string"}
MAX_SMILES_LENGTH = 1000
MAX_MOLBLOCK_LENGTH = 200000


def generate_3d_from_smiles(smiles: str) -> dict[str, Any]:
    """Generate an optimized 3D molecular structure from a SMILES string."""
    normalized = canonicalize_smiles(smiles)
    if not normalized:
        return INVALID_SMILES_RESPONSE

    from rdkit import Chem

    molecule = Chem.MolFromSmiles(normalized)
    if molecule is None:
        return INVALID_SMILES_RESPONSE

    result = _generate_3d_from_molecule(molecule, normalized)
    if "error" in result:
        return result
    result["pipeline"] = {
        "input_format_used": "smiles",
        "molblock_parse_succeeded": False,
        "smiles_fallback_used": False,
        "normalization_warning": normalized != (smiles or "").strip(),
        "notes": "Generated from SMILES input"
    }
    return result


def generate_3d_from_molblock(molblock: str, fallback_smiles: str = "") -> dict[str, Any]:
    """Generate 3D structure from a sketcher molblock, with SMILES fallback when needed."""
    raw_molblock = molblock or ""
    if not raw_molblock.strip() or len(raw_molblock) > MAX_MOLBLOCK_LENGTH:
        fallback_result = generate_3d_from_smiles(fallback_smiles)
        if "error" not in fallback_result:
            fallback_result["pipeline"] = {
                "input_format_used": "smiles",
                "molblock_parse_succeeded": False,
                "smiles_fallback_used": True,
                "normalization_warning": fallback_result.get("pipeline", {}).get("normalization_warning", False),
                "notes": "Molblock unavailable or oversized; used SMILES fallback"
            }
        return fallback_result

    # Keep leading header lines intact; only normalize trailing whitespace/newlines.
    prepared_molblock = raw_molblock.rstrip()

    from rdkit import Chem

    try:
        molecule = Chem.MolFromMolBlock(prepared_molblock, sanitize=True, removeHs=False, strictParsing=False)
    except Exception:
        molecule = None

    if molecule is None:
        fallback_result = generate_3d_from_smiles(fallback_smiles)
        if "error" not in fallback_result:
            fallback_result["pipeline"] = {
                "input_format_used": "smiles",
                "molblock_parse_succeeded": False,
                "smiles_fallback_used": True,
                "normalization_warning": fallback_result.get("pipeline", {}).get("normalization_warning", False),
                "notes": "Molblock parse failed; used SMILES fallback"
            }
        return fallback_result

    try:
        canonical_smiles = Chem.MolToSmiles(Chem.RemoveHs(molecule))
    except Exception:
        canonical_smiles = canonicalize_smiles(fallback_smiles) or ""

    result = _generate_3d_from_molecule(molecule, canonical_smiles)
    if "error" in result:
        return result
    result["pipeline"] = {
        "input_format_used": "molblock",
        "molblock_parse_succeeded": True,
        "smiles_fallback_used": False,
        "normalization_warning": bool(fallback_smiles and canonical_smiles and canonical_smiles != fallback_smiles.strip()),
        "notes": "Generated from molblock input"
    }
    return result


def _generate_3d_from_molecule(molecule: Chem.Mol, input_smiles: str) -> dict[str, Any]:
    from rdkit import Chem
    from rdkit.Chem import AllChem
    from rdkit.Chem import Crippen, Descriptors, Lipinski, rdMolDescriptors

    base_molecule = Chem.RemoveHs(molecule)
    if base_molecule is None:
        return INVALID_SMILES_RESPONSE

    molecule_with_h = Chem.AddHs(base_molecule)

    conf_id = _embed_conformer(molecule_with_h)
    if conf_id is None:
        return {"error": "Failed to generate 3D conformer"}

    mmff_props = AllChem.MMFFGetMoleculeProperties(molecule_with_h, mmffVariant="MMFF94")
    energy = None
    if mmff_props is not None:
        force_field = AllChem.MMFFGetMoleculeForceField(
            molecule_with_h,
            mmff_props,
            confId=conf_id,
        )
        if force_field is not None:
            force_field.Minimize()
            energy = float(force_field.CalcEnergy())

    conformer = molecule_with_h.GetConformer(conf_id)
    atoms: list[dict[str, Any]] = []

    for atom in molecule_with_h.GetAtoms():
        atom_index = atom.GetIdx()
        position = conformer.GetAtomPosition(atom_index)
        atoms.append(
            {
                "id": atom_index + 1,
                "element": atom.GetSymbol(),
                "x": round(float(position.x), 6),
                "y": round(float(position.y), 6),
                "z": round(float(position.z), 6),
            }
        )

    inchi, inchikey = _compute_identifiers(base_molecule)
    resolved_smiles = input_smiles or Chem.MolToSmiles(base_molecule)
    viewer_molecule = Chem.Mol(molecule_with_h)
    try:
        Chem.Kekulize(viewer_molecule, clearAromaticFlags=True)
    except Exception:
        viewer_molecule = Chem.Mol(molecule_with_h)

    molblock_3d = Chem.MolToMolBlock(viewer_molecule, confId=conf_id)
    sdf_3d = f"{molblock_3d}\n$$$$\n"
    xyz_3d = mol_to_xyz(molecule_with_h)

    return {
        "input_smiles": resolved_smiles,
        "inchi": inchi,
        "inchikey": inchikey,
        "formula": rdMolDescriptors.CalcMolFormula(base_molecule),
        "atom_count": len(atoms),
        "energy": round(energy, 6) if energy is not None else None,
        "conformer_count": 1,
        "molecular_weight": round(float(Descriptors.MolWt(base_molecule)), 6),
        "logp": round(float(Crippen.MolLogP(base_molecule)), 6),
        "h_bond_donors": int(Lipinski.NumHDonors(base_molecule)),
        "h_bond_acceptors": int(Lipinski.NumHAcceptors(base_molecule)),
        "topological_polar_surface_area": round(float(rdMolDescriptors.CalcTPSA(base_molecule)), 6),
        "molblock": molblock_3d,
        "sdf": sdf_3d,
        "xyz": xyz_3d,
        "atoms": atoms,
    }


def _embed_conformer(molecule: Chem.Mol) -> int | None:
    """Embed a single ETKDGv3 conformer."""
    from rdkit.Chem import AllChem

    embed_params = AllChem.ETKDGv3()
    embed_params.randomSeed = 42
    try:
        conf_id = AllChem.EmbedMolecule(molecule, embed_params)
    except Exception:
        return None
    return int(conf_id) if conf_id >= 0 else None


def mol_to_xyz(mol: Chem.Mol) -> str:
    """Convert an RDKit molecule conformer to XYZ formatted text."""
    if mol is None or mol.GetNumAtoms() == 0 or mol.GetNumConformers() == 0:
        return ""

    conformer = mol.GetConformer()
    lines = [str(mol.GetNumAtoms()), "Generated by MolLens"]

    for atom in mol.GetAtoms():
        position = conformer.GetAtomPosition(atom.GetIdx())
        lines.append(
            f"{atom.GetSymbol()} {position.x:.6f} {position.y:.6f} {position.z:.6f}"
        )

    return "\n".join(lines)


def _compute_identifiers(molecule: Chem.Mol) -> tuple[str, str]:
    """Best-effort InChI/InChIKey generation."""
    from rdkit import Chem

    try:
        inchi = Chem.MolToInchi(molecule)
        inchikey = Chem.MolToInchiKey(molecule) if inchi else ""
        return inchi or "", inchikey or ""
    except Exception:
        return "", ""


def canonicalize_smiles(smiles: str) -> str | None:
    """Validate and canonicalize a SMILES string."""
    normalized = (smiles or "").strip()
    if not normalized or len(normalized) > MAX_SMILES_LENGTH:
        return None
    if any(ord(char) < 32 or ord(char) == 127 for char in normalized):
        return None

    try:
        from rdkit import Chem

        molecule = Chem.MolFromSmiles(normalized)
        if molecule is None:
            return None
        return Chem.MolToSmiles(molecule)
    except Exception:
        return None
