import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ExportPanel from '../components/ExportPanel';
import InfoCard from '../components/InfoCard';
import SketcherPanel from '../components/SketcherPanel';
import Viewer3D from '../components/Viewer3D';
import { api } from '../api';
import { useMolLens } from '../context/MolLensContext';
import '../styles/workspace.css';

const KetcherSketcher = lazy(() => import('../components/KetcherSketcher'));

function normalizeComparableSmiles(value) {
  return String(value || '').trim();
}

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

function selectPreferredViewerModel(result) {
  const xyz = String(result?.xyz || '').trim();
  if (xyz) {
    return { text: xyz, format: 'xyz' };
  }

  const sdf = String(result?.sdf || '').trim();
  if (sdf) {
    return { text: sdf, format: 'sdf' };
  }

  const molblock = String(result?.molblock || '').trim();
  if (molblock) {
    return { text: molblock, format: 'mol' };
  }

  return { text: '', format: 'xyz' };
}

function buildHistoryEntry({ source, smiles, result, confidence = null }) {
  const normalizedSmiles = normalizeComparableSmiles(smiles || result?.input_smiles || result?.resolved_smiles || '');
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: source || 'manual',
    smiles: normalizedSmiles,
    formula: result?.formula || '',
    name: result?.name || '',
    fragmentCount: normalizedSmiles ? normalizedSmiles.split('.').filter(Boolean).length : 0,
    renderFormat: selectPreferredViewerModel(result).format,
    confidence,
    updatedAt: new Date().toISOString(),
    result
  };
}

function sameHistoryStructure(left, right) {
  if (!left || !right) return false;
  return normalizeComparableSmiles(left.smiles) === normalizeComparableSmiles(right.smiles)
    && String(left.formula || '') === String(right.formula || '')
    && String(left.renderFormat || '') === String(right.renderFormat || '');
}

