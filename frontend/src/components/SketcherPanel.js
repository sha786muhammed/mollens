import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const JSME_SCRIPT_ID = 'mollens-jsme-script';
const JSME_SCRIPT_TIMEOUT_MS = 20000;
const JSME_LOCAL_SCRIPT_SRC = '/static/jsme/jsme.nocache.js';
let jsmeLoaderPromise = null;

function resolveJSMEConstructor() {
  if (window.JSApplet?.JSME) {
    return window.JSApplet.JSME;
  }
  if (window.JSME) {
    return window.JSME;
  }
  return null;
}

function waitForJSMEConstructor(timeoutMs = JSME_SCRIPT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const ctor = resolveJSMEConstructor();
      if (ctor) {
        resolve(ctor);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error('JSME global constructor not found after script load.'));
        return;
      }
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

async function loadJSME() {
  const existingCtor = resolveJSMEConstructor();
  if (existingCtor) {
    return existingCtor;
  }

  if (jsmeLoaderPromise) {
    return jsmeLoaderPromise;
  }

  jsmeLoaderPromise = (async () => {
    const previousOnLoad = window.jsmeOnLoad;

    window.jsmeOnLoad = () => {
      if (typeof previousOnLoad === 'function') {
        try {
          previousOnLoad();
        } catch (_err) {
          // Ignore previous callback errors from other loaders.
        }
      }
    };

    const staleScript = document.getElementById(JSME_SCRIPT_ID);
    if (staleScript && staleScript.getAttribute('src') !== JSME_LOCAL_SCRIPT_SRC) {
      staleScript.remove();
    }

    const localScript = document.getElementById(JSME_SCRIPT_ID);
    if (!localScript) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = JSME_SCRIPT_ID;
        script.src = JSME_LOCAL_SCRIPT_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load local JSME script from ${JSME_LOCAL_SCRIPT_SRC}`));
        document.body.appendChild(script);
      });
    } else {
      await new Promise((resolve, reject) => {
        localScript.addEventListener('load', () => resolve(), { once: true });
        localScript.addEventListener('error', () => reject(new Error(`Failed to load local JSME script from ${JSME_LOCAL_SCRIPT_SRC}`)), { once: true });
        window.setTimeout(() => resolve(), 50);
      });
    }

    const ctor = await waitForJSMEConstructor(JSME_SCRIPT_TIMEOUT_MS);
    if (!ctor) {
      throw new Error(`Local JSME script loaded but constructor was unavailable at ${JSME_LOCAL_SCRIPT_SRC}`);
    }
    return ctor;
  })();

  try {
    return await jsmeLoaderPromise;
  } finally {
    // Allow future retries if component remounts after a failure.
    if (!resolveJSMEConstructor()) {
      jsmeLoaderPromise = null;
    }
  }
}

function SketcherPanel({
  smiles = '',
  onSmilesExport,
  onSmilesChange,
  onGenerate3D,
  generating = false,
  generationStatus = null,
  isViewerStale = false,
  editorEngine = 'jsme',
  onEditorEngineChange = null
}) {
  const appletRef = useRef(null);
  const canvasHostRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const [exportedSmiles, setExportedSmiles] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [localId] = useState(() => `jsme-container-${Math.random().toString(36).slice(2, 10)}`);
  const lastSyncedSmiles = useRef('');
  const lastObservedSmiles = useRef('');

  const syncInputToSketcher = useCallback((applet, inputSmiles) => {
    const next = String(inputSmiles || '').trim();
    if (!next || next === lastSyncedSmiles.current) return;
    try {
      if (typeof applet.readGenericMolecularInput === 'function') {
        applet.readGenericMolecularInput(next);
      } else if (typeof applet.readMolecule === 'function') {
        applet.readMolecule(next);
      }
      lastSyncedSmiles.current = next;
    } catch (_err) {
      // Ignore invalid intermediate SMILES while sketching.
    }
  }, []);

  const initSketcher = useCallback((JSMEClass) => {
    if (!JSMEClass || !canvasHostRef.current) return;
    if (appletRef.current) {
      setLoading(false);
      return;
    }

    const hostBounds = canvasHostRef.current.getBoundingClientRect();
    const width = Math.max(Math.floor(hostBounds.width), 420);
    const height = Math.max(Math.floor(hostBounds.height), 420);

    let applet = null;
    try {
      applet = new JSMEClass(localId, `${width}px`, `${height}px`, {
        options: 'newlook,star'
      });
    } catch (error) {
      throw new Error(`JSME constructor failed: ${error?.message || 'unknown error'}`);
    }
    appletRef.current = applet;

    if (typeof applet.setSize === 'function') {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry || !appletRef.current) return;
        const nextWidth = Math.max(Math.floor(entry.contentRect.width), 420);
        const nextHeight = Math.max(Math.floor(entry.contentRect.height), 420);
        try {
          appletRef.current.setSize(nextWidth, nextHeight);
        } catch (_err) {
          // Ignore occasional setSize errors during first mount/layout.
        }
      });
      resizeObserverRef.current.observe(canvasHostRef.current);
    }

    if (smiles) {
      syncInputToSketcher(applet, smiles);
    }
    setLoading(false);
  }, [localId, smiles, syncInputToSketcher]);

  useEffect(() => {
    let cancelled = false;
    if (!appletRef.current) {
      setLoading(true);
    }
    setLoadError('');
    loadJSME()
      .then((Ctor) => {
        if (cancelled) return;
        initSketcher(Ctor);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error?.message || 'Sketcher library failed to initialize.';
        console.error('[MolLens] Sketcher init error:', error);
        setLoadError(message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [initSketcher]);

  useEffect(() => {
    if (!appletRef.current) return;
    syncInputToSketcher(appletRef.current, smiles);
  }, [smiles, syncInputToSketcher]);

  useEffect(() => {
    if (!appletRef.current) return undefined;
    const timer = window.setInterval(() => {
      const nextSmiles = getSmiles();
      if (!nextSmiles || nextSmiles === lastObservedSmiles.current) return;
      lastObservedSmiles.current = nextSmiles;
      setExportedSmiles(nextSmiles);
      if (typeof onSmilesChange === 'function') {
        onSmilesChange(nextSmiles);
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [onSmilesChange]);

  const getSmiles = () => {
    if (!appletRef.current || typeof appletRef.current.smiles !== 'function') {
      return '';
    }
    try {
      return String(appletRef.current.smiles() || '').trim();
    } catch (_err) {
      return '';
    }
  };

  const getMolblock = () => {
    if (!appletRef.current) return '';
    try {
      if (typeof appletRef.current.molFile === 'function') {
        return String(appletRef.current.molFile() || '').replace(/\s+$/, '');
      }
      if (typeof appletRef.current.molfile === 'function') {
        return String(appletRef.current.molfile() || '').replace(/\s+$/, '');
      }
    } catch (_err) {
      return '';
    }
    return '';
  };

  const handleExportSmiles = () => {
    const nextSmiles = getSmiles();
    setExportedSmiles(nextSmiles);
    lastObservedSmiles.current = nextSmiles;
    if (nextSmiles && typeof onSmilesExport === 'function') {
      onSmilesExport(nextSmiles);
    }
  };

  const handleGenerate3D = () => {
    const nextSmiles = getSmiles();
    const nextMolblock = getMolblock();
    setExportedSmiles(nextSmiles);
    lastObservedSmiles.current = nextSmiles;
    if (nextSmiles && typeof onSmilesExport === 'function') {
      onSmilesExport(nextSmiles);
    }
    if (nextSmiles && typeof onGenerate3D === 'function') {
      onGenerate3D({
        smiles: nextSmiles,
        molblock: nextMolblock
      });
    }
  };

  const currentSmiles = useMemo(() => exportedSmiles || String(smiles || '').trim(), [exportedSmiles, smiles]);

  return (
    <div className="sketcher-panel">
      <div className="sketcher-toolbar" role="toolbar" aria-label="2D sketcher controls">
        <div className="sketcher-toolbar-copy">
          <span className="sketcher-toolbar-title">2D Editor</span>
          <span className="sketcher-toolbar-hint">Use native tools for bonds, atoms, charges, and rings.</span>
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
      <div className="sketcher-stage">
        <div className="sketcher-canvas-wrap">
          <div id={localId} ref={canvasHostRef} className="sketcher-canvas" />
          {loading && <div className="sketcher-overlay">Loading sketcher...</div>}
          {loadError && <div className="sketcher-overlay error">{loadError}</div>}
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

export default SketcherPanel;
