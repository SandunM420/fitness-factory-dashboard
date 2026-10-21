// All data access goes through our own API (relative URLs). No credentials here.
export async function getJson(path) {
  return requestJson(path);
}

export async function requestJson(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: options.body ? { 'Content-Type': 'application/json', ...options.headers } : options.headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}
