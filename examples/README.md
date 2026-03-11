# Examples

This directory contains example scripts and usage patterns for MolLens.

## SMILES Conversion Example

```python
from app.utils.molecular import smiles_to_structure, optimize_structure

# Convert SMILES to 3D structure
smiles = "CCO"  # Ethanol
structure = smiles_to_structure(smiles)

# Optimize the structure
optimized = optimize_structure(structure, method="mmff94")

print(optimized)
```

## API Usage Example

```bash
# Convert SMILES via API
curl -X POST "http://localhost:8000/api/v1/from-smiles" \
  -H "Content-Type: application/json" \
  -d '{"smiles": "CCO", "optimize": true}'

# Upload image via API
curl -X POST "http://localhost:8000/api/v1/from-image" \
  -F "file=@molecule.png"
```

## Example Molecules

- Ethanol: `CCO`
- Benzene: `c1ccccc1`
- Acetone: `CC(=O)C`
- Water: `O`

## Example Image Processing

Place molecular structure images in this directory and process them using the image upload endpoint.

Supported formats:
- PNG
- JPG/JPEG
- GIF
- BMP
