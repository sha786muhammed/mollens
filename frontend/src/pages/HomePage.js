import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useMolLens } from '../context/MolLensContext';
import '../styles/home.css';

const exampleMolecules = [
  { name: 'Benzene', smiles: 'C1=CC=CC=C1' },
  { name: 'Caffeine', smiles: 'Cn1cnc2c1c(=O)n(C)c(=O)n2C' },
  { name: 'Ethanol', smiles: 'CCO' },
  { name: 'Acetic Acid', smiles: 'CC(=O)O' },
  { name: 'Water', smiles: 'O' }
];

function HomePage() {
  const navigate = useNavigate();
  const { setStructureResult } = useMolLens();
  const fileInputRef = useRef(null);
  const composerTextRef = useRef(null);
  const composerShellRef = useRef(null);
  const [composerValue, setComposerValue] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [chemicalSuggestions, setChemicalSuggestions] = useState([]);
  const [showChemicalSuggestions, setShowChemicalSuggestions] = useState(false);
  const [chemicalSuggestLoading, setChemicalSuggestLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [composerError, setComposerError] = useState('');

  const attachedFileLabel = useMemo(() => attachedFile?.name || 'structure-image', [attachedFile]);

  const selectExample = (smilesString) => {
    setAttachedFile(null);
    setComposerValue(smilesString);
    setComposerError('');
    document.getElementById('smiles-input')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStructureReady = (payload) => {
    setStructureResult(payload);
    navigate('/workspace');
  };

  const setIncomingFile = (file) => {
    if (!file) return;
    setAttachedFile(file);
    setComposerError('');
    setShowChemicalSuggestions(false);
  };

  const clearAttachedFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const looksLikeSmiles = (value) => {
    const text = value.trim();
    if (!text) return false;
    if (/\s/.test(text)) return false;
    if (/[0-9@=[\]()#\\/+.-]/.test(text)) return true;
    return /^[BCNOFPSIKHclbrnosip]+$/i.test(text) && text.length <= 12;
  };

  const submitComposer = async (event) => {
    event.preventDefault();

    const textValue = composerValue.trim();
    if (!attachedFile && !textValue) {
      setComposerError('Enter a chemical name or SMILES, or add an image.');
      return;
    }

    setGenerateLoading(true);
    setComposerError('');

    try {
      if (attachedFile) {
        const result = await api.uploadImage(attachedFile);
        if (result?.error) {
          if (String(result.error).toLowerCase().includes('no molecule')) {
            setComposerError('No recognizable molecule was found in the image.');
          } else if (String(result.error).toLowerCase().includes('invalid smiles')) {
            setComposerError('The uploaded image could not be converted into a valid structure.');
          } else {
            setComposerError(String(result.error));
          }
          return;
        }

        handleStructureReady({
          source: 'image',
          result,
          predictedSmiles: result?.predicted_smiles || result?.input_smiles || '',
          confidence: typeof result?.confidence === 'number' ? result.confidence : null
        });
        return;
      }

      let result = null;
      let source = 'smiles';
      let predictedSmiles = textValue;

      if (looksLikeSmiles(textValue)) {
        result = await api.submitSmiles(textValue);
        if (result?.error) {
          result = await api.searchChemicalName(textValue);
          source = 'chemical-name';
          predictedSmiles = result?.resolved_smiles || textValue;
        }
      } else {
        result = await api.searchChemicalName(textValue);
        source = 'chemical-name';
        predictedSmiles = result?.resolved_smiles || textValue;

        if (result?.error) {
          result = await api.submitSmiles(textValue);
          source = 'smiles';
          predictedSmiles = textValue;
        }
      }

      if (result?.error) {
        setComposerError('Input not recognized. Try a SMILES string, a compound name, or a clearer image.');
        return;
      }

      handleStructureReady({
        source,
        result,
        predictedSmiles: result?.resolved_smiles || result?.input_smiles || predictedSmiles,
        confidence: null
      });
    } catch (err) {
      setComposerError(err.message || 'Unable to generate a structure right now. Please try again.');
    } finally {
      setGenerateLoading(false);
    }
  };

  useEffect(() => {
    const query = composerValue.trim();
    if (!query || attachedFile) {
      setChemicalSuggestions([]);
      setShowChemicalSuggestions(false);
      setChemicalSuggestLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setChemicalSuggestLoading(true);
      try {
        const response = await api.getChemicalNameSuggestions(query, 8);
        setChemicalSuggestions(Array.isArray(response?.suggestions) ? response.suggestions : []);
      } catch (_err) {
        setChemicalSuggestions([]);
      } finally {
        setChemicalSuggestLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [composerValue, attachedFile]);

  useEffect(() => {
    const textarea = composerTextRef.current;
    if (!textarea) return;

    textarea.style.height = '0px';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 64), 180);
    textarea.style.height = `${nextHeight}px`;
  }, [composerValue]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!composerShellRef.current?.contains(event.target)) {
        setShowChemicalSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  return (
    <div className="home-page">
      <main className="home-container page-container">
        <header className="app-header-shell">
          <div className="app-header-copy">
            <h1 className="brand-title app-intro-title">
              <span className="brand-title-mol">Mol</span>
              <span className="brand-title-lens">Lens</span>
            </h1>
            <p className="app-intro-subtitle">AI molecular structure recognition and 3D generation</p>
          </div>
          <a
            className="header-link"
            href="https://github.com/sha786muhammed/mollens"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </header>

        <section
          className={`composer-card card${isDraggingFile ? ' is-dragging' : ''}`}
          id="smiles-input"
          aria-label="Molecule input composer"
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDraggingFile(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDraggingFile(false);
            const droppedFile = event.dataTransfer.files?.[0] || null;
            setIncomingFile(droppedFile);
          }}
        >
          <form onSubmit={submitComposer} className="composer-form">
            <div className="composer-input-shell" ref={composerShellRef}>
              <textarea
                ref={composerTextRef}
                value={composerValue}
                onFocus={() => setShowChemicalSuggestions(true)}
                onChange={(event) => {
                  setComposerValue(event.target.value);
                  setComposerError('');
                }}
                className="composer-input"
                placeholder="Enter a chemical name or SMILES, or drop a structure image here..."
                rows={1}
              />

              {showChemicalSuggestions && chemicalSuggestions.length > 0 && !attachedFile && (
                <div className="tool-suggestion-list">
                  {chemicalSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={() => {
                        setComposerValue(suggestion);
                        setShowChemicalSuggestions(false);
                      }}
                      className="tool-suggestion-item"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <div className="composer-toolbar">
                <div className="composer-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    onChange={(event) => setIncomingFile(event.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    className="composer-secondary-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload image
                  </button>
                  {attachedFile && (
                    <div className="composer-file-chip">
                      <span>{attachedFileLabel}</span>
                      <button type="button" onClick={clearAttachedFile} aria-label="Remove image">
                        ×
                      </button>
                    </div>
                  )}
                  {chemicalSuggestLoading && !attachedFile && (
                    <span className="tool-status">Searching PubChem...</span>
                  )}
                </div>

                <button type="submit" disabled={generateLoading} className="tool-submit composer-submit">
                  {generateLoading ? 'Generating...' : 'Generate Structure'}
                </button>
              </div>
            </div>

            {composerError && (
              <div className="tool-error">
                {composerError}
              </div>
            )}
          </form>
        </section>

        <section className="composer-helper" aria-label="MolLens capabilities">
          <p className="composer-helper-text">
            Generate structures from names, SMILES, or structure images.
          </p>
          <div className="composer-helper-grid">
            <div className="composer-helper-item">
              <h3>Chemical Name</h3>
              <p>Resolve compound names into structures</p>
            </div>
            <div className="composer-helper-item">
              <h3>SMILES</h3>
              <p>Paste direct molecular notation</p>
            </div>
            <div className="composer-helper-item">
              <h3>Structure Image</h3>
              <p>Upload and detect molecule diagrams</p>
            </div>
          </div>
        </section>

        <section className="example-section">
          <div className="section-heading">
            <h3>Example molecules</h3>
          </div>
          <div className="example-chip-grid">
            {exampleMolecules.map((item) => (
              <button
                key={item.name}
                type="button"
                className="example-chip"
                onClick={() => selectExample(item.smiles)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </section>

        <footer className="home-footer" aria-label="Homepage footer">
          © MolLens 2026
        </footer>
      </main>
    </div>
  );
}

export default HomePage;
