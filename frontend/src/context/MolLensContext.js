import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'mollens_workspace_data_v2';

const MolLensContext = createContext(null);

function normalizeAtoms(result) {
  if (!result) return [];
  if (Array.isArray(result.atoms)) return result.atoms;
  if (Array.isArray(result.atoms_3d)) return result.atoms_3d;

  if (Array.isArray(result.detected_molecules) && result.detected_molecules.length > 0) {
    const first = result.detected_molecules[0] || {};
    if (Array.isArray(first.atoms)) return first.atoms;
    if (Array.isArray(first.atoms_3d)) return first.atoms_3d;
  }

  return [];
}

function resolvePrimaryStructure(result) {
  if (!result) return null;
  if (Array.isArray(result.atoms) || Array.isArray(result.atoms_3d)) return result;
  if (Array.isArray(result.detected_molecules) && result.detected_molecules.length > 0) {
    return result.detected_molecules[0] || null;
  }
  return null;
}

function deriveMeta(result, structureData) {
  if (structureData?.predictedSmiles) {
    return {
      predictedSmiles: structureData.predictedSmiles,
      confidence: typeof structureData.confidence === 'number' ? structureData.confidence : null
    };
  }

  if (!result) {
    return { predictedSmiles: '', confidence: null };
  }

  if (typeof result.predicted_smiles === 'string') {
    return {
      predictedSmiles: result.predicted_smiles,
      confidence: typeof result.confidence === 'number' ? result.confidence : null
    };
  }

  if (Array.isArray(result.detected_molecules) && result.detected_molecules.length > 0) {
    const first = result.detected_molecules[0] || {};
    return {
      predictedSmiles: typeof first.predicted_smiles === 'string' ? first.predicted_smiles : '',
      confidence: typeof first.confidence === 'number' ? first.confidence : null
    };
  }

  if (typeof result.input_smiles === 'string') {
    return { predictedSmiles: result.input_smiles, confidence: null };
  }

  return { predictedSmiles: '', confidence: null };
}

export function MolLensProvider({ children }) {
  const [structureData, setStructureData] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        setStructureData(parsed);
      }
    } catch (_err) {
      setStructureData(null);
    }
  }, []);

  useEffect(() => {
    if (!structureData) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(structureData));
  }, [structureData]);

  const normalized = useMemo(() => {
    const result = structureData?.result || null;
    const atoms = normalizeAtoms(result);
    return {
      atoms,
      primaryStructure: resolvePrimaryStructure(result),
      error: result && atoms.length === 0
        ? `No atoms found in backend response.\n${JSON.stringify(result, null, 2)}`
        : ''
    };
  }, [structureData]);

  const meta = useMemo(() => deriveMeta(structureData?.result || null, structureData), [structureData]);

  const setStructureResult = ({ source, result, predictedSmiles = '', confidence = null }) => {
    setStructureData({
      source,
      result,
      predictedSmiles,
      confidence,
      updatedAt: new Date().toISOString()
    });
  };

  const clearStructureResult = () => setStructureData(null);

  const value = {
    structureData,
    normalized,
    predictedSmiles: meta.predictedSmiles,
    confidence: meta.confidence,
    setStructureResult,
    clearStructureResult
  };

  return <MolLensContext.Provider value={value}>{children}</MolLensContext.Provider>;
}

export function useMolLens() {
  const context = useContext(MolLensContext);
  if (!context) {
    throw new Error('useMolLens must be used within MolLensProvider');
  }
  return context;
}
