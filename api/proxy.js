export const config = { runtime: 'edge' };

const RENDER_URL = 'https://ka-voice-backend.onrender.com';
const SECRET = 'ka_super_secret_2024';

export default async function handler(request) {
  const url = new URL(request.url);
  // Remove o "/api/proxy" do caminho e manda pro Render
  const destPath = url.pathname.replace('/api/proxy', '') || '/';
  const destUrl = `${RENDER_URL}${destPath}${url.search}`;

  // Pega todos os cabeçalhos originais
  const headers = new Headers(request.headers);
  // Adiciona a senha secreta para o Render deixar passar
  headers.set('x-secret-key', SECRET);
  // Remove o cabeçalho 'host' do Vercel para não confundir o Render
  headers.delete('host');

  try {
    const response = await fetch(destUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' ? request.body : undefined,
    });

    // Se for download de CSV (leads), devolve o arquivo
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/csv')) {
      const text = await response.text();
      return new Response(text, { status: 200, headers: { 'Content-Type': 'text/csv' }});
    }

    // Se for JSON (chat normal), devolve o JSON
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro no proxy' }), { status: 500 });
  }
}
