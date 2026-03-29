# API Reference

Base URL:

```text
http://127.0.0.1:8000
```

## Health

### `GET /health`

Response:

```json
{
  "status": "ok"
}
```

## Generate 3D from SMILES or Molblock

### `POST /smiles`

Request body:

```json
{
  "smiles": "CC(=O)O",
  "molblock": "optional molfile text"
}
```

At least one of `smiles` or `molblock` must be present.

Typical response fields:
- `input_smiles`
- `inchi`
- `inchikey`
- `formula`
- `atom_count`
- `energy`
- `conformer_count`
- `molecular_weight`
- `logp`
- `h_bond_donors`
- `h_bond_acceptors`
- `topological_polar_surface_area`
- `molblock`
- `sdf`
- `xyz`
- `atoms`
- `pipeline`

Example response:

```json
{
  "input_smiles": "CC(=O)O",
  "formula": "C2H4O2",
  "atom_count": 8,
  "energy": -26.123456,
  "molblock": "...",
  "sdf": "...",
  "xyz": "...",
  "atoms": [
    {
      "id": 1,
      "element": "C",
      "x": 0.0,
      "y": 0.0,
      "z": 0.0
    }
  ],
  "pipeline": {
    "input_format_used": "smiles",
    "molblock_parse_succeeded": false,
    "smiles_fallback_used": false,
    "normalization_warning": false,
    "notes": "Generated from SMILES input"
  }
}
```

## Upload Image

### `POST /upload-image`

Request:
- `multipart/form-data`
- required field: `file`
- optional crop fields: `x`, `y`, `width`, `height`

Response contains recognized structure information and generated 3D output when successful.

Example fields:
- `predicted_smiles`
- `confidence`
- `input_smiles`
- `inchi`
- `inchikey`
- `molecular_weight`
- `logp`
- `atom_count`
- `atoms`

## Resolve Chemical Name

### `POST /chemical-name`

Request body:

```json
{
  "name": "caffeine"
}
```

Response contains resolved SMILES and generated 3D structure.

## Chemical Name Suggestions

### `GET /chemical-name-suggestions?q=<query>&limit=<n>`

Example response:

```json
{
  "suggestions": ["caffeine", "caffeic acid"]
}
```

## Export Endpoints

Each export endpoint accepts:

```json
{
  "atoms": [
    {
      "element": "C",
      "x": 0.0,
      "y": 0.0,
      "z": 0.0
    }
  ],
  "charge": 0,
  "multiplicity": 1
}
```

### Available exports
- `POST /export-gaussian`
- `POST /export-orca`
- `POST /export-pdb`
- `POST /export-sdf`
- `POST /export-mol`

Each returns a JSON object with an `input` string or an `error` field.

## Rate Limiting

MolLens uses SlowAPI-based request limiting on some endpoints:
- `/upload-image`: `10/minute`
- `/smiles`: `60/minute`
- `/chemical-name`: `30/minute`
