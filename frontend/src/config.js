import { auth } from './firebaseConfig';

const PROD_API = 'https://familiarocha-api-694824783472.us-central1.run.app/api';
const DEV_API = '/api';
export const API_BASE = import.meta.env.PROD ? PROD_API : DEV_API;

export async function apiFetch(url, options = {}) {
  const headers = { ...options.headers };

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // token refresh falhou — tenta sem token
    }
  }

  return fetch(`${API_BASE}${url}`, { ...options, headers });
}
