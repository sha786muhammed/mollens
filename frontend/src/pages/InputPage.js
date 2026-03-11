import { useNavigate } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import SmilesInput from '../components/SmilesInput';
import { useMolLens } from '../context/MolLensContext';

function InputPage() {
  const navigate = useNavigate();
  const { setStructureResult } = useMolLens();

  const handleGenerated = (payload) => {
    setStructureResult(payload);
    navigate('/workspace');
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">SMILES Input</h2>
          <SmilesInput onSuccess={handleGenerated} />
        </div>

        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Image Upload</h2>
          <ImageUploader onSuccess={handleGenerated} />
        </div>
      </div>
    </div>
  );
}

export default InputPage;
