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
  if (representation === 'stick') return { stick: { radius: 0.22, singleBonds: false } };
  if (representation === 'wireframe') return { line: {} };
  if (representation === 'spacefill') return { sphere: {} };
  return { stick: { radius: 0.22, singleBonds: false }, sphere: { scale: 0.32 } };
}

function atomCharge(atom) {
  const raw = atom?.properties?.charge ?? atom?.charge ?? atom?.formalCharge ?? 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function atomTextLabel(atom, labelMode) {
  const element = atom?.elem || atom?.element || '?';
  if (labelMode === 'charges') {
    const charge = atomCharge(atom);
    if (!charge) return '';
    const sign = charge > 0 ? '+' : '-';
    const magnitude = Math.abs(charge);
    return `${element}${magnitude === 1 ? '' : magnitude}${sign}`;
  }
  return element;
}

function candidateFormatsForModel(format, text) {
  const normalizedFormat = String(format || 'xyz').toLowerCase();
  const normalizedText = String(text || '');

  if (normalizedFormat === 'mol') {
    return ['mol', 'sdf'];
  }
  if (normalizedFormat === 'sdf') {
    return ['sdf', 'mol'];
  }
  if (normalizedText.includes('V2000') || normalizedText.includes('V3000') || normalizedText.includes('M  END')) {
    return ['mol', 'sdf'];
  }
  return [normalizedFormat || 'xyz'];
}

function detectConnectedComponents(modelAtoms) {
  if (!Array.isArray(modelAtoms) || modelAtoms.length === 0) return [];

  const adjacency = modelAtoms.map(() => []);
  let hasBondData = false;

  for (let atomIndex = 0; atomIndex < modelAtoms.length; atomIndex += 1) {
    const atom = modelAtoms[atomIndex];
    if (!Array.isArray(atom?.bonds)) continue;
    for (let i = 0; i < atom.bonds.length; i += 1) {
      const neighborIndex = atom.bonds[i];
      if (!Number.isInteger(neighborIndex) || neighborIndex < 0 || neighborIndex >= modelAtoms.length) {
        continue;
      }
      adjacency[atomIndex].push(neighborIndex);
      hasBondData = true;
    }
  }

  if (!hasBondData) return [];

  const visited = new Array(modelAtoms.length).fill(false);
  const components = [];

  for (let start = 0; start < modelAtoms.length; start += 1) {
    if (visited[start]) continue;
    const stack = [start];
    const component = [];
    visited[start] = true;

    while (stack.length > 0) {
      const current = stack.pop();
      component.push(current);
      for (let i = 0; i < adjacency[current].length; i += 1) {
        const neighbor = adjacency[current][i];
        if (!visited[neighbor]) {
          visited[neighbor] = true;
          stack.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  return components.filter((component) => component.length > 0);
}

function spreadDisconnectedFragments(modelAtoms, components) {
  if (!Array.isArray(modelAtoms) || !Array.isArray(components) || components.length <= 1) {
    return false;
  }

  const metrics = components.map((component) => {
    let xTotal = 0;
    let yTotal = 0;
    let zTotal = 0;

    for (let i = 0; i < component.length; i += 1) {
      const atom = modelAtoms[component[i]];
      if (!atom) continue;
      xTotal += Number.isFinite(atom.x) ? atom.x : 0;
      yTotal += Number.isFinite(atom.y) ? atom.y : 0;
      zTotal += Number.isFinite(atom.z) ? atom.z : 0;
    }

    const count = component.length || 1;
    const centroid = { x: xTotal / count, y: yTotal / count, z: zTotal / count };
    let radius = 0;

    for (let i = 0; i < component.length; i += 1) {
      const atom = modelAtoms[component[i]];
      if (!atom) continue;
      const dx = (Number.isFinite(atom.x) ? atom.x : 0) - centroid.x;
      const dy = (Number.isFinite(atom.y) ? atom.y : 0) - centroid.y;
      const dz = (Number.isFinite(atom.z) ? atom.z : 0) - centroid.z;
      radius = Math.max(radius, Math.sqrt(dx * dx + dy * dy + dz * dz));
    }

    return { component, centroid, radius: Math.max(radius, 1.1) };
  }).sort((left, right) => left.centroid.x - right.centroid.x);

  const gap = 4.8;
  const offsets = new Array(metrics.length).fill(0);
  const midpoint = Math.floor(metrics.length / 2);

  for (let i = midpoint + 1; i < metrics.length; i += 1) {
    const previous = metrics[i - 1];
    const current = metrics[i];
    offsets[i] = offsets[i - 1] + previous.radius + current.radius + gap;
  }

  for (let i = midpoint - 1; i >= 0; i -= 1) {
    const next = metrics[i + 1];
    const current = metrics[i];
    offsets[i] = offsets[i + 1] - (next.radius + current.radius + gap);
  }

  for (let i = 0; i < metrics.length; i += 1) {
    const fragment = metrics[i];
    const shiftX = offsets[i] - fragment.centroid.x;
    for (let j = 0; j < fragment.component.length; j += 1) {
      const atom = modelAtoms[fragment.component[j]];
      if (!atom || !Number.isFinite(atom.x)) continue;
      atom.x += shiftX;
    }
  }

  return true;
}

function loadedModelAtomCount(model) {
  if (!model) return 0;

  try {
    const selectedAtoms = model.selectedAtoms?.({});
    if (Array.isArray(selectedAtoms) && selectedAtoms.length > 0) {
      return selectedAtoms.length;
    }
  } catch (_err) {
    // Ignore and try alternate introspection below.
  }

  if (Array.isArray(model.atoms) && model.atoms.length > 0) {
    return model.atoms.length;
  }

  if (Array.isArray(model.atomList) && model.atomList.length > 0) {
    return model.atomList.length;
  }

  return 0;
}

function MoleculeViewer({
  atoms = [],
  modelText = '',
  modelFormat = 'xyz',
  inputSmiles = '',
  disconnectedHint = false,
  representation = 'ballstick',
  onRepresentationChange,
  toolbarExtra = null
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const initialViewRef = useRef(null);
  const lastModelKeyRef = useRef('');
  const staticLabelsRef = useRef([]);
  const [viewerReady, setViewerReady] = useState(false);
  const [libError, setLibError] = useState('');
  const [renderError, setRenderError] = useState('');
  const [fragmentCount, setFragmentCount] = useState(1);
  const [bondOrderLimited, setBondOrderLimited] = useState(true);
  const [viewerSource, setViewerSource] = useState({ format: '', fallback: false });
  const [bg, setBg] = useState('dark');
  const [showHydrogens, setShowHydrogens] = useState(true);
  const [labelMode, setLabelMode] = useState('hover');
  const [localRepresentation, setLocalRepresentation] = useState(representation);

  const xyzFallback = useMemo(() => atomsToXyz(atoms), [atoms]);
  const model = useMemo(() => {
    if (typeof modelText === 'string' && modelText.trim()) {
      return {
        text: modelText,
        format: modelFormat || 'xyz'
      };
    }
    if (!xyzFallback) return null;
    return {
      text: xyzFallback,
      format: 'xyz'
    };
  }, [modelFormat, modelText, xyzFallback]);

  useEffect(() => {
    setLocalRepresentation(representation);
  }, [representation]);

  const clearStaticLabels = useCallback((viewer) => {
    if (!viewer || !Array.isArray(staticLabelsRef.current)) return;
    for (let i = 0; i < staticLabelsRef.current.length; i += 1) {
      try {
        viewer.removeLabel(staticLabelsRef.current[i]);
      } catch (_err) {
        // ignore label cleanup failures
      }
    }
    staticLabelsRef.current = [];
  }, []);

  const loadBestAvailableModel = useCallback((viewer) => {
    if (!viewer || !model?.text) {
      return null;
    }

    const attempts = [];
    const seen = new Set();
    candidateFormatsForModel(model.format, model.text).forEach((format) => {
      if (!seen.has(format)) {
        attempts.push({ text: model.text, format, source: 'preferred' });
        seen.add(format);
      }
    });

    if (xyzFallback && xyzFallback !== model.text && !seen.has('xyz')) {
      attempts.push({ text: xyzFallback, format: 'xyz', source: 'fallback' });
      seen.add('xyz');
    }

    let lastError = null;

    for (let i = 0; i < attempts.length; i += 1) {
      const attempt = attempts[i];
      try {
        viewer.clear();
        const loadedModel = viewer.addModel(attempt.text, attempt.format);
        const atomCount = loadedModelAtomCount(loadedModel);
        if (atomCount > 0) {
          return {
            text: attempt.text,
            format: attempt.format,
            atomCount,
            source: attempt.source,
            model: loadedModel
          };
        }
        lastError = new Error(`3Dmol loaded ${attempt.format} but returned no atoms`);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Unable to load any supported 3D model format');
  }, [model, xyzFallback]);

  const renderMolecule = useCallback(() => {
    if (!viewerRef.current) return;

    const viewer = viewerRef.current;
    viewer.clear();
    clearStaticLabels(viewer);
    viewer.setBackgroundColor(bg === 'light' ? '#f8fafc' : 'rgba(15,23,42,0)');
    setBondOrderLimited(true);
    setFragmentCount(1);

    if (model?.text) {
      try {
        const loaded = loadBestAvailableModel(viewer);
        const activeModelText = loaded.text;
        const activeModelFormat = loaded.format;
        const activeModel = loaded.model;

        setBondOrderLimited(activeModelFormat === 'xyz');
        setViewerSource({
          format: String(activeModelFormat || '').toUpperCase(),
          fallback: loaded.source === 'fallback'
        });

        const hasDisconnectedSignal = disconnectedHint || String(inputSmiles || '').includes('.');
        if (hasDisconnectedSignal) {
          const signalCount = String(inputSmiles || '').includes('.')
            ? Math.max(2, String(inputSmiles).split('.').filter(Boolean).length)
            : 2;
          setFragmentCount(signalCount);
        }

        if (activeModelFormat !== 'xyz') {
          const modelAtoms = activeModel?.selectedAtoms?.({}) || [];
          const components = detectConnectedComponents(modelAtoms);
          if (components.length > 1) {
            spreadDisconnectedFragments(modelAtoms, components);
            setFragmentCount(components.length);
          }
        }

        const nextStyle = styleForRepresentation(localRepresentation);
        if (showHydrogens) {
          viewer.setStyle({}, nextStyle);
        } else {
          viewer.setStyle({ elem: 'H' }, {});
          viewer.setStyle({ elem: 'H', invert: true }, nextStyle);
        }

        if (labelMode === 'atoms' || labelMode === 'charges') {
          const modelAtoms = activeModel?.selectedAtoms?.({}) || [];
          const persistentLabels = [];
          for (let i = 0; i < modelAtoms.length; i += 1) {
            const atom = modelAtoms[i];
            const element = atom?.elem || atom?.element || '';
            if (!showHydrogens && element === 'H') continue;
            const text = atomTextLabel(atom, labelMode);
            if (!text) continue;
            const label = viewer.addLabel(text, {
              position: atom,
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              fontColor: '#f8fafc',
              fontSize: 10,
              showBackground: true,
              borderThickness: 0,
              inFront: true
            });
            persistentLabels.push(label);
          }
          staticLabelsRef.current = persistentLabels;
        }

        viewer.setHoverable(
          {},
          labelMode === 'hover',
          (atom, viewerInstance) => {
            if (!atom || atom.label) return;
            const element = atom?.elem || atom?.element || '';
            if (!showHydrogens && element === 'H') return;
            const labelElem = atom.elem || atom.element || '?';
            const labelSerial = atom.serial ?? atom.index ?? '';
            atom.label = viewerInstance.addLabel(`${labelElem}${labelSerial ? `:${labelSerial}` : ''}`, {
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
        viewer.center();
        viewer.zoomTo();
        viewer.resize();
        const modelKey = `${activeModelFormat}:${activeModelText.length}:${activeModelText.slice(0, 100)}`;
        if (lastModelKeyRef.current !== modelKey) {
          lastModelKeyRef.current = modelKey;
          initialViewRef.current = viewer.getView();
        }
        setRenderError('');
      } catch (error) {
        console.error('[MolLens] Viewer render failed:', error);
        clearStaticLabels(viewer);
        setViewerSource({ format: '', fallback: false });
        setRenderError(error?.message || 'Unable to render this structure in the 3D viewer.');
      }

      viewer.render();
      window.requestAnimationFrame(() => {
        if (!viewerRef.current) return;
        viewerRef.current.resize();
        viewerRef.current.zoomTo();
        viewerRef.current.center();
        viewerRef.current.render();
      });
    }

    viewer.render();
    window.setTimeout(() => {
      if (!viewerRef.current) return;
      viewerRef.current.resize();
      viewerRef.current.render();
    }, 50);
  }, [model, localRepresentation, bg, disconnectedHint, inputSmiles, loadBestAvailableModel, showHydrogens, labelMode, clearStaticLabels]);

  useEffect(() => {
    let mounted = true;
    let cleanupObserver = null;
    let handleWindowResize = null;

    ensure3DMol()
      .then(($3Dmol) => {
        if (!mounted || !containerRef.current || viewerRef.current) return;

        viewerRef.current = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: 'rgba(15,23,42,0)'
        });
        viewerRef.current.zoomTo();
        viewerRef.current.center();
        viewerRef.current.render();

        cleanupObserver = new ResizeObserver(() => {
          if (!viewerRef.current) return;
          viewerRef.current.resize();
          viewerRef.current.render();
        });

        cleanupObserver.observe(containerRef.current);
        handleWindowResize = () => {
          if (!viewerRef.current) return;
          viewerRef.current.resize();
          viewerRef.current.render();
        };
        window.addEventListener('resize', handleWindowResize);
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
      if (handleWindowResize) {
        window.removeEventListener('resize', handleWindowResize);
      }
      clearStaticLabels(viewerRef.current);
      setViewerReady(false);
      viewerRef.current = null;
    };
  }, [clearStaticLabels]);

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
      viewerRef.current.setBackgroundColor(newBg === 'light' ? '#f8fafc' : 'rgba(15,23,42,0)');
      viewerRef.current.render();
    }
  };

  return (
    <div className="viewer-shell">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-cluster viewer-toolbar-cluster-primary">
          <span className="viewer-toolbar-label">Style</span>
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
        </div>

        <div className="viewer-toolbar-cluster">
          <span className="viewer-toolbar-label">View</span>
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

        <div className="viewer-toolbar-cluster">
          <span className="viewer-toolbar-label">Inspect</span>
          <button
            type="button"
            onClick={() => setShowHydrogens((current) => !current)}
            className={`viewer-btn${showHydrogens ? ' is-active' : ''}`}
          >
            {showHydrogens ? 'Hide H' : 'Show H'}
          </button>
          <select
            value={labelMode}
            onChange={(event) => setLabelMode(event.target.value)}
            className="viewer-select viewer-select-compact"
            aria-label="Labels"
          >
            <option value="hover">Labels: Hover</option>
            <option value="atoms">Labels: Atoms</option>
            <option value="charges">Labels: Charges</option>
            <option value="off">Labels: Off</option>
          </select>
        </div>

        {toolbarExtra}
      </div>

      <div className="viewer-container">
        <div
          ref={containerRef}
          className="viewer-canvas"
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      </div>

      {!model?.text && (
        <div className="viewer-inline-note">
          No molecule loaded yet
        </div>
      )}

      {viewerSource.format && !renderError && (
        <p className="viewer-inline-note">
          Rendering from {viewerSource.format}{viewerSource.fallback ? ' fallback' : ''}.
        </p>
      )}

      {libError && <p className="viewer-inline-error">{libError}</p>}
      {renderError && <p className="viewer-inline-error">{renderError}</p>}
      {(fragmentCount > 1 || disconnectedHint || String(inputSmiles || '').includes('.')) && !renderError && (
        <p className="viewer-inline-warning">
          Disconnected ionic/multi-fragment structure{fragmentCount > 1 ? ` (${fragmentCount} fragments)` : ''}; fragments are not covalently bonded.
        </p>
      )}
      {bondOrderLimited && !renderError && (
        <p className="viewer-inline-warning subtle">
          Bond order is inferred from XYZ geometry in this view; double/triple bonds may appear less explicit.
        </p>
      )}
    </div>
  );
}

export default MoleculeViewer;
