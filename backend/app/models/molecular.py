"""Molecular structure data models"""
from pydantic import BaseModel
from typing import Optional, List


class Atom(BaseModel):
    """Atom in a molecular structure"""
    index: int
    symbol: str
    x: float
    y: float
    z: float
    charge: Optional[float] = 0.0


class Bond(BaseModel):
    """Bond between two atoms"""
    atom1: int
    atom2: int
    bond_type: str  # "single", "double", "triple", "aromatic"


class MolecularStructure(BaseModel):
    """3D molecular structure representation"""
    atoms: List[Atom]
    bonds: List[Bond]
    smiles: Optional[str] = None
    molecular_weight: Optional[float] = None
    formula: Optional[str] = None
