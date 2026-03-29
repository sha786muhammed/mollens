# MolLens

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.10%2B-3776AB?logo=python&logoColor=white)
![Node](https://img.shields.io/badge/node-18%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/frontend-React%2018-61DAFB?logo=react&logoColor=0A0A0A)
![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688?logo=fastapi&logoColor=white)
![RDKit](https://img.shields.io/badge/cheminformatics-RDKit-F28C28)
![Open Source](https://img.shields.io/badge/open%20source-yes-7C3AED)

MolLens is an open-source molecular workbench for turning chemical inputs into interactive 3D structures.

It combines a FastAPI backend, RDKit-based 3D generation, MolScribe image recognition, and a React workspace with a modern 2D-to-3D editing flow. Users can start from a SMILES string, a chemical name, or an image, then inspect, edit, regenerate, and export molecular structures inside a browser-based workspace.

## What MolLens Does

MolLens is designed for fast molecular prototyping and visualization.

Core workflows:
- Convert a SMILES string into an optimized 3D structure
- Resolve a chemical name through PubChem or NIH CACTUS
- Extract a structure from a molecular image using MolScribe OCR/OCSR
- Edit the molecule in a 2D editor using Ketcher or JSME
- Generate or refresh the 3D view from the current sketch
- Export coordinates and input decks for downstream computational chemistry tools

## Key Features

### Input and Recognition
- SMILES input and validation
- Chemical name lookup via PubChem with NIH CACTUS fallback
- Molecular image upload with MolScribe-based structure recognition
- Shared molecule state between home flow and workspace

### Workspace
- Split-screen molecular workspace
- Ketcher as the default advanced 2D editor
- JSME available as a lighter alternative editor
- Interactive 3D viewer powered by 3Dmol.js
- Viewer controls for representation mode, hydrogens, labels, fullscreen, and download
- Workspace modes: Side by Side, Sketcher Only, Viewer Only, Info Card Only
- History of recent generated structures
- Generation status and 2D/3D sync feedback

### Chemistry and Exports
- RDKit-based conformer embedding and force-field minimization
- Basic molecular descriptors: formula, molecular weight, logP, H-bond counts, TPSA
- InChI and InChIKey generation where possible
- Export helpers for Gaussian, ORCA, PDB, SDF, and MOL

## Tech Stack

### Frontend
- React 18
- React Router 6
- 3Dmol.js
- Ketcher
- JSME

### Backend
- FastAPI
- RDKit
- MolScribe
- PyTorch
- SlowAPI rate limiting

## Repository Structure

```text
MolLens/
├── backend/
│   ├── app/
│   │   ├── core/              # App config, limiter, backend wiring
│   │   ├── models/            # Request/response payload models
│   │   ├── routes/            # FastAPI routes
│   │   ├── services/          # RDKit, MolScribe, PubChem, export services
│   │   └── utils/             # Validation and image utilities
│   ├── models/molscribe/      # MolScribe checkpoint
│   ├── requirements.txt
│   └── runtime.txt
├── frontend/
│   ├── public/                # Static assets, including local JSME resources
│   ├── scripts/               # Frontend setup/patch scripts
│   ├── src/
│   │   ├── components/        # Sketcher, viewer, info, export, header components
│   │   ├── context/           # Workspace molecule state
│   │   ├── pages/             # Home and workspace pages
│   │   ├── styles/            # App and workspace styling
│   │   └── vendor/            # Vendored frontend assets (e.g. sanitized Ketcher CSS)
│   ├── package.json
│   └── .env.production
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── INSTALLATION.md
│   └── README.md
├── examples/
├── LICENSE
└── README.md
```

## Installation Requirements

### System Requirements
- Python 3.10 or newer
- Node.js 18 or newer
- npm 9 or newer

### Recommended Environment
- macOS, Linux, or WSL2
- Python virtual environment for the backend
- Modern Chromium-based browser for the frontend workspace

### Important Backend Notes
- `rdkit`, `torch`, and `molscribe` are heavy dependencies
- the repository includes a MolScribe checkpoint under `backend/models/molscribe/molscribe.ckpt`
- if `pip install rdkit` is problematic on your platform, use a Conda environment with `conda-forge`

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/sha786muhammed/mollens.git
cd MolLens
```

### 2. Start the Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend will be available at:
- `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

### 3. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm start
```

Frontend will be available at:
- `http://localhost:3000`

## Local Development Workflow

1. Open the home page
2. Enter a SMILES string, chemical name, or upload a structure image
3. Navigate into the workspace automatically
4. Edit the structure using Ketcher or JSME
5. Click `Generate 3D` to refresh the molecular viewer
6. Inspect molecule metadata or export files for downstream use

## Available API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/smiles` | Generate 3D structure from SMILES or molblock |
| `POST` | `/upload-image` | Run MolScribe on an uploaded image |
| `POST` | `/chemical-name` | Resolve chemical name and generate structure |
| `GET` | `/chemical-name-suggestions` | PubChem autocomplete suggestions |
| `POST` | `/export-gaussian` | Export Gaussian input |
| `POST` | `/export-orca` | Export ORCA input |
| `POST` | `/export-pdb` | Export PDB coordinates |
| `POST` | `/export-sdf` | Export SDF coordinates |
| `POST` | `/export-mol` | Export MOL coordinates |

See [docs/API.md](docs/API.md) for request and response details.

## Environment and Configuration

### Backend
The backend accepts localhost frontend origins automatically via CORS regex. You can also provide explicit production origins through:

```bash
MOLLENS_FRONTEND_ORIGINS=https://your-frontend.example.com
```

### Frontend
The current frontend API base is configured in:
- [frontend/src/api.js](frontend/src/api.js)

If you deploy the API elsewhere, update `API_BASE` or refactor it to read from an environment variable.

## Build and Deployment

### Frontend Production Build

```bash
cd frontend
npm run build
```

### Backend Production Command

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

### Deployment Notes
- frontend and backend can be deployed separately
- ensure the frontend points to the correct backend base URL
- configure `MOLLENS_FRONTEND_ORIGINS` for production domains
- `frontend/.env.production` disables noisy source-map generation in production builds

## Documentation

- [Documentation Index](docs/README.md)
- [Installation Guide](docs/INSTALLATION.md)
- [API Reference](docs/API.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Current Status

MolLens currently focuses on:
- single-molecule and fragment-aware visualization
- open-source chemistry editing in the browser
- fast local experimentation with 2D and 3D molecular workflows

It is suitable for demos, prototyping, local research tooling, and continued open-source development.

## License

MolLens is released under the MIT License. See [LICENSE](LICENSE).
