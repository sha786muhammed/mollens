import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import ImageCropper from './ImageCropper';

function extractPrediction(result) {
  if (!result) return { smiles: '', confidence: null };

  if (typeof result.predicted_smiles === 'string') {
    return {
      smiles: result.predicted_smiles,
      confidence: typeof result.confidence === 'number' ? result.confidence : null
    };
  }

  if (Array.isArray(result.detected_molecules) && result.detected_molecules.length > 0) {
    const first = result.detected_molecules[0] || {};
    return {
      smiles: typeof first.predicted_smiles === 'string' ? first.predicted_smiles : '',
      confidence: typeof first.confidence === 'number' ? first.confidence : null
    };
  }

  return { smiles: '', confidence: null };
}

function ImageUploader({ onSuccess, onStructure }) {
  const [file, setFile] = useState(null);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [crop, setCrop] = useState(null);
  const [predictedSmiles, setPredictedSmiles] = useState('');
  const [predictionConfidence, setPredictionConfidence] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [error, setError] = useState('');

  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const setIncomingFile = useCallback((incomingFile) => {
    if (!incomingFile) return;
    setFile(incomingFile);
    setError('');
    setPredictedSmiles('');
    setPredictionConfidence(null);
    setCrop(null);
  }, []);

  const recognizeImage = useCallback(async (targetFile, cropValue = null) => {
    if (!targetFile) return;

    setUploadLoading(true);
    setError('');

    try {
      const result = await api.uploadImage(targetFile, cropValue);
      const prediction = extractPrediction(result);

      setPredictedSmiles(prediction.smiles);
      setPredictionConfidence(prediction.confidence);

      if (typeof onStructure === 'function') {
        onStructure({
          source: 'image-prediction',
          result,
          predictedSmiles: prediction.smiles,
          confidence: prediction.confidence
        });
      }

      if (!prediction.smiles) {
        setError('No predicted SMILES returned from image recognition.');
      }
    } catch (err) {
      setError(err.message || 'Image upload failed.');
      if (typeof onStructure === 'function') {
        onStructure({
          source: 'image',
          result: err.body ?? { error: err.message || 'Request failed' }
        });
      }
    } finally {
      setUploadLoading(false);
    }
  }, [onStructure]);

  const onUploadInputChange = (event) => {
    const selected = event.target.files?.[0] || null;
    setIncomingFile(selected);
  };

  const onCameraInputChange = (event) => {
    const captured = event.target.files?.[0] || null;
    setIncomingFile(captured);
    if (captured) {
      recognizeImage(captured, null);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0] || null;
    setIncomingFile(dropped);
    if (dropped) {
      recognizeImage(dropped, null);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  useEffect(() => {
    const handlePaste = (event) => {
      const items = event.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const pastedFile = item.getAsFile();
          if (pastedFile) {
            setIncomingFile(pastedFile);
            recognizeImage(pastedFile, null);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [recognizeImage, setIncomingFile]);

  const submitImage = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Choose or drop an image before generating.');
      return;
    }

    const cropPayload = cropEnabled && crop ? crop : null;
    await recognizeImage(file, cropPayload);
  };

  const generateFromEditedSmiles = async () => {
    const edited = predictedSmiles.trim();
    if (!edited) {
      setError('Predicted SMILES is empty. Enter a valid SMILES first.');
      return;
    }

    setGenerateLoading(true);
    setError('');

    try {
      const result = await api.submitSmiles(edited);
      const payload = {
        source: 'image-edited-smiles',
        result,
        predictedSmiles: edited,
        confidence: predictionConfidence
      };
      if (typeof onSuccess === 'function') onSuccess(payload);
      if (typeof onStructure === 'function') onStructure(payload);
    } catch (err) {
      setError(err.message || 'Structure generation failed for edited SMILES.');
      if (typeof onStructure === 'function') {
        onStructure({
          source: 'image-edited-smiles',
          result: err.body ?? { error: err.message || 'Request failed' }
        });
      }
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"
      >
        Drag and drop a molecule image here, or use upload/camera/paste.
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          📷 Camera
        </button>
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Upload
        </button>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={onUploadInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onCameraInputChange}
        className="hidden"
      />

      {file && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
          Selected: <span className="font-medium">{file.name || 'clipboard-image.png'}</span>
        </div>
      )}

      {previewUrl && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={cropEnabled}
              onChange={(event) => setCropEnabled(event.target.checked)}
            />
            Enable Crop Region
          </label>
          {cropEnabled && <ImageCropper imageUrl={previewUrl} onCropChange={setCrop} />}
        </div>
      )}

      <form onSubmit={submitImage}>
        <button
          type="submit"
          disabled={!file || uploadLoading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {uploadLoading ? 'Processing image...' : 'Generate'}
        </button>
      </form>

      {predictedSmiles !== '' && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label htmlFor="predicted-smiles" className="block text-sm font-medium text-slate-700">
            Predicted SMILES (editable)
          </label>
          <input
            id="predicted-smiles"
            value={predictedSmiles}
            onChange={(event) => setPredictedSmiles(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {predictionConfidence !== null && (
            <p className="text-xs text-slate-600">Confidence: {predictionConfidence}</p>
          )}
          <button
            type="button"
            onClick={generateFromEditedSmiles}
            disabled={generateLoading || !predictedSmiles.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {generateLoading ? 'Generating structure...' : 'Generate From Edited SMILES'}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 whitespace-pre-wrap">
          {error}
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
