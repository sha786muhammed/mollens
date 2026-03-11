# API Reference

## Base URL

`http://localhost:8000`

## Endpoints

### Health Check

**GET** `/health`

Response:

```json
{
  "status": "ok",
  "service": "mollens-backend"
}
```

### SMILES to 3D Structure

**POST** `/smiles`

Request:

```json
{
  "smiles": "CCO"
}
```

Response:

```json
{
  "input_smiles": "CCO",
  "optimized": true,
  "atom_count": 3,
  "atoms": [
    {
      "id": 1,
      "element": "C",
      "x": 1.0,
      "y": 0.0,
      "z": 0.0
    }
  ]
}
```

### Upload Molecular Image

**POST** `/upload-image`

Request: multipart form-data with a `file` field.

Response:

```json
{
  "filename": "molecule.png",
  "content_type": "image/png",
  "size_bytes": 12345,
  "message": "Image accepted. 3D extraction pipeline is placeholder."
}
```

## Docs

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
