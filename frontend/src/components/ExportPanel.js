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

  return (
    <div className="export-panel">
      <h3 className="export-title">Export Structure</h3>
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

      <h3 className="export-title">Quantum Chemistry</h3>
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

      <h3 className="export-title">Utilities</h3>
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

      {error && (
        <div className="error-box danger export-error">
          {error}
        </div>
      )}
    </div>
  );
}

export default ExportPanel;
