import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import SmilesInput from '../components/SmilesInput';
import { useMolLens } from '../context/MolLensContext';
import '../styles/home.css';

const exampleMolecules = [
  { name: 'Benzene', smiles: 'C1=CC=CC=C1' },
  { name: 'Caffeine', smiles: 'Cn1cnc2c1c(=O)n(C)c(=O)n2C' },
  { name: 'Ethanol', smiles: 'CCO' },
  { name: 'Acetic Acid', smiles: 'CC(=O)O' },
  { name: 'Water', smiles: 'O' }
];

const BENZENE_XYZ = `12
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
H -2.147 1.240 0.000`;

function HomePage() {
  const navigate = useNavigate();
  const { setStructureResult } = useMolLens();
  const [smiles, setSmiles] = useState('');
  const viewerRef = useRef(null);

  const handleSmilesGenerated = (payload) => {
    setStructureResult(payload);
    navigate('/workspace');
  };

  const handleImageGenerated = (payload) => {
    setStructureResult(payload);
    navigate('/workspace');
  };

  const selectExample = (smilesString) => {
    setSmiles(smilesString);
    document.getElementById('smiles-input')?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!viewerRef.current) return undefined;

    let cancelled = false;
    let viewer = null;
    let canvas = null;
    const preventDefault = (event) => event.preventDefault();

    async function initViewer() {
      const module = await import('3dmol');
      const $3Dmol = module.default ?? module;
      if (cancelled || !viewerRef.current) return;

      viewerRef.current.innerHTML = '';
      viewer = $3Dmol.createViewer(viewerRef.current, {
        antialias: true,
        backgroundColor: 'rgba(0,0,0,0)'
      });
      viewer.setBackgroundColor(0x000000, 0);
      viewer.addModel(BENZENE_XYZ, 'xyz');
      viewer.setStyle({}, {
        stick: { radius: 0.15 },
        sphere: { scale: 0.25 }
      });
      viewer.zoomTo();
      viewer.zoom(1.6);
      viewer.spin('y', 0.5);
      viewer.render();
      viewer.setClickable({}, false);
      viewer.setHoverable({}, false);

      canvas = typeof viewer.getCanvas === 'function' ? viewer.getCanvas() : null;
      if (canvas) {
        canvas.addEventListener('wheel', preventDefault, { passive: false });
        canvas.addEventListener('mousedown', preventDefault);
      }
    }

    initViewer();

    return () => {
      cancelled = true;
      if (viewer) {
        viewer.spin(false);
        viewer.clear();
      }
      if (canvas) {
        canvas.removeEventListener('wheel', preventDefault);
        canvas.removeEventListener('mousedown', preventDefault);
      }
    };
  }, []);

  return (
    <div className="home-page">
      <main className="home-container page-container">
        <section className="hero-section">
          <div className="hero">
            <div className="hero-text">
              <h2 className="brand-title hero-title">MolLens</h2>
              <p className="hero-sub">
                AI Molecular Structure Recognition
              </p>
              <p className="hero-desc">
                Generate, visualize, and analyze molecular structures instantly from SMILES strings or images.
              </p>
            </div>

            <div className="hero-viewer">
              <div ref={viewerRef} className="hero-canvas"></div>
            </div>
          </div>
        </section>

        <section className="features feature-grid">
          <div className="feature-card card">
            <div className="feature-icon">🧬</div>
            <h3>3D Molecular Visualization</h3>
            <p>Generate and interact with high quality 3D molecular structures directly in your browser.</p>
          </div>

          <div className="feature-card card">
            <div className="feature-icon">⚡</div>
            <h3>Instant SMILES Conversion</h3>
            <p>Convert SMILES strings into optimized 3D structures instantly.</p>
          </div>

          <div className="feature-card card">
            <div className="feature-icon">🤖</div>
            <h3>AI Structure Recognition</h3>
            <p>Upload molecule images and let AI detect the structure automatically.</p>
          </div>
        </section>

        <section className="example-section">
          <h3>Try Example Molecules</h3>
          <div className="example-grid">
            {exampleMolecules.map((item) => (
              <div
                key={item.name}
                className="example-card"
                role="button"
                tabIndex={0}
                onClick={() => selectExample(item.smiles)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectExample(item.smiles);
                  }
                }}
              >
                <h3>
                  {item.name}
                </h3>
              </div>
            ))}
          </div>
        </section>

        <section className="home-card card home-smiles input-section" id="smiles-input">
          <h3>SMILES Input</h3>
          <SmilesInput onSuccess={handleSmilesGenerated} presetSmiles={smiles} />
        </section>

        <section className="home-card card home-image image-input-section input-section">
          <h3>Image Input</h3>
          <ImageUploader onSuccess={handleImageGenerated} />
        </section>

      </main>

      <footer className="footer">
        <p>MolLens — AI Molecular Structure Recognition</p>
      </footer>
    </div>
  );
}

export default HomePage;
