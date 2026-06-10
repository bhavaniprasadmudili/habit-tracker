const API_BASE = '/api';

export async function fetchJson(url, token, init = {}) {
  const response = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
    ...init,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Fetch failed');
  return body;
}

export { API_BASE };
