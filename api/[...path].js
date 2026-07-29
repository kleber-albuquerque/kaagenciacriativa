export const config = { runtime: 'edge' };

const RENDER_URL = 'https://ka-voice-backend.onrender.com';
const SECRET = 'ka_super_secret_2024';

export default async function handler(request) {
  const url = new URL(request.url);
  // Repassa exatamente o que chegou, sem tirar nem pôr nada
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

    // Tenta ler como JSON. Se não for, devolve o erro de forma segura.
    const text = await response.text();
    try {
      return new Response(text, {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: "Resposta inválida do servidor", 
        details: text.substring(0, 150) 
      }), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro de conexão' }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
}
