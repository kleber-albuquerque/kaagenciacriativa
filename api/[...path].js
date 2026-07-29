export const config = { runtime: 'edge' };

const RENDER_URL = 'https://ka-voice-backend.onrender.com';
const SECRET = 'ka_super_secret_2024';

export default async function handler(request) {
  const url = new URL(request.url);
  // Pega o caminho completo (ex: /api/text) e envia pro Render
  const destUrl = `${RENDER_URL}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('x-secret-key', SECRET);
  headers.delete('host');

  try {
    const response = await fetch(destUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' ? request.body : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/csv')) {
      const text = await response.text();
      return new Response(text, { status: 200, headers: { 'Content-Type': 'text/csv' }});
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro no proxy' }), { status: 500 });
  }
}
