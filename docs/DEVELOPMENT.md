# Development Guide

## Project Conventions

- frontend and backend are developed independently but share one molecule workflow
- the workspace is the main integration surface for 2D editing, 3D generation, and metadata
- frontend API calls are centralized in `frontend/src/api.js`
- backend route contracts are defined in `backend/app/routes/molecular_routes.py`

## Recommended Local Workflow

1. Start the backend
2. Start the frontend
3. Open the home page
4. Verify one path from each major source:
   - SMILES
   - chemical name
   - image upload
5. Verify workspace regeneration from the sketcher
6. Verify export endpoints if touched

## Frontend Notes

- Ketcher is the default editor
- JSME remains available as a fallback/lightweight editor
- Ketcher-related package warnings are patched through `frontend/scripts/patch-ketcher-sourcemaps.js`
- production builds disable source-map generation through `frontend/.env.production`

## Backend Notes

- `structure_service.py` is the core RDKit generation path
- `molecular_service.py` handles higher-level workflows for images and names
- keep API responses backward-compatible when extending payloads

## Useful Commands

### Frontend

```bash
cd frontend
npm install
npm start
npm run build
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Suggested Validation Checklist

- workspace opens from home flow at the top of the page
- Ketcher loads as default editor
- switching between Ketcher and JSME still works
- `Generate 3D` uses the live sketcher state
- viewer renders normal molecules and disconnected fragments without crashing
- export endpoints return valid output text

## Contributing

For substantial feature work:
- keep backend contracts stable
- prefer small focused PRs
- document new endpoints or workflow changes in `README.md` and `docs/API.md`
- verify both frontend build and backend import sanity before pushing
