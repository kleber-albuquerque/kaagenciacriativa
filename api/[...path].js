export const config = { runtime: 'edge' };

const RENDER_URL = 'https://ka-voice-backend.onrender.com';
const SECRET = 'ka_super_secret_2024';

export default async function handler(request) {
  const url = new URL(request.url);
  const destUrl = `${RENDER_URL}${url.pathname}${url.search}`;

  // Pega o content-type exato (importante para FormData/multipart)
  const contentType = request.headers.get('content-type') || '';

  // Monta os cabeçalhos de forma limpa, sem herdar sujeira do Vercel
  const headers = {
    'x-secret-key': SECRET,
  };

  // Só adiciona o content-type se existir (essencial para arquivos/formulários)
  if (contentType) {
    headers['content-type'] = contentType;
  }

  try {
    const response = await fetch(destUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' ? request.body : undefined,
    });

    // Se for CSV, devolve como texto
    if ((response.headers.get('content-type') || '').includes('text/csv')) {
      const text = await response.text();
      return new Response(text, { status: 200, headers: { 'Content-Type': 'text/csv' }});
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro de conexão com o servidor principal' }), { status: 500 });
  }
}
