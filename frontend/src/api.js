export const API_BASE = 'http://127.0.0.1:8000';

export class ApiError extends Error {
  constructor(message, { status = null, body = null, endpoint = '', unreachable = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.endpoint = endpoint;
    this.unreachable = unreachable;
  }
}

function tryParseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_err) {
    return text;
  }
}

function withTimeout(timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

async function request(path, { method = 'GET', headers, body, timeoutMs = 60000 } = {}) {
  const endpoint = `${API_BASE}${path}`;
  const { controller, timeoutId } = withTimeout(timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method,
      headers,
      body,
      signal: controller.signal
    });

    const text = await response.text();
    const parsed = tryParseBody(text);

    if (!response.ok) {
      throw new ApiError(
        `${method} ${endpoint} failed with HTTP ${response.status}`,
        { status: response.status, body: parsed, endpoint }
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const isTimeout = error?.name === 'AbortError';
    const message = isTimeout
      ? `${method} ${endpoint} timed out`
      : `${method} ${endpoint} failed: ${error?.message || 'Network error'}`;
    throw new ApiError(message, {
      endpoint,
      unreachable: !isTimeout,
      body: {
        error: isTimeout ? 'timeout' : 'network_error',
        details: {
          name: error?.name || 'Error',
          message: error?.message || 'Unknown error',
          endpoint
        }
      }
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const api = {
  submitSmiles(smiles, molblock = '') {
    const payload = { smiles };
    const rawMolblock = String(molblock || '');
    if (rawMolblock.trim()) {
      payload.molblock = rawMolblock.replace(/\s+$/, '');
    }

    return request('/smiles', {
      method: 'POST',
      timeoutMs: 60000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  searchChemicalName(name) {
    return request('/chemical-name', {
      method: 'POST',
      timeoutMs: 20000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
  },

  getChemicalNameSuggestions(query, limit = 8) {
    const encoded = encodeURIComponent(query || '');
    return request(`/chemical-name-suggestions?q=${encoded}&limit=${limit}`, {
      method: 'GET',
      timeoutMs: 10000
    });
  },

  uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    return request('/upload-image', {
      method: 'POST',
      timeoutMs: 180000,
      body: formData
    });
  },

  getHealth() {
    return request('/health', { method: 'GET', timeoutMs: 2000 });
  },

  exportGaussian(atoms, charge = 0, multiplicity = 1) {
    return request('/export-gaussian', {
      method: 'POST',
      timeoutMs: 60000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atoms, charge, multiplicity })
    });
  },

  exportOrca(atoms, charge = 0, multiplicity = 1) {
    return request('/export-orca', {
      method: 'POST',
      timeoutMs: 60000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atoms, charge, multiplicity })
    });
  },

  exportPdb(atoms, charge = 0, multiplicity = 1) {
    return request('/export-pdb', {
      method: 'POST',
      timeoutMs: 60000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atoms, charge, multiplicity })
    });
  },

  exportSdf(atoms, charge = 0, multiplicity = 1) {
    return request('/export-sdf', {
      method: 'POST',
      timeoutMs: 60000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atoms, charge, multiplicity })
    });
  },

  exportMol(atoms, charge = 0, multiplicity = 1) {
    return request('/export-mol', {
      method: 'POST',
      timeoutMs: 60000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atoms, charge, multiplicity })
    });
  }
};
