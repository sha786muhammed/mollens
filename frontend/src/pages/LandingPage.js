import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import SmilesInput from '../components/SmilesInput';
import { useMolLens } from '../context/MolLensContext';
import '../styles/home.css';

const MOL3D_JS_ID = '3dmol-js-home-hero';

function ensure3DMol() {
  return new Promise((resolve, reject) => {
    if (window.$3Dmol) {
      resolve(window.$3Dmol);
      return;
    }

    const existing = document.getElementById(MOL3D_JS_ID);
    if (existing) {
      const onLoad = () => resolve(window.$3Dmol);
      const onError = () => reject(new Error('Failed to load 3Dmol.js'));
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', onError, { once: true });
      window.setTimeout(() => {
        if (window.$3Dmol) {
          resolve(window.$3Dmol);
        }
      }, 150);
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

function LandingPage() {
  const navigate = useNavigate();
  const { setStructureResult } = useMolLens();
  const viewerRef = useRef(null);
  const [exampleSmiles, setExampleSmiles] = useState('');

  const handleSmilesGenerated = (payload) => {
    setStructureResult(payload);
    navigate('/workspace');
  };

  const handleImageGenerated = (payload) => {
    setStructureResult(payload);
    navigate('/workspace');
  };

  useEffect(() => {
    let mounted = true;
    let viewer = null;

    ensure3DMol()
      .then(($3Dmol) => {
        if (!mounted || !viewerRef.current) return;

        viewer = $3Dmol.createViewer(viewerRef.current, {
          backgroundColor: 'white'
        });

        const benzene = `
12
benzene
C 0.000 1.396 0.000
C 1.209 0.698 0.000
C 1.209 -0.698 0.000
C 0.000 -1.396 0.000
C -1.209 -0.698 0.000
C -1.209 0.698 0.000
H 0.000 2.479 0.000
H 2.147 1.240 0.000
H 2.147 -1.240 0.000
H 0.000 -2.479 0.000
H -2.147 -1.240 0.000
H -2.147 1.240 0.000
`;

        viewer.addModel(benzene, 'xyz');
        viewer.setStyle({}, { stick: {}, sphere: { scale: 0.3 } });
        viewer.zoomTo();
        viewer.spin(true);
        viewer.render();
        window.setTimeout(() => {
          if (!viewer) return;
          viewer.resize();
          viewer.render();
        }, 50);
      })
      .catch(() => {
        // no-op, hero preview is decorative
      });

    return () => {
      mounted = false;
      if (viewer) {
        try {
          viewer.spin(false);
        } catch (_err) {
          // no-op
        }
      }
    };
  }, []);

  return (
    <div className="home-page">
      <main className="home-container">
        <header className="hero">
          <div className="hero-left">
            <h1 className="logo">MolLens</h1>
            <p className="tagline">AI Molecular Structure Recognition</p>
            <p className="hero-desc">
              Generate and visualize 3D molecular structures from SMILES strings or images.
            </p>
          </div>
          <div className="hero-right">
            <div ref={viewerRef} className="hero-canvas" />
          </div>
        </header>

        <section className="features">
          <div className="feature-card">
            <div className="feature-icon">🧬</div>
            <h3>3D Molecular Visualization</h3>
            <p>Generate and interact with high quality 3D molecular structures directly in your browser.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant SMILES Conversion</h3>
            <p>Convert SMILES strings into optimized 3D structures instantly.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI Structure Recognition</h3>
            <p>Upload molecule images and let AI detect the structure automatically.</p>
          </div>
        </section>

        <section className="example-section">
          <h3>Try Example Molecules</h3>
          <div className="example-row">
            <button type="button" className="example-btn" onClick={() => setExampleSmiles('C1=CC=CC=C1')}>Benzene</button>
            <button type="button" className="example-btn" onClick={() => setExampleSmiles('Cn1cnc2n(C)c(=O)n(C)c(=O)c12')}>Caffeine</button>
            <button type="button" className="example-btn" onClick={() => setExampleSmiles('CCO')}>Ethanol</button>
            <button type="button" className="example-btn" onClick={() => setExampleSmiles('CC(=O)O')}>Acetic Acid</button>
          </div>
        </section>

        <section className="home-card home-smiles">
          <h3>SMILES Input</h3>
          <SmilesInput onSuccess={handleSmilesGenerated} presetSmiles={exampleSmiles} />
        </section>

        <section className="home-card home-image">
          <h3>Image Input</h3>
          <ImageUploader onSuccess={handleImageGenerated} />
        </section>
      </main>

      <footer className="home-footer">
        © 2026 MolLens
      </footer>
    </div>
  );
}

export default LandingPage;
