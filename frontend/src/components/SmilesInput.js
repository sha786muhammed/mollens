import { useEffect, useState } from 'react';
import { api } from '../api';

function SmilesInput({ onSuccess, onStructure, presetSmiles }) {
  const [smiles, setSmiles] = useState('C1=CC=CC=C1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof presetSmiles === 'string' && presetSmiles.trim()) {
      setSmiles(presetSmiles.trim());
      setError('');
    }
  }, [presetSmiles]);

  const submitSmiles = async (event) => {
    event.preventDefault();
    const cleaned = smiles.trim();
    if (!cleaned) {
      setError('Please enter a SMILES string.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.submitSmiles(cleaned);
      const payload = { source: 'smiles', result, predictedSmiles: cleaned };
      if (typeof onSuccess === 'function') onSuccess(payload);
      if (typeof onStructure === 'function') onStructure(payload);
    } catch (err) {
      setError(err.message || 'Failed to generate molecule from SMILES.');
      if (typeof onStructure === 'function') {
        onStructure({ source: 'smiles', result: err.body ?? { error: err.message || 'Request failed' } });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submitSmiles} className="space-y-4">
      <textarea
        value={smiles}
        onChange={(event) => setSmiles(event.target.value)}
        rows={4}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        placeholder="Paste SMILES, e.g. CCO"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? 'Generating...' : 'Generate From SMILES'}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 whitespace-pre-wrap">
          {error}
        </div>
      )}
    </form>
  );
}

export default SmilesInput;
