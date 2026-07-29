(function() {
  console.log('🚀 KA Widget inicializando...');

  const CONFIG = {
    apiUrl: '/api/proxy',
    clientId: 'ka_agencia'
  };

  const widgetHTML = `
    <div id="ka-widget" style="position:fixed;bottom:24px;right:24px;z-index:99999;font-family:'Inter',sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:12px;">
      <div id="ka-tooltip" style="background:#fff;color:#000;padding:10px 16px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.15);cursor:pointer;border:1px solid #e5e5e5;transition:transform 0.2s;">
        💬 Fale ou digite para nossa assistente
      </div>
      <div id="ka-chat" style="display:none;background:#111;color:#fff;padding:16px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #333;width:300px;max-height:320px;overflow-y:auto;">
        <div id="ka-messages" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;"></div>
        <div id="ka-status" style="display:none;font-size:12px;color:#aaa;margin-bottom:8px;text-align:center;"></div>
        <div style="display:flex;gap:8px;">
          <input type="text" id="ka-text-input" placeholder="Digite sua mensagem..." style="flex:1;background:#222;border:1px solid #444;color:#fff;padding:10px;border-radius:8px;font-size:13px;outline:none;">
          <button id="ka-send-btn" style="background:#FFD400;color:#000;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">➤</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button id="ka-play-btn" style="display:none;background:#10b981;color:#fff;padding:10px 16px;border-radius:20px;border:none;cursor:pointer;font-size:13px;font-weight:600;">▶️ Ouvir Resposta</button>
        <button id="ka-mic-btn" style="width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:#FFD400;color:#000;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(255,212,0,0.4);font-size:24px;">🎙️</button>
      </div>
    </div>
    <audio id="ka-audio" style="display:none;"></audio>
  `;

  document.body.insertAdjacentHTML('beforeend', widgetHTML);

  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  let kaIsListening = false;
  let kaIsPlaying = false; // NOVA VARIÁVEL: Controla o estado do áudio
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
      kaToggleMic();
      kaSendVoice(transcript);
    };

    kaRecognizer.onerror = function(event) {
      console.error('Erro de voz:', event.error);
      kaToggleMic();
      if (event.error === 'not-allowed') window.kaAddMsg('assistant', 'Permita o acesso ao microfone.');
    };

    kaRecognizer.onend = function() {
      if (kaIsListening) kaToggleMic();
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
    return JSON.stringify(history);
  };

  window.kaSetStatus = function(text) {
    const status = document.getElementById('ka-status');
    status.innerText = text;
    status.style.display = 'block';
  };

  window.kaAddMsg = function(role, text) {
    const chat = document.getElementById('ka-chat');
    const msgs = document.getElementById('ka-messages');
    const status = document.getElementById('ka-status');
    chat.style.display = 'block';
    status.style.display = 'none';

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

  window.kaSendVoice = async function(transcript) {
    window.kaStartRec();
    window.kaAddMsg('user', transcript);
    window.kaSetStatus('Processando... ⏳');
    document.getElementById('ka-play-btn').style.display = 'none';

    const form = new FormData();
    form.append('transcript', transcript);
    form.append('client_id', CONFIG.clientId);
    form.append('history', window.getChatHistory());

    try {
      const res = await fetch(CONFIG.apiUrl + '/api/voice', { method: 'POST', body: form });
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

  window.kaSendText = async function() {
    const input = document.getElementById('ka-text-input');
    const text = input.value.trim();
    if (!text) return;

    window.kaStartRec();
    window.kaAddMsg('user', text);
    input.value = '';
    window.kaSetStatus('Processando... ⏳');
    document.getElementById('ka-play-btn').style.display = 'none';

    const form = new FormData();
    form.append('message', text);
    form.append('client_id', CONFIG.clientId);
    form.append('history', window.getChatHistory());

    try {
      const res = await fetch(CONFIG.apiUrl + '/api/text', { method: 'POST', body: form });
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

  // --- LÓGICA CORRIGIDA DO BOTÃO PARAR/PLAY ---
  window.kaPlayAudio = function() {
    if (!kaAudioUrl) return;
    const audio = document.getElementById('ka-audio');
    const playBtn = document.getElementById('ka-play-btn');

    if (kaIsPlaying) {
      // Se já estiver tocando, PARAR
      audio.pause();
      audio.currentTime = 0;
      kaIsPlaying = false;
      playBtn.innerText = '▶️ Ouvir de novo';
      return;
    }

    // Se não estiver tocando, TOCAR
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

  window.kaToggleMic = function() {
    window.kaStartRec();
    const btn = document.getElementById('ka-mic-btn');
    if (!kaIsListening) {
      if (!kaRecognizer) { window.kaAddMsg('assistant', 'Navegador não suporta voz.'); return; }
      try {
        kaRecognizer.start();
        kaIsListening = true;
        btn.style.background = '#ef4444';
        btn.innerText = '⏹️';
        window.kaSetStatus('Ouvindo... (clique para parar)');
      } catch(e) { console.error(e); }
    } else {
      kaRecognizer.stop();
      kaIsListening = false;
      btn.style.background = '#FFD400';
      btn.innerText = '🎙️';
      document.getElementById('ka-status').style.display = 'none';
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

    console.log('🎉 KA Widget Finalizado!');
  }, 100);
})();
