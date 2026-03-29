import { Suspense, lazy } from 'react';

const MoleculeViewer = lazy(() => import('./MoleculeViewer'));

function Viewer3D({
  atoms,
  modelText,
  modelFormat,
  inputSmiles,
  disconnectedHint,
  representation,
  onRepresentationChange,
  toolbarExtra,
  normalizedError,
  error
}) {
  return (
    <section className="workspace-viewer-panel">
      <div className="viewer-toolbar-head">
        <h2>3D Molecule Viewer</h2>
      </div>

      <div className="workspace-viewer-canvas">
        <Suspense fallback={<div className="viewer-canvas loading-box">Loading viewer...</div>}>
          <MoleculeViewer
            atoms={atoms}
            modelText={modelText}
            modelFormat={modelFormat}
            inputSmiles={inputSmiles}
            disconnectedHint={disconnectedHint}
            representation={representation}
            onRepresentationChange={onRepresentationChange}
            toolbarExtra={toolbarExtra}
          />
        </Suspense>
      </div>

      {normalizedError && (
        <div className="error-box warning">{normalizedError}</div>
      )}
      {error && (
        <div className="error-box danger">{error}</div>
      )}
    </section>
  );
}

export default Viewer3D;
