import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import ExportPanel from '../components/ExportPanel';
import { API_BASE, api } from '../api';
import { useMolLens } from '../context/MolLensContext';
import '../styles/workspace.css';

const MoleculeViewer = lazy(() => import('../components/MoleculeViewer'));

function xyzToAtoms(xyzText) {
  if (!xyzText || typeof xyzText !== 'string') {
    return [];
  }

  const lines = xyzText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) return [];

  return lines.slice(2).map((line, index) => {
    const [element, x, y, z] = line.split(/\s+/);
    return {
      id: index + 1,
      element,
      x: Number(x),
      y: Number(y),
      z: Number(z)
    };
  }).filter((atom) => Number.isFinite(atom.x) && Number.isFinite(atom.y) && Number.isFinite(atom.z));
}

function WorkspacePage() {
  const {
    structureData,
    normalized,
    predictedSmiles,
    confidence,
    setStructureResult
  } = useMolLens();

  const [editorSmiles, setEditorSmiles] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [representation, setRepresentation] = useState('ballstick');
  const [moleculeXyz, setMoleculeXyz] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fallback = structureData?.result?.input_smiles || '';
    setEditorSmiles(predictedSmiles || fallback);
  }, [predictedSmiles, structureData]);

  const moleculeInfo = useMemo(() => {
    const primary = normalized.primaryStructure || structureData?.result || {};
    return {
      atomCount: primary.atom_count ?? normalized.atoms.length,
      energy: primary.energy,
      conformers: primary.conformer_count,
      smiles: predictedSmiles || primary.input_smiles || ''
    };
  }, [normalized, predictedSmiles, structureData]);

  const regenerateStructure = async () => {
    const smiles = editorSmiles.trim();
    if (!smiles) {
      setError('Enter a SMILES string before regenerating.');
      return;
    }

    setRegenerating(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smiles })
      });

      let data;
      if (!res.ok) {
        data = await api.submitSmiles(smiles);
      } else {
        data = await res.json();
      }

      if (data?.xyz && typeof data.xyz === 'string') {
        setMoleculeXyz(data.xyz);
        const atoms = xyzToAtoms(data.xyz);
        setStructureResult({
          source: 'workspace-regenerate',
          predictedSmiles: smiles,
          confidence,
          result: {
            input_smiles: smiles,
            atom_count: atoms.length,
            atoms
          }
        });
      } else {
        setMoleculeXyz('');
        setStructureResult({
          source: 'workspace-regenerate',
          result: data,
          predictedSmiles: smiles,
          confidence
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to regenerate structure.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="workspace-shell">
      <div className="workspace-container">
        <div className="workspace-grid">
          <aside className="workspace-left">
            <div className="card smiles-editor">
              <h2>SMILES Editor</h2>
              <textarea
                value={editorSmiles}
                onChange={(event) => setEditorSmiles(event.target.value)}
                rows={6}
                className="workspace-smiles"
                placeholder="Edit SMILES and regenerate"
              />
              <div className="smiles-actions">
                <button
                  type="button"
                  onClick={regenerateStructure}
                  disabled={regenerating}
                  className="btn-primary"
                >
                  {regenerating ? 'Regenerating...' : 'Regenerate Structure'}
                </button>
              </div>
            </div>

            <div className="card">
              <h2>Molecule Information</h2>
              <div className="workspace-info">
                <p>Atoms: {moleculeInfo.atomCount ?? 'N/A'}</p>
                <p>Energy: {moleculeInfo.energy ?? 'N/A'}</p>
                <p>Conformers: {moleculeInfo.conformers ?? 'N/A'}</p>
                <p className="break-all">SMILES: {moleculeInfo.smiles || 'N/A'}</p>
                <p>Confidence: {confidence ?? 'N/A'}</p>
              </div>
            </div>
          </aside>

          <section className="card viewer-card viewer-panel">
            <div className="viewer-toolbar-head">
              <h2>3D Molecule Viewer</h2>
            </div>

            <Suspense fallback={<div className="viewer-canvas loading-box">Loading viewer...</div>}>
              <MoleculeViewer
                atoms={normalized.atoms}
                molecule={moleculeXyz}
                representation={representation}
                onRepresentationChange={setRepresentation}
              />
            </Suspense>

            {normalized.error && (
              <div className="error-box warning">{normalized.error}</div>
            )}
            {error && (
              <div className="error-box danger">{error}</div>
            )}
          </section>

          <aside className="workspace-right">
            <div className="card">
              <h2>Export Tools</h2>
              <ExportPanel structure={normalized.primaryStructure} predictedSmiles={predictedSmiles} />
            </div>

            <div className="card">
              <button
                type="button"
                onClick={() => setShowJson((prev) => !prev)}
                className="btn-primary"
              >
                {showJson ? 'Hide Latest Result JSON' : 'Show Latest Result JSON'}
              </button>
              {showJson && (
                <pre className="workspace-json">
                  {JSON.stringify(structureData?.result || { message: 'No structure generated yet' }, null, 2)}
                </pre>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default WorkspacePage;
