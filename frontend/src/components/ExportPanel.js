import { useMemo, useState } from 'react';
import { api } from '../api';

function atomsToXyz(atoms) {
  if (!Array.isArray(atoms) || atoms.length === 0) {
    return '';
  }

  const rows = atoms.map((atom) => `${atom.element} ${atom.x} ${atom.y} ${atom.z}`);
  return `${atoms.length}\nMolLens export\n${rows.join('\n')}`;
}

function resolveAtoms(structure) {
  if (!structure) {
    return [];
  }

  if (Array.isArray(structure.atoms)) {
    return structure.atoms;
  }

  if (Array.isArray(structure.atoms_3d)) {
    return structure.atoms_3d;
  }

  return [];
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ExportPanel({ structure, predictedSmiles }) {
  const [loadingGaussian, setLoadingGaussian] = useState(false);
  const [loadingOrca, setLoadingOrca] = useState(false);
  const [loadingPdb, setLoadingPdb] = useState(false);
  const [loadingSdf, setLoadingSdf] = useState(false);
  const [loadingMol, setLoadingMol] = useState(false);
  const [error, setError] = useState('');

  const atoms = useMemo(() => resolveAtoms(structure), [structure]);
  const hasStructure = atoms.length > 0;

  const handleGaussianDownload = async () => {
    if (!hasStructure) {
      return;
    }

    setLoadingGaussian(true);
    setError('');

    try {
      const response = await api.exportGaussian(atoms);
      if (!response?.input) {
        throw new Error(response?.error || 'Gaussian export returned empty output');
      }
      downloadText('molecule.gjf', response.input);
    } catch (err) {
      setError(err.message || 'Gaussian export failed');
    } finally {
      setLoadingGaussian(false);
    }
  };

  const handleOrcaDownload = async () => {
    if (!hasStructure) {
      return;
    }

    setLoadingOrca(true);
    setError('');

    try {
      const response = await api.exportOrca(atoms);
      if (!response?.input) {
        throw new Error(response?.error || 'ORCA export returned empty output');
      }
      downloadText('molecule.inp', response.input);
    } catch (err) {
      setError(err.message || 'ORCA export failed');
    } finally {
      setLoadingOrca(false);
    }
  };

  const handlePdbDownload = async () => {
    if (!hasStructure) return;
    setLoadingPdb(true);
    setError('');
    try {
      const response = await api.exportPdb(atoms);
      if (!response?.input) throw new Error(response?.error || 'PDB export returned empty output');
      downloadText('molecule.pdb', response.input);
    } catch (err) {
      setError(err.message || 'PDB export failed');
    } finally {
      setLoadingPdb(false);
    }
  };

  const handleSdfDownload = async () => {
    if (!hasStructure) return;
    setLoadingSdf(true);
    setError('');
    try {
      const response = await api.exportSdf(atoms);
      if (!response?.input) throw new Error(response?.error || 'SDF export returned empty output');
      downloadText('molecule.sdf', response.input);
    } catch (err) {
      setError(err.message || 'SDF export failed');
    } finally {
      setLoadingSdf(false);
    }
  };

  const handleMolDownload = async () => {
    if (!hasStructure) return;
    setLoadingMol(true);
    setError('');
    try {
      const response = await api.exportMol(atoms);
      if (!response?.input) throw new Error(response?.error || 'MOL export returned empty output');
      downloadText('molecule.mol', response.input);
    } catch (err) {
      setError(err.message || 'MOL export failed');
    } finally {
      setLoadingMol(false);
    }
  };

  return (
    <div className="export-panel">
      <section className="export-section">
        <div className="export-section-head">
          <h3 className="export-title">Export Structure</h3>
        </div>
        <div className="export-group">
          <button
            type="button"
            disabled={!hasStructure}
            onClick={() => downloadText('molecule.xyz', atomsToXyz(atoms))}
            className="btn-primary export-btn"
          >
            Download XYZ
          </button>
          <button
            type="button"
            disabled={!hasStructure}
            onClick={() => downloadText('molecule.json', JSON.stringify(structure, null, 2))}
            className="btn-primary export-btn"
          >
            Download JSON
          </button>
        </div>
      </section>

      <section className="export-section">
        <div className="export-section-head">
          <h3 className="export-title">Quantum Chemistry</h3>
        </div>
        <div className="export-group">
          <button
            type="button"
            disabled={!hasStructure || loadingGaussian}
            onClick={handleGaussianDownload}
            className="btn-primary export-btn"
          >
            {loadingGaussian ? 'Preparing Gaussian...' : 'Download Gaussian'}
          </button>
          <button
            type="button"
            disabled={!hasStructure || loadingOrca}
            onClick={handleOrcaDownload}
            className="btn-primary export-btn"
          >
            {loadingOrca ? 'Preparing ORCA...' : 'Download ORCA'}
          </button>
        </div>
      </section>

      <section className="export-section">
        <div className="export-section-head">
          <h3 className="export-title">Structure Files</h3>
        </div>
        <div className="export-group">
          <button
            type="button"
            disabled={!hasStructure || loadingPdb}
            onClick={handlePdbDownload}
            className="btn-primary export-btn"
          >
            {loadingPdb ? 'Preparing PDB...' : 'Download PDB'}
          </button>
          <button
            type="button"
            disabled={!hasStructure || loadingSdf}
            onClick={handleSdfDownload}
            className="btn-primary export-btn"
          >
            {loadingSdf ? 'Preparing SDF...' : 'Download SDF'}
          </button>
          <button
            type="button"
            disabled={!hasStructure || loadingMol}
            onClick={handleMolDownload}
            className="btn-primary export-btn"
          >
            {loadingMol ? 'Preparing MOL...' : 'Download MOL'}
          </button>
        </div>
      </section>

      <section className="export-section">
        <div className="export-section-head">
          <h3 className="export-title">Utilities</h3>
        </div>
        <div className="export-group">
          <button
            type="button"
            disabled={!predictedSmiles}
            onClick={() => navigator.clipboard.writeText(predictedSmiles)}
            className="btn-primary export-btn"
          >
            Copy SMILES
          </button>
        </div>
      </section>

      {error && (
        <div className="error-box danger export-error">
          {error}
        </div>
      )}
    </div>
  );
}

export default ExportPanel;
