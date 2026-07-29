
export const config = { runtime: 'edge' };

const RENDER_URL = 'https://ka-voice-backend.onrender.com';
const SECRET = 'ka_super_secret_2024';

export default async function handler(request) {
  const url = new URL(request.url);
  const destUrl = `${RENDER_URL}${url.pathname}${url.search}`;

  const contentType = request.headers.get('content-type') || '';
  const headers = { 'x-secret-key': SECRET };
  if (contentType) headers['content-type'] = contentType;

  try {
    const response = await fetch(destUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' ? request.body : undefined,
    });

    const respContentType = response.headers.get('content-type') || '';

    // Se for CSV, devolve como texto
    if (respContentType.includes('text/csv')) {
      const text = await response.text();
      return new Response(text, { status: 200, headers: { 'Content-Type': 'text/csv' }});
    }

    // TENTA PEGAR COMO JSON. SE DER ERRO, RETORNA UM JSON DE ERRO SEGURO
    let data;
    try {
      data = await response.json();
    } catch (e) {
      const textError = await response.text();
      console.error("Erro ao fazer parse do Render:", textError);
      return new Response(JSON.stringify({ 
        error: "Erro interno do servidor de voz", 
        details: textError.substring(0, 200) 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro de conexão com o servidor principal' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
