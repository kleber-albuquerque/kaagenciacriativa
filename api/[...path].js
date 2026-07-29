export const config = { runtime: 'edge' };

const RENDER_URL = 'https://ka-voice-backend.onrender.com';
const SECRET = 'ka_super_secret_2024';

export default async function handler(request) {
  const url = new URL(request.url);
  const destUrl = `${RENDER_URL}${url.pathname}${url.search}`;

  const headers = { 'x-secret-key': SECRET };
  const reqContentType = request.headers.get('content-type');
  if (reqContentType) headers['content-type'] = reqContentType;

  try {
    const response = await fetch(destUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' ? request.body : undefined,
    });

    const resContentType = response.headers.get('content-type') || '';

    if (resContentType.includes('text/csv')) {
      const text = await response.text();
      return new Response(text, { status: 200, headers: { 'Content-Type': 'text/csv' }});
    }

    // BLINDAGEM: Lê sempre como texto primeiro para não quebrar o JSON
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      // Se não for JSON (ex: HTML de erro do Render), devolve um erro seguro
      return new Response(JSON.stringify({ 
        error: "O servidor retornou uma resposta inesperada.", 
        details: text.substring(0, 150) 
      }), { 
        status: response.status, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro de conexão com o servidor principal' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
