// KA Widget v2.4 - JSON puro, data-client-id e Microfone Blindado
(function() {
console.log('🚀 KA Widget inicializando...');

// 1. Lê o client_id da tag <script> (prioridade), depois da URL, depois o padrão
const currentScript = document.currentScript;
const urlParams = new URLSearchParams(window.location.search);
const CONFIG = {
  apiUrl: 'https://ka-voice-backend.onrender.com',
  clientId: (currentScript && currentScript.getAttribute('data-client-id')) || 
            urlParams.get('client') || 
            'ka_agencia'
};
console.log('🎯 Cliente identificado:', CONFIG.clientId);

const widgetHTML = `<div id="ka-widget" style="position:fixed;bottom:24px;right:24px;z-index:99999;font-family:'Inter',sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:12px;"> <div id="ka-tooltip" style="background:#fff;color:#000;padding:10px 16px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.15);cursor:pointer;border:1px solid #e5e5e5;transition:transform 0.2s;"> 💬 Fale ou digite para nossa assistente </div> <div id="ka-chat" style="display:none;background:#111;color:#fff;padding:16px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #333;width:300px;max-height:320px;overflow-y:auto;"> <div id="ka-messages" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;"></div> <div id="ka-status" style="display:none;font-size:12px;color:#aaa;margin-bottom:8px;text-align:center;"></div> <div style="display:flex;gap:8px;"> <input type="text" id="ka-text-input" placeholder="Digite sua mensagem..." style="flex:1;background:#222;border:1px solid #444;color:#fff;padding:10px;border-radius:8px;font-size:13px;outline:none;"> <button id="ka-send-btn" style="background:#FFD400;color:#000;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">➤</button> </div> </div> <div style="display:flex;gap:8px;align-items:center;"> <button id="ka-play-btn" style="display:none;background:#10b981;color:#fff;padding:10px 16px;border-radius:20px;border:none;cursor:pointer;font-size:13px;font-weight:600;">▶️ Ouvir Resposta</button> <button id="ka-mic-btn" style="width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:#FFD400;color:#000;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(255,212,0,0.4);font-size:24px;">🎙️</button> </div> </div> <audio id="ka-audio" style="display:none;"></audio>`;
document.body.insertAdjacentHTML('beforeend', widgetHTML);

const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);

let kaIsListening = false;
let kaIsPlaying = false;
let kaRecognizer = null;
let kaAudioUrl = null;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  kaRecognizer = new SpeechRecognition();
  kaRecognizer.lang = 'pt-BR';
  kaRecognizer.continuous = false;
  kaRecognizer.interimResults = false;
  
  kaRecognizer.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    // Para de ouvir com segurança absoluta antes de enviar
    if (kaIsListening) {
      try { kaRecognizer.stop(); } catch(e) {}
      kaIsListening = false;
      const btn = document.getElementById('ka-mic-btn');
      if (btn) {
        btn.style.background = '#FFD400';
        btn.innerText = '🎙️';
      }
      const status = document.getElementById('ka-status');
      if (status) status.style.display = 'none';
    }
    kaSendMessage(transcript); // Unificado para usar JSON
  };
  
  kaRecognizer.onerror = function(event) {
    console.error('Erro de voz:', event.error);
    if (kaIsListening) {
      try { kaRecognizer.stop(); } catch(e) {}
      kaIsListening = false;
      const btn = document.getElementById('ka-mic-btn');
      if (btn) {
        btn.style.background = '#FFD400';
        btn.innerText = '🎙️';
      }
    }
    if (event.error === 'not-allowed') window.kaAddMsg('assistant', 'Permita o acesso ao microfone.');
  };
  
  kaRecognizer.onend = function() {
    if (kaIsListening) {
      kaIsListening = false;
      const btn = document.getElementById('ka-mic-btn');
      if (btn) {
        btn.style.background = '#FFD400';
        btn.innerText = '🎙️';
      }
    }
  };
}

window.getChatHistory = function() {
  const msgs = document.getElementById('ka-messages').children;
  const history = [];
  const start = Math.max(0, msgs.length - 6);
  for (let i = start; i < msgs.length; i++) {
    const div = msgs[i];
    const text = div.innerText.trim();
    if (!text) continue;
    history.push({ role: div.style.alignSelf === 'flex-end' ? 'user' : 'assistant', content: text });
  }
  return history;
};

window.kaSetStatus = function(text) {
  const status = document.getElementById('ka-status');
  if (status) {
    status.innerText = text;
    status.style.display = 'block';
  }
};

