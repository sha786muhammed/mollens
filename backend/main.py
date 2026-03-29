from fastapi import FastAPI

from app.main import create_app

app: FastAPI = create_app()

@app.get("/")
def root():
    return {"message": "MolLens API running"}
