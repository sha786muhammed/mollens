import { useEffect, useRef, useState } from 'react';

const CROPPER_CSS_ID = 'cropper-css-cdn';
const CROPPER_JS_ID = 'cropper-js-cdn';

function ensureCropperAssets() {
  if (!document.getElementById(CROPPER_CSS_ID)) {
    const link = document.createElement('link');
    link.id = CROPPER_CSS_ID;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/cropperjs@1.6.2/dist/cropper.min.css';
    document.head.appendChild(link);
  }

  return new Promise((resolve, reject) => {
    if (window.Cropper) {
      resolve(window.Cropper);
      return;
    }

    const existing = document.getElementById(CROPPER_JS_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Cropper));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = CROPPER_JS_ID;
    script.src = 'https://unpkg.com/cropperjs@1.6.2/dist/cropper.min.js';
    script.async = true;
    script.onload = () => resolve(window.Cropper);
    script.onerror = () => reject(new Error('Failed to load Cropper.js'));
    document.body.appendChild(script);
  });
}

function ImageCropper({ imageUrl, onCropChange }) {
  const imgRef = useRef(null);
  const cropperRef = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [cropperReady, setCropperReady] = useState(false);

  useEffect(() => {
    let active = true;

    ensureCropperAssets()
      .then(() => {
        if (active) {
          setCropperReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setCropperReady(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!imageUrl || !imgRef.current || !cropperReady || !window.Cropper) {
      return undefined;
    }

    const cropper = new window.Cropper(imgRef.current, {
      viewMode: 1,
      responsive: true,
      autoCrop: false,
      background: false,
      movable: true,
      zoomable: true,
      scalable: false,
      rotatable: false,
      dragMode: 'crop',
      cropend: () => {
        if (!enabled) {
          return;
        }
        const data = cropper.getData(true);
        onCropChange({ x: data.x, y: data.y, width: data.width, height: data.height });
      }
    });

    cropperRef.current = cropper;

    return () => {
      cropper.destroy();
      cropperRef.current = null;
    };
  }, [imageUrl, onCropChange, enabled, cropperReady]);

  const toggleCrop = () => {
    const next = !enabled;
    setEnabled(next);

    if (!cropperRef.current) {
      return;
    }

    if (next) {
      cropperRef.current.crop();
      const data = cropperRef.current.getData(true);
      onCropChange({ x: data.x, y: data.y, width: data.width, height: data.height });
    } else {
      cropperRef.current.clear();
      onCropChange(null);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Crop Controls</h3>
        <button
          type="button"
          onClick={toggleCrop}
          disabled={!cropperReady}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {enabled ? 'Disable Crop' : 'Enable Crop'}
        </button>
      </div>
      <div className="relative overflow-hidden rounded-lg bg-slate-100">
        <img ref={imgRef} src={imageUrl} alt="Molecule preview" className="max-h-80 w-full object-contain" />
      </div>
      <p className="text-xs text-slate-500">If crop is enabled, only the selected region is sent to backend OCSR.</p>
    </div>
  );
}

export default ImageCropper;