function formatHistorySource(value) {
  const source = String(value || 'manual');
  if (source === 'workspace-sketcher') return 'Sketcher';
  if (source === 'chemical-name') return 'Name Lookup';
  if (source === 'image') return 'Image';
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function formatHistoryTime(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [representation, setRepresentation] = useState('ballstick');
  const [workspaceMode, setWorkspaceMode] = useState('split');
  const [editorEngine, setEditorEngine] = useState('ketcher');
  const [viewerModel, setViewerModel] = useState({ text: '', format: 'xyz' });
  const [lastGeneratedSmiles, setLastGeneratedSmiles] = useState('');
  const [structureHistory, setStructureHistory] = useState([]);
  const [generationStatus, setGenerationStatus] = useState({
    state: 'idle',
    message: 'Ready to generate 3D'
  });
  const downloadMenuRef = useRef(null);
  const workspaceShellRef = useRef(null);

  useLayoutEffect(() => {
    const scrollWorkspaceToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      workspaceShellRef.current?.scrollIntoView({ block: 'start' });
    };

    scrollWorkspaceToTop();

    const rafOne = window.requestAnimationFrame(scrollWorkspaceToTop);
    const rafTwo = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollWorkspaceToTop);
    });
    const timeoutId = window.setTimeout(scrollWorkspaceToTop, 180);

    return () => {
      window.cancelAnimationFrame(rafOne);
      window.cancelAnimationFrame(rafTwo);
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const fallback = structureData?.result?.input_smiles || structureData?.result?.resolved_smiles || '';
    const resolved = predictedSmiles || fallback;
    setEditorSmiles(resolved);
    setLastGeneratedSmiles(resolved);

    setViewerModel(selectPreferredViewerModel(structureData?.result));
  }, [predictedSmiles, structureData]);

  useEffect(() => {
    if (!structureData?.result) return;
    const entry = buildHistoryEntry({
      source: structureData.source,
      smiles: predictedSmiles || structureData?.result?.input_smiles || structureData?.result?.resolved_smiles || '',
      result: structureData.result,
      confidence
    });

    setStructureHistory((current) => {
      if (current.some((item) => sameHistoryStructure(item, entry))) {
        return current;
      }
      return [entry, ...current].slice(0, 8);
    });
  }, [structureData, predictedSmiles, confidence]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!downloadMenuRef.current?.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const moleculeInfo = useMemo(() => {
    const primary = normalized.primaryStructure || structureData?.result || {};
    const canonicalSmiles = primary.input_smiles || structureData?.result?.resolved_smiles || predictedSmiles || '';
    const currentSmiles = predictedSmiles || primary.input_smiles || structureData?.result?.resolved_smiles || '';
    const fragmentCount = canonicalSmiles
      ? canonicalSmiles.split('.').filter(Boolean).length
      : 0;
    return {
      source: structureData?.source || 'manual',
      name: structureData?.result?.name || '',
      formula: primary.formula,
      atomCount: primary.atom_count ?? normalized.atoms.length,
      energy: primary.energy,
      conformers: primary.conformer_count,
      smiles: currentSmiles,
      canonicalSmiles,
      molecularWeight: primary.molecular_weight,
      logP: primary.logp,
      hBondDonors: primary.h_bond_donors,
      hBondAcceptors: primary.h_bond_acceptors,
      tpsa: primary.topological_polar_surface_area,
      inchi: primary.inchi,
      inchikey: primary.inchikey,
      renderFormat: viewerModel.format,
      fragmentCount,
      disconnected: fragmentCount > 1,
      updatedAt: structureData?.updatedAt || ''
    };
  }, [normalized, predictedSmiles, structureData, viewerModel.format]);
  const viewerSmiles = moleculeInfo.canonicalSmiles || moleculeInfo.smiles || editorSmiles || '';
  const hasDisconnectedFragments = viewerSmiles.includes('.');
  const isViewerStale = useMemo(() => {
    const current = normalizeComparableSmiles(editorSmiles);
    const lastGenerated = normalizeComparableSmiles(lastGeneratedSmiles);
    if (!current && !lastGenerated) return false;
    return current !== lastGenerated;
  }, [editorSmiles, lastGeneratedSmiles]);

  const submitSmilesToPipeline = async (inputSmiles, source, molblock = '') => {
    const smiles = inputSmiles.trim();
    const hasMolblock = Boolean(String(molblock || '').trim());
    if (!smiles && !hasMolblock) {
      setError('Draw a structure or enter a SMILES string before regenerating.');
      return;
    }

    setRegenerating(true);
    setError('');
    setGenerationStatus({
      state: 'generating',
      message: 'Generating 3D from current editor structure...'
    });

    try {
      const data = await api.submitSmiles(smiles, molblock);
      if (data?.error) {
        throw new Error(data.error);
      }
      const confirmedSmiles = String(data?.input_smiles || smiles || '').trim();
      setViewerModel(selectPreferredViewerModel(data));
      setLastGeneratedSmiles(confirmedSmiles);
      if (confirmedSmiles) {
        setEditorSmiles(confirmedSmiles);
      }

      if (data?.xyz && typeof data.xyz === 'string') {
        const atoms = xyzToAtoms(data.xyz);
        setStructureResult({
          source,
          predictedSmiles: confirmedSmiles || smiles,
          confidence,
          result: {
            ...data,
            input_smiles: confirmedSmiles || smiles,
            atom_count: atoms.length,
            atoms
          }
        });
      } else {
        setStructureResult({
          source,
          result: data,
          predictedSmiles: confirmedSmiles || smiles,
          confidence
        });
      }

      const historyEntry = buildHistoryEntry({
        source,
        smiles: confirmedSmiles || smiles,
        result: data,
        confidence
      });
      setStructureHistory((current) => {
        const filtered = current.filter((item) => !sameHistoryStructure(item, historyEntry));
        return [historyEntry, ...filtered].slice(0, 8);
      });

      const pipeline = data?.pipeline || {};
      const formatUsed = pipeline.input_format_used || 'smiles';
      if (pipeline.smiles_fallback_used) {
        setGenerationStatus({
          state: 'warning',
          message: `Generated via SMILES fallback (molblock parse failed).`
        });
      } else if (pipeline.normalization_warning) {
        setGenerationStatus({
          state: 'warning',
          message: `3D generated from ${formatUsed}; structure was normalized.`
        });
      } else {
        setGenerationStatus({
          state: 'success',
          message: `3D generated successfully using ${formatUsed}.`
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to regenerate structure.');
      setGenerationStatus({
        state: 'error',
        message: err.message || 'Generation failed. Check the structure and try again.'
      });
    } finally {
      setRegenerating(false);
    }
  };

  const generateFromSketcher = async (sketchPayload) => {
    const cleaned = String(sketchPayload?.smiles || '').trim();
    const molblock = String(sketchPayload?.molblock || '').replace(/\s+$/, '');
    if (!cleaned && !molblock.trim()) {
      setError('Sketch a molecule before generating 3D.');
      return;
    }
    if (cleaned) {
      setEditorSmiles(cleaned);
    }
    await submitSmilesToPipeline(cleaned, 'workspace-sketcher', molblock);
  };

  const handleSketcherSmilesChange = (nextSmiles) => {
    const cleaned = String(nextSmiles || '').trim();
    if (!cleaned) return;
    setEditorSmiles(cleaned);
  };

  const restoreHistoryEntry = (entry) => {
    if (!entry?.result) return;
    setStructureResult({
      source: entry.source,
      result: entry.result,
      predictedSmiles: entry.smiles,
      confidence: entry.confidence
    });
    setEditorSmiles(entry.smiles);
    setLastGeneratedSmiles(entry.smiles);
    setViewerModel(selectPreferredViewerModel(entry.result));
    setGenerationStatus({
      state: 'success',
      message: 'Restored structure from recent history.'
    });
    setError('');
  };

  const toolbarExtra = (
    <div className="viewer-download" ref={downloadMenuRef}>
      <button
        type="button"
        className="viewer-btn viewer-download-toggle"
        onClick={() => setShowDownloadMenu((prev) => !prev)}
      >
        Download
      </button>

      {showDownloadMenu && (
        <div className="viewer-download-menu">
          <ExportPanel structure={normalized.primaryStructure} predictedSmiles={predictedSmiles} />
          <section className="export-section">
            <div className="export-section-head">
              <h3 className="export-title">Diagnostics</h3>
            </div>
            <div className="export-group">
              <button
                type="button"
                onClick={() => setShowJson((prev) => !prev)}
                className="btn-primary export-btn"
              >
                {showJson ? 'Hide Latest Result JSON' : 'Show Latest Result JSON'}
              </button>
            </div>
            {showJson && (
              <pre className="workspace-json">
                {JSON.stringify(structureData?.result || { message: 'No structure generated yet' }, null, 2)}
              </pre>
            )}
          </section>
        </div>
      )}
    </div>
  );

  return (
    <div className="workspace-shell" ref={workspaceShellRef}>
      <div className="workspace-container">
        <div className="workspace-modebar">
          <h2>Workspace</h2>
          <label className="workspace-view-control" htmlFor="workspace-view-mode">
            <span>View</span>
            <select
              id="workspace-view-mode"
              value={workspaceMode}
              onChange={(event) => setWorkspaceMode(event.target.value)}
            >
              <option value="split">Side by Side</option>
              <option value="sketcher">Sketcher Only</option>
              <option value="viewer">Viewer Only</option>
              <option value="info">Info Card Only</option>
            </select>
          </label>
        </div>

        <div className={`workspace-layout mode-${workspaceMode}`}>
          <aside className={`workspace-editor-panel${workspaceMode === 'viewer' || workspaceMode === 'info' ? ' is-hidden' : ''}`}>
            <section className="editor-section sketcher-section">
              <h3>2D Sketcher</h3>
              {editorEngine === 'ketcher' ? (
                <Suspense fallback={<div className="workspace-engine-loading">Loading Ketcher editor...</div>}>
                  <KetcherSketcher
                    smiles={editorSmiles}
                    onSmilesExport={setEditorSmiles}
                    onSmilesChange={handleSketcherSmilesChange}
                    onGenerate3D={generateFromSketcher}
                    generating={regenerating}
                    generationStatus={generationStatus}
                    isViewerStale={isViewerStale}
                    editorEngine={editorEngine}
                    onEditorEngineChange={setEditorEngine}
                  />
                </Suspense>
              ) : (
                <SketcherPanel
                  smiles={editorSmiles}
                  onSmilesExport={setEditorSmiles}
                  onSmilesChange={handleSketcherSmilesChange}
                  onGenerate3D={generateFromSketcher}
                  generating={regenerating}
                  generationStatus={generationStatus}
                  isViewerStale={isViewerStale}
                  editorEngine={editorEngine}
                  onEditorEngineChange={setEditorEngine}
                />
              )}
              <div className="workspace-history">
                <div className="workspace-history-head">
                  <h4>Recent Structures</h4>
                  <span>{structureHistory.length ? `${structureHistory.length} saved` : 'No history yet'}</span>
                </div>
                {structureHistory.length === 0 ? (
                  <div className="workspace-history-empty">
                    Generate a few variants to build a reusable workspace history.
                  </div>
                ) : (
                  <div className="workspace-history-list">
                    {structureHistory.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className={`workspace-history-item${normalizeComparableSmiles(entry.smiles) === normalizeComparableSmiles(lastGeneratedSmiles) ? ' is-current' : ''}`}
                        onClick={() => restoreHistoryEntry(entry)}
                      >
                        <div className="workspace-history-row">
                          <strong>{entry.name || entry.formula || entry.smiles || 'Untitled structure'}</strong>
                          <span>{formatHistoryTime(entry.updatedAt)}</span>
                        </div>
                        <div className="workspace-history-row meta">
                          <span>{formatHistorySource(entry.source)}</span>
                          <span>{String(entry.renderFormat || 'xyz').toUpperCase()}</span>
                          <span>{entry.fragmentCount > 1 ? `${entry.fragmentCount} fragments` : 'Connected'}</span>
                        </div>
                        <div className="workspace-history-smiles">{entry.smiles || 'No SMILES available'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </aside>

          <section className={`workspace-viewer-slot${workspaceMode === 'sketcher' || workspaceMode === 'info' ? ' is-hidden' : ''}`}>
            <Viewer3D
              atoms={normalized.atoms}
              modelText={viewerModel.text}
              modelFormat={viewerModel.format}
              inputSmiles={viewerSmiles}
              disconnectedHint={hasDisconnectedFragments}
              representation={representation}
              onRepresentationChange={setRepresentation}
              toolbarExtra={toolbarExtra}
              normalizedError={normalized.error}
              error={error}
            />
          </section>

          <section className={`workspace-infocard-slot${workspaceMode !== 'info' ? ' is-hidden' : ''}`}>
            <InfoCard moleculeInfo={moleculeInfo} />
          </section>
        </div>
      </div>
    </div>
  );
}

export default WorkspacePage;
