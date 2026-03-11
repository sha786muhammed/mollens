import { useEffect, useRef } from 'react';

const MOL3D_JS_ID = '3dmol-js-thumbnails';

function ensure3DMol() {
  return new Promise((resolve, reject) => {
    if (window.$3Dmol) {
      resolve(window.$3Dmol);
      return;
    }

    const existing = document.getElementById(MOL3D_JS_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.$3Dmol), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load 3Dmol.js')), { once: true });
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

function MoleculeThumbnail({ smiles }) {
  const viewerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let viewer = null;

    ensure3DMol()
      .then(($3Dmol) => {
        if (!mounted || !viewerRef.current) return;

        viewer = $3Dmol.createViewer(viewerRef.current, {
          backgroundColor: 'white'
        });

        viewer.clear();
        viewer.addModel(smiles, 'smi');
        viewer.setStyle({}, {
          stick: {},
          sphere: { scale: 0.25 }
        });
        viewer.zoomTo();
        viewer.render();
      })
      .catch(() => {
        // no-op; thumbnails are decorative
      });

    return () => {
      mounted = false;
      viewer = null;
    };
  }, [smiles]);

  return <div className="thumb-canvas" ref={viewerRef} />;
}

export default MoleculeThumbnail;
