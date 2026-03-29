# Changelog

All notable changes to MolLens will be documented in this file.

The format is inspired by Keep a Changelog and follows a simple versioned history.

## [Unreleased]

### Added
- Ketcher integrated as an advanced 2D molecular editor
- JSME retained as an alternate lightweight editor
- workspace editor engine switching
- viewer controls for hydrogens and label modes
- recent structure history in the workspace
- richer info card and sync-state feedback
- production/source-map cleanup for Ketcher and related packages
- expanded documentation set for installation, API, architecture, and development

### Changed
- Ketcher set as the default workspace editor
- workspace redesigned into a more professional split chemistry workbench
- improved build stability by patching noisy third-party source-map warnings
- improved route-to-workspace landing behavior and scroll reset handling

### Fixed
- blank-viewer regressions in the 3D rendering path
- repeated webpack warning noise from Ketcher and `paper`
- multiple workspace layout and shell consistency issues

## [0.1.0]

### Added
- initial FastAPI backend
- SMILES-to-3D generation
- image upload pipeline via MolScribe
- molecular workspace with browser-based 3D viewer
- export support for Gaussian and ORCA workflows

