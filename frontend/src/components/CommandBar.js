import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/commandbar.css';

const EXAMPLES = [
  { label: 'Example: Benzene', smiles: 'C1=CC=CC=C1' },
  { label: 'Example: Ethanol', smiles: 'CCO' },
  { label: 'Example: Caffeine', smiles: 'Cn1cnc2n(C)c(=O)n(C)c(=O)c12' }
];

function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const filteredExamples = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EXAMPLES;
    return EXAMPLES.filter((item) =>
      item.label.toLowerCase().includes(q) || item.smiles.toLowerCase().includes(q)
    );
  }, [query]);

  const openWorkspace = () => {
    navigate('/workspace');
    setOpen(false);
  };

  const loadExample = (smiles) => {
    setQuery(smiles);
  };

  if (!open) return null;

  return (
    <div className="command-overlay" onClick={() => setOpen(false)}>
      <div className="command-box" onClick={(e) => e.stopPropagation()}>
        <input
          placeholder="Search molecules or paste SMILES..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="command-actions">
          <button type="button" onClick={openWorkspace}>Open Workspace</button>
        </div>

        <div className="command-list">
          {filteredExamples.map((item) => (
            <button
              key={item.label}
              type="button"
              className="command-item"
              onClick={() => loadExample(item.smiles)}
            >
              <span>{item.label}</span>
              <code>{item.smiles}</code>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CommandBar;
