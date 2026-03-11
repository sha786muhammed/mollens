from fastapi import FastAPI

from app.main import app as _app

app: FastAPI = _app


@app.get("/")
def root():
    return {"message": "MolLens API running"}
