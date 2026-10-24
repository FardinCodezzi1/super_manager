const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'https://meal-manager-api.onrender.com/api'
).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

let onUnauthorizedHandler = null;

export function setOnUnauthorizedHandler(handler) {
  onUnauthorizedHandler = handler;
}

export async function request(path, options = {}) {
  const token = localStorage.getItem('mm_token');
  const headers = new Headers(options.headers || {});

  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      if (onUnauthorizedHandler) {
        onUnauthorizedHandler();
      }
      throw new ApiError('Session expired or unauthorized. Please sign in again.', 401);
    }

    if (res.status === 204) {
      return null;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data.error || data.message || `Request failed with status ${res.status}`;
      throw new ApiError(message, res.status, data.details || data);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network or offline error
    throw new ApiError(
      err.message === 'Failed to fetch'
        ? 'Network error. Please check your connection or wait for backend wake-up.'
        : (err.message || 'An unexpected error occurred'),
      0
    );
  }
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path, body, options) => request(path, {
    ...options,
    method: 'DELETE',
    ...(body ? { body: JSON.stringify(body) } : {})
  }),
};
