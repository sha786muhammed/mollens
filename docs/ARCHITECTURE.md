# Architecture Overview

MolLens is a split frontend/backend molecular application.

## High-Level Design

### Frontend
The React frontend is responsible for:
- input collection on the home page
- workspace state management
- 2D editing via Ketcher or JSME
- 3D rendering via 3Dmol.js
- export actions and info display

### Backend
The FastAPI backend is responsible for:
- validating input payloads
- generating 3D coordinates with RDKit
- calculating descriptors and identifiers
- resolving names via PubChem and NIH CACTUS
- running image recognition via MolScribe
- generating export text formats

## Frontend Flow

1. User submits a SMILES string, a chemical name, or an image
2. Frontend calls the appropriate API endpoint
3. Result is stored in `MolLensContext`
4. Workspace consumes the shared molecule state
5. User edits the structure in Ketcher or JSME
6. `Generate 3D` submits the current live structure back to `/smiles`
7. Viewer and info card update from the response

## Backend Flow

### SMILES or Molblock
- validate request payload
- prefer molblock when present
- fall back to SMILES when needed
- embed a 3D conformer with RDKit ETKDGv3
- attempt MMFF minimization
- generate descriptors and identifiers
- return `molblock`, `sdf`, `xyz`, and atom coordinates

### Image Upload
- validate image type
- optionally crop input image
- run MolScribe recognition
- canonicalize predicted SMILES
- generate 3D output from the recognized structure

### Chemical Name Resolution
- query PubChem canonical SMILES
- fall back to NIH CACTUS
- pass resolved SMILES into the same 3D generation pipeline

## Important Frontend Modules

- `frontend/src/pages/HomePage.js`: intake flow
- `frontend/src/pages/WorkspacePage.js`: main chemistry workbench
- `frontend/src/components/KetcherSketcher.js`: advanced 2D editor
- `frontend/src/components/SketcherPanel.js`: JSME editor path
- `frontend/src/components/MoleculeViewer.js`: viewer integration and controls
- `frontend/src/components/Viewer3D.js`: viewer container and toolbar shell
- `frontend/src/context/MolLensContext.js`: shared workspace molecule state
- `frontend/src/api.js`: frontend API client

## Important Backend Modules

- `backend/app/main.py`: FastAPI app factory and middleware
- `backend/app/routes/molecular_routes.py`: API endpoints
- `backend/app/services/structure_service.py`: RDKit 3D generation and descriptors
- `backend/app/services/molecular_service.py`: image and name workflows
- `backend/app/services/pubchem_service.py`: PubChem and CACTUS lookup
- `backend/app/services/molscribe_service.py`: MolScribe model loading and inference
- `backend/app/services/qchem_export_service.py`: file export helpers

## Design Priorities

- keep a single shared molecule state across workflows
- preserve a stable sketcher-to-viewer workflow
- prefer explicit user-triggered 3D generation over constant background rerendering
- keep the frontend usable with open-source chemistry editors and viewers
