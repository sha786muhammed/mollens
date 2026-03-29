"""Request payload models for MolLens API endpoints."""

from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

from app.utils.validation import sanitize_text


class SmilesRequest(BaseModel):
    """Payload for SMILES input endpoint."""

    smiles: str | None = Field(default=None, max_length=1000, description="Molecule in SMILES format")
    molblock: str | None = Field(default=None, max_length=200000, description="Optional molfile/molblock from sketcher")

    @field_validator("smiles")
    @classmethod
    def validate_smiles(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return sanitize_text(value, max_length=1000, field_name="SMILES")

    @field_validator("molblock")
    @classmethod
    def validate_molblock(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not value.strip():
            return None
        # Preserve leading header lines in V2000/V3000 molblock format.
        return value.rstrip()

    @model_validator(mode="after")
    def validate_structure_payload(self) -> "SmilesRequest":
        if not self.smiles and not self.molblock:
            raise ValueError("Provide either SMILES or molblock")
        return self


class ExportRequest(BaseModel):
    """Payload for export endpoints."""

    atoms: list[dict[str, Any]] = Field(..., description="Atom list with element/x/y/z")
    charge: int = Field(default=0, description="Total molecular charge")
    multiplicity: int = Field(default=1, description="Spin multiplicity")


class ChemicalNameRequest(BaseModel):
    """Payload for chemical name search."""

    name: str = Field(..., max_length=200)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return sanitize_text(value, max_length=200, field_name="chemical name")
