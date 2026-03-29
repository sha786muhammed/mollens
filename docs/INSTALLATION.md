# Installation Guide

## Requirements

- Python 3.10+
- Node.js 18+
- npm 9+

## Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend URLs:
- API: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend URL:
- `http://localhost:3000`

## Heavy Dependencies

The backend includes scientific dependencies that can take time to install:
- `rdkit`
- `torch`
- `molscribe`

If RDKit installation is problematic via `pip`, use a Conda environment and install from `conda-forge`.

## Frontend Notes

The frontend includes:
- Ketcher as the default advanced editor
- JSME as an alternate lightweight editor
- a postinstall patch script to suppress noisy upstream source-map warnings from Ketcher-related packages

## Production Build

### Frontend

```bash
cd frontend
npm run build
```

### Backend

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```
