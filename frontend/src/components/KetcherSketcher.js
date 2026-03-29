import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor } from 'ketcher-react';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import '../vendor/ketcher.css';

const structServiceProvider = new StandaloneStructServiceProvider();

function KetcherSketcher({
  smiles = '',
  onSmilesExport,
  onSmilesChange,
  onGenerate3D,
  generating = false,
  generationStatus = null,
  isViewerStale = false,
  editorEngine = 'ketcher',
  onEditorEngineChange = null
}) {
  const ketcherRef = useRef(null);
  const lastObservedSmiles = useRef('');
  const lastSyncedSmiles = useRef('');
  const [exportedSmiles, setExportedSmiles] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const getSmiles = useCallback(async () => {
    if (!ketcherRef.current || typeof ketcherRef.current.getSmiles !== 'function') {
      return '';
    }

    try {
      return String(await ketcherRef.current.getSmiles()).trim();
    } catch (_err) {
      return '';
    }
  }, []);

  const getMolblock = useCallback(async () => {
    if (!ketcherRef.current || typeof ketcherRef.current.getMolfile !== 'function') {
      return '';
    }

    try {
      return String(await ketcherRef.current.getMolfile()).replace(/\s+$/, '');
    } catch (_err) {
      return '';
    }
  }, []);

  const syncInputToKetcher = useCallback(async (inputSmiles) => {
    const next = String(inputSmiles || '').trim();
    if (!next || next === lastSyncedSmiles.current || !ketcherRef.current?.setMolecule) return;

    try {
      await ketcherRef.current.setMolecule(next);
      lastSyncedSmiles.current = next;
      setLoadError('');
    } catch (_err) {
      // Ignore invalid intermediate structures while editing/switching.
    }
  }, []);

  const handleInit = useCallback(async (instance) => {
    ketcherRef.current = instance;
    setLoading(false);
    setLoadError('');

    if (smiles.trim()) {
      await syncInputToKetcher(smiles);
    }
  }, [smiles, syncInputToKetcher]);

  useEffect(() => {
    if (!ketcherRef.current) return;
    syncInputToKetcher(smiles);
  }, [smiles, syncInputToKetcher]);

  useEffect(() => {
    if (!ketcherRef.current) return undefined;

    const timer = window.setInterval(async () => {
      const nextSmiles = await getSmiles();
      if (!nextSmiles || nextSmiles === lastObservedSmiles.current) return;
      lastObservedSmiles.current = nextSmiles;
      setExportedSmiles(nextSmiles);
      if (typeof onSmilesChange === 'function') {
        onSmilesChange(nextSmiles);
      }
    }, 700);

    return () => window.clearInterval(timer);
  }, [getSmiles, onSmilesChange]);

  const handleExportSmiles = async () => {
    const nextSmiles = await getSmiles();
    setExportedSmiles(nextSmiles);
    lastObservedSmiles.current = nextSmiles;
    if (nextSmiles && typeof onSmilesExport === 'function') {
      onSmilesExport(nextSmiles);
    }
  };

  const handleGenerate3D = async () => {
    const nextSmiles = await getSmiles();
    const nextMolblock = await getMolblock();
    setExportedSmiles(nextSmiles);
    lastObservedSmiles.current = nextSmiles;

    if (nextSmiles && typeof onSmilesExport === 'function') {
      onSmilesExport(nextSmiles);
    }

    if ((nextSmiles || nextMolblock) && typeof onGenerate3D === 'function') {
      onGenerate3D({
        smiles: nextSmiles,
        molblock: nextMolblock
      });
    }
  };

  const currentSmiles = useMemo(() => exportedSmiles || String(smiles || '').trim(), [exportedSmiles, smiles]);

  return (
    <div className="sketcher-panel">
      <div className="sketcher-toolbar" role="toolbar" aria-label="Ketcher controls">
        <div className="sketcher-toolbar-copy">
          <span className="sketcher-toolbar-title">Advanced Editor</span>
          <span className="sketcher-toolbar-hint">Ketcher supports richer chemistry editing, reactions, templates, and cleanup tools.</span>
        </div>
        <div className="sketcher-toolbar-meta">
          <button
            type="button"
            className={`sketcher-meta-pill sketcher-engine-toggle${editorEngine === 'jsme' ? ' is-active' : ''}`}
            onClick={() => onEditorEngineChange?.('jsme')}
          >
            JSME
          </button>
          <button
            type="button"
            className={`sketcher-meta-pill sketcher-engine-toggle${editorEngine === 'ketcher' ? ' is-active' : ''}`}
            onClick={() => onEditorEngineChange?.('ketcher')}
          >
            Ketcher
          </button>
        </div>
      </div>

      <div className="sketcher-stage ketcher-stage">
        <div className="sketcher-canvas-wrap ketcher-canvas-wrap">
          {(loading || loadError) && (
            <div className={`sketcher-overlay${loadError ? ' error' : ''}`}>
              {loadError || 'Loading Ketcher...'}
            </div>
          )}
          <div className="ketcher-shell">
            <Editor
              staticResourcesUrl={process.env.PUBLIC_URL || ''}
              structServiceProvider={structServiceProvider}
              onInit={handleInit}
              disableMacromoleculesEditor
            />
          </div>
        </div>
      </div>

      <div className="sketcher-bottom">
        <div className="sketcher-footer">
          <button type="button" className="btn-outline" onClick={handleExportSmiles} disabled={loading || !!loadError}>
            Export SMILES
          </button>
          <button type="button" className="btn-primary" onClick={handleGenerate3D} disabled={loading || !!loadError || generating}>
            {generating ? 'Generating 3D...' : 'Generate 3D'}
          </button>
        </div>
        <div className="sketcher-feedback-grid">
          <div className={`sketcher-status${generationStatus?.state ? ` ${generationStatus.state}` : ''}`}>
            {generationStatus?.message || 'Ready to generate 3D'}
          </div>
          <div className={`sketcher-sync-indicator${isViewerStale ? ' stale' : ' synced'}`}>
            {isViewerStale ? 'Sketch changed. Generate 3D to refresh the viewer.' : '3D viewer is in sync with the current sketch.'}
          </div>
        </div>
        <div className="sketcher-smiles-row">
          <span className="sketcher-smiles-label">SMILES</span>
          <input
            type="text"
            value={currentSmiles}
            readOnly
            className="sketcher-smiles-output"
            placeholder="SMILES output"
          />
        </div>
      </div>
    </div>
  );
}

export default KetcherSketcher;
