import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const MOL3D_JS_ID = '3dmol-js-cdn';

function ensure3DMol() {
  return new Promise((resolve, reject) => {
    if (window.$3Dmol) {
      resolve(window.$3Dmol);
      return;
    }

    const existing = document.getElementById(MOL3D_JS_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.$3Dmol));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = MOL3D_JS_ID;
    script.src = 'https://unpkg.com/3dmol@2.4.2/build/3Dmol-min.js';
    script.async = true;
    script.onload = () => resolve(window.$3Dmol);
    script.onerror = () => reject(new Error('Failed to load 3Dmol.js'));
    document.body.appendChild(script);
  });
}

function atomsToXyz(atoms) {
  if (!Array.isArray(atoms) || atoms.length === 0) return '';
  const rows = atoms.map((atom) => `${atom.element} ${atom.x} ${atom.y} ${atom.z}`);
  return `${atoms.length}\nMolLens\n${rows.join('\n')}`;
}

function styleForRepresentation(representation) {
  if (representation === 'stick') return { stick: {} };
  if (representation === 'wireframe') return { line: {} };
  if (representation === 'spacefill') return { sphere: {} };
  return { stick: {}, sphere: { scale: 0.3 } };
}

function MoleculeViewer({
  atoms = [],
  molecule = '',
  representation = 'ballstick',
  onRepresentationChange
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const initialViewRef = useRef(null);
  const lastModelKeyRef = useRef('');
  const [viewerReady, setViewerReady] = useState(false);
  const [libError, setLibError] = useState('');
  const [bg, setBg] = useState('light');
  const [localRepresentation, setLocalRepresentation] = useState(representation);

  const xyz = useMemo(() => {
    if (typeof molecule === 'string' && molecule.trim()) return molecule;
    return atomsToXyz(atoms);
  }, [atoms, molecule]);

  useEffect(() => {
    setLocalRepresentation(representation);
  }, [representation]);

  const renderMolecule = useCallback(() => {
    if (!viewerRef.current) return;

    const viewer = viewerRef.current;
    viewer.clear();
    viewer.setBackgroundColor(bg === 'light' ? 'white' : '#0b1020');

    if (xyz) {
      viewer.addModel(xyz, 'xyz');
      viewer.setStyle({}, styleForRepresentation(localRepresentation));
      viewer.setHoverable(
        {},
        true,
        (atom, viewerInstance) => {
          if (!atom || atom.label) return;
          atom.label = viewerInstance.addLabel(`${atom.elem}:${atom.serial}`, {
            position: atom,
            backgroundColor: 'black',
            fontColor: 'white'
          });
        },
        (atom, viewerInstance) => {
          if (!atom || !atom.label) return;
          viewerInstance.removeLabel(atom.label);
          delete atom.label;
        }
      );
      viewer.zoomTo();
      const modelKey = `${xyz.length}:${xyz.slice(0, 100)}`;
      if (lastModelKeyRef.current !== modelKey) {
        lastModelKeyRef.current = modelKey;
        initialViewRef.current = viewer.getView();
      }
    }

    viewer.render();
    window.setTimeout(() => {
      if (!viewerRef.current) return;
      viewerRef.current.resize();
      viewerRef.current.render();
    }, 50);
  }, [xyz, localRepresentation, bg]);

  useEffect(() => {
    let mounted = true;
    let cleanupObserver = null;

    ensure3DMol()
      .then(($3Dmol) => {
        if (!mounted || !containerRef.current || viewerRef.current) return;

        viewerRef.current = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: 'white'
        });

        cleanupObserver = new ResizeObserver(() => {
          if (!viewerRef.current) return;
          viewerRef.current.resize();
          viewerRef.current.render();
        });

        cleanupObserver.observe(containerRef.current);
        setViewerReady(true);
      })
      .catch((error) => {
        if (mounted) {
          setLibError(error.message || 'Failed to load 3Dmol.js');
        }
      });

    return () => {
      mounted = false;
      if (cleanupObserver) cleanupObserver.disconnect();
      setViewerReady(false);
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewerReady) return;
    renderMolecule();
  }, [viewerReady, renderMolecule]);

  const resetView = () => {
    if (!viewerRef.current) return;
    if (initialViewRef.current) {
      viewerRef.current.setView(initialViewRef.current);
    } else {
      viewerRef.current.zoomTo();
    }
    viewerRef.current.render();
  };

  const toggleFullscreen = async () => {
    const element = containerRef.current;
    if (!element) return;

    try {
      if (!document.fullscreenElement) {
        await element.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (_err) {
      // no-op
    }
  };

  const toggleBackground = () => {
    const newBg = bg === 'light' ? 'dark' : 'light';
    setBg(newBg);

    if (viewerRef.current) {
      viewerRef.current.setBackgroundColor(newBg === 'light' ? 'white' : '#0b1020');
      viewerRef.current.render();
    }
  };

  return (
    <div className="viewer-card">
      <div className="viewer-toolbar">
        <select
          value={localRepresentation}
          onChange={(event) => {
            const next = event.target.value;
            setLocalRepresentation(next);
            if (typeof onRepresentationChange === 'function') {
              onRepresentationChange(next);
            }
          }}
          className="viewer-select"
          aria-label="Representation"
        >
          <option value="stick">Stick</option>
          <option value="ballstick">Ball and Stick</option>
          <option value="wireframe">Wireframe</option>
          <option value="spacefill">Space Fill</option>
        </select>
        <button type="button" onClick={resetView} className="viewer-btn">
          Reset View
        </button>
        <button type="button" onClick={toggleFullscreen} className="viewer-btn">
          Fullscreen
        </button>
        <button type="button" onClick={toggleBackground} className="viewer-btn">
          {bg === 'light' ? 'Dark Background' : 'Light Background'}
        </button>
      </div>

      <div className="viewer-container">
        <div ref={containerRef} className="viewer-canvas" />
      </div>

      {!xyz && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          No molecule loaded yet
        </div>
      )}

      {libError && <p className="mt-2 text-xs text-red-600">{libError}</p>}
    </div>
  );
}

export default MoleculeViewer;
