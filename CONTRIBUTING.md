# Contributing to MolLens

Thanks for contributing to MolLens.

MolLens is an open-source chemistry workbench built around a React frontend and a FastAPI/RDKit backend. Good contributions keep the editing, generation, and visualization workflow stable while improving usability and chemistry support.

## Ways to Contribute

- report bugs
- improve documentation
- add tests
- improve frontend UX
- improve backend chemistry handling
- add export formats or workflow tooling
- harden deployment and developer experience

## Before You Start

Please:
- check existing issues and open PRs first
- keep changes focused and reviewable
- avoid unrelated refactors in feature PRs
- document user-facing behavior changes

## Local Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Recommended Development Workflow

1. create a branch from your main integration branch
2. make one focused change
3. verify the main molecule flows
4. update docs if behavior changed
5. open a PR with a clear summary

## Validation Checklist

For most changes, verify as many of these as apply:

- home page loads correctly
- SMILES input still generates a structure
- chemical name lookup still works
- image upload still works
- workspace opens correctly
- Ketcher loads as default editor
- JSME switching still works
- `Generate 3D` uses the live sketcher structure
- 3D viewer renders without crashing
- export actions still return valid output
- frontend production build still succeeds

## Frontend Notes

- Ketcher is the default editor
- JSME remains available as a fallback/lightweight editor
- do not break the current sketcher-to-viewer pipeline
- avoid large UI rewrites mixed with functional chemistry changes
- keep workspace interactions stable and predictable

## Backend Notes

- preserve API compatibility whenever possible
- prefer additive response fields over breaking payload changes
- keep RDKit generation and validation paths explicit
- treat chemistry correctness regressions as high priority

## Documentation Expectations

Update documentation when you change:
- API behavior
- installation steps
- supported workflows
- editor/viewer behavior
- exported formats

Relevant files:
- [README.md](/Users/muhammedshahshaji/Desktop/MolLens/README.md)
- [docs/API.md](/Users/muhammedshahshaji/Desktop/MolLens/docs/API.md)
- [docs/ARCHITECTURE.md](/Users/muhammedshahshaji/Desktop/MolLens/docs/ARCHITECTURE.md)
- [docs/DEVELOPMENT.md](/Users/muhammedshahshaji/Desktop/MolLens/docs/DEVELOPMENT.md)

## Pull Request Guidance

A good PR description should include:

- what changed
- why it changed
- how it was tested
- screenshots if the UI changed
- any known limitations

## Code Style

- keep changes small and readable
- prefer clear, boring solutions over clever ones
- avoid adding dependencies unless they materially improve the product
- keep chemistry-related transformations explicit and traceable

## Questions

If you are unsure whether a change should be frontend-only, backend-only, or shared across both, document the tradeoff in the PR so reviewers can evaluate it quickly.