window.kaAddMsg = function(role, text) {
  const chat = document.getElementById('ka-chat');
  const msgs = document.getElementById('ka-messages');
  const status = document.getElementById('ka-status');
  if (chat) chat.style.display = 'block';
  if (status) status.style.display = 'none';
  const div = document.createElement('div');
  div.style.cssText = role === 'user'
    ? 'background:#FFD400;color:#000;padding:10px 14px;border-radius:12px 12px 0 12px;align-self:flex-end;max-width:85%;font-size:13px;font-weight:500;'
    : 'background:#333;color:#fff;padding:10px 14px;border-radius:12px 12px 12px 0;align-self:flex-start;max-width:85%;font-size:13px;';
  div.innerText = text;
  msgs.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
};

window.kaStartRec = function() {
  const tooltip = document.getElementById('ka-tooltip');
  const chat = document.getElementById('ka-chat');
  if (tooltip) tooltip.style.display = 'none';
  if (chat) chat.style.display = 'block';
};

// ✅ ENVIO UNIFICADO EM JSON PURO (Campo 'message')
window.kaSendMessage = async function(text) {
  window.kaStartRec();
  window.kaAddMsg('user', text);
  window.kaSetStatus('Processando... ⏳');
  document.getElementById('ka-play-btn').style.display = 'none';

  const payload = {
    message: text,
    client_id: CONFIG.clientId,
    history: window.getChatHistory()
  };

  try {
    const res = await fetch(CONFIG.apiUrl + '/api/text', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) 
    });
    if (!res.ok) throw new Error('Erro no servidor');
    const data = await res.json();
    window.kaAddMsg('assistant', data.response);
    if (data.audio_base64) {
      kaAudioUrl = "data:audio/mp3;base64," + data.audio_base64;
      window.kaPlayAudio();
    }
  } catch (err) {
    console.error(err);
    window.kaAddMsg('assistant', 'Erro de conexão.');
  }
};

window.kaSendText = function() {
  const input = document.getElementById('ka-text-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  window.kaSendMessage(text);
};

window.kaPlayAudio = function() {
  if (!kaAudioUrl) return;
  const audio = document.getElementById('ka-audio');
  const playBtn = document.getElementById('ka-play-btn');
  if (kaIsPlaying) {
    audio.pause();
    audio.currentTime = 0;
    kaIsPlaying = false;
    playBtn.innerText = '▶️ Ouvir de novo';
    return;
  }
  audio.src = kaAudioUrl;
  audio.play().then(function() {
    kaIsPlaying = true;
    playBtn.style.display = 'block';
    playBtn.innerText = '⏹️ Parar';
  }).catch(function(e) {
    console.error('Erro ao tocar:', e);
    playBtn.innerText = '▶️ Ouvir de novo';
  });
  audio.onended = function() {
    kaIsPlaying = false;
    playBtn.innerText = '▶️ Ouvir de novo';
  };
};

// ✅ MICROFONE BLINDADO COM TRY/CATCH E FALLBACK DE RESTART
window.kaToggleMic = function() {
  window.kaStartRec();
  const btn = document.getElementById('ka-mic-btn');
  
  if (!kaIsListening) {
    if (!kaRecognizer) { 
      window.kaAddMsg('assistant', 'Navegador não suporta voz.'); 
      return; 
    }
    try {
      kaRecognizer.start();
      kaIsListening = true;
      btn.style.background = '#ef4444';
      btn.innerText = '⏹️';
      window.kaSetStatus('Ouvindo... (clique para parar)');
    } catch(e) { 
      console.error('Erro ao iniciar mic (já iniciado?):', e); 
      // Fallback de segurança: forçar parada e tentar reiniciar
      try { kaRecognizer.stop(); } catch(err) {}
      kaIsListening = false;
      btn.style.background = '#FFD400';
      btn.innerText = '🎙️';
      setTimeout(() => {
         try { 
           kaRecognizer.start(); 
           kaIsListening = true; 
           btn.style.background = '#ef4444'; 
           btn.innerText = '⏹️'; 
         } catch(e2) { console.error('Falha no restart:', e2); }
      }, 100);
    }
  } else {
    try {
      kaRecognizer.stop();
    } catch(e) {
      console.error('Erro ao parar mic:', e);
    }
    kaIsListening = false;
    btn.style.background = '#FFD400';
    btn.innerText = '🎙️';
    const status = document.getElementById('ka-status');
    if (status) status.style.display = 'none';
  }
};

setTimeout(function() {
  const tooltip = document.getElementById('ka-tooltip');
  const micBtn = document.getElementById('ka-mic-btn');
  const sendBtn = document.getElementById('ka-send-btn');
  const playBtn = document.getElementById('ka-play-btn');
  const textInput = document.getElementById('ka-text-input');
  if (tooltip) tooltip.addEventListener('click', window.kaStartRec);
  if (micBtn) micBtn.addEventListener('click', window.kaToggleMic);
  if (sendBtn) sendBtn.addEventListener('click', window.kaSendText);
  if (playBtn) playBtn.addEventListener('click', window.kaPlayAudio);
  if (textInput) textInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') window.kaSendText(); });
  console.log('🎉 KA Widget v2.4 Finalizado com Sucesso!');
}, 100);
})();
