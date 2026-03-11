# MolLens v0.1

MolLens is an open-source web application for generating optimized 3D molecular structures from:
- SMILES strings
- Molecular structure images

It combines a FastAPI backend (RDKit + OCSR pipeline) with a React frontend and an in-browser 3D viewer.

## Features

- SMILES to optimized 3D coordinates
- Image upload to predicted SMILES + 3D structure
- Interactive molecule visualization in the browser
- Export options for computational chemistry workflows

## Repository Structure

```text
MolLens/
├── backend/
│   ├── app/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   └── package.json
├── docs/
├── examples/
├── README.md
├── requirements.txt
└── .gitignore
```

## Requirements

- Python 3.10+
- Node.js 18+
- npm 9+

## Local Development

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend runs at: `http://127.0.0.1:8000`

### 2) Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

## Production Build

### Frontend

```bash
cd frontend
npm run build
```

### Backend (production-style command)

```bash
cd backend
uvicorn app.main:app --workers 2 --host 0.0.0.0 --port 8000
```

## API Endpoints

- `GET /health`
- `POST /smiles`
- `POST /upload-image`
- `POST /export-gaussian`
- `POST /export-orca`

## Deployment Notes

- Set environment variables in `.env` if needed (do not commit `.env`).
- Serve frontend `build/` via a static host (Nginx, Vercel, Netlify, etc.).
- Deploy backend with a process manager/container platform (Docker, Fly.io, Render, Railway, etc.).
- Configure CORS and reverse proxy for your production domain.

## Release

- Current release: **v0.1.0**
- Git tag target: **v0.1**

## License

MIT License. See [LICENSE](LICENSE).
