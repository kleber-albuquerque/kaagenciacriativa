(function() {
  // CONFIGURAÇÕES GLOBAIS (Fáceis de alterar por cliente)
  const CONFIG = {
    apiUrl: 'https://ka-voice-backend.onrender.com',
    clientId: 'ka_agencia' // Mude isso para cada cliente (ex: 'imobiliaria_x')
  };

  // 1. Injeta o HTML do Widget no final do body
  const widgetHTML = `
    <div id="ka-widget" style="position:fixed;bottom:24px;right:24px;z-index:99999;font-family:'Inter',sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:12px;">
      <div id="ka-tooltip" onclick="kaStartRec()" style="background:#fff;color:#000;padding:10px 16px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.15);cursor:pointer;border:1px solid #e5e5e5;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
        💬 Fale ou digite para nossa assistente
      </div>
      <div id="ka-chat" style="display:none;background:#111;color:#fff;padding:16px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #333;width:300px;max-height:320px;overflow-y:auto;">
        <div id="ka-messages" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;"></div>
        <div style="display:flex;gap:8px;">
          <input type="text" id="ka-text-input" placeholder="Digite sua mensagem..." style="flex:1;background:#222;border:1px solid #444;color:#fff;padding:10px;border-radius:8px;font-size:13px;outline:none;" onkeypress="if(event.key==='Enter') kaSendText()">
          <button onclick="kaSendText()" style="background:#FFD400;color:#000;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">➤</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button id="ka-play-btn" onclick="kaPlayAudio()" style="display:none;background:#10b981;color:#fff;padding:10px 16px;border-radius:20px;border:none;cursor:pointer;font-size:13px;font-weight:600;">▶️ Ouvir Resposta</button>
        <button id="ka-mic-btn" onclick="kaToggleMic()" style="width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:#FFD400;color:#000;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(255,212,0,0.4);font-size:24px;">🎙️</button>
      </div>
    </div>
    <audio id="ka-audio" style="display:none;"></audio>
  `;
  document.body.insertAdjacentHTML('beforeend', widgetHTML);

  // 2. Injeta a Fonte Inter (caso o site não tenha)
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  // 3. Lógica do Widget (isolada em funções globais para o HTML acessar)
  let kaIsRec = false, kaRecorder, kaChunks = [], kaAudioUrl = null;

  window.kaAddMsg = function(role, text) {
    const chat = document.getElementById('ka-chat');
    const msgs = document.getElementById('ka-messages');
    chat.style.display = 'block';
    const div = document.createElement('div');
    div.style.cssText = role === 'user' 
      ? 'background:#FFD400;color:#000;padding:10px 14px;border-radius:12px 12px 0 12px;align-self:flex-end;max-width:85%;font-size:13px;font-weight:500;'
      : 'background:#333;color:#fff;padding:10px 14px;border-radius:12px 12px 12px 0;align-self:flex-start;max-width:85%;font-size:13px;';
    div.innerText = text;
    msgs.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  };

  window.kaStartRec = function() {
    document.getElementById('ka-tooltip').style.display = 'none';
    document.getElementById('ka-chat').style.display = 'block';
  };

  window.kaToggleMic = function() {
    window.kaStartRec();
    const btn = document.getElementById('ka-mic-btn');
    if (!kaIsRec) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        kaRecorder = new MediaRecorder(stream);
        kaChunks = [];
        kaRecorder.ondataavailable = e => kaChunks.push(e.data);
        kaRecorder.onstop = kaSendAudio;
        kaRecorder.start();
        kaIsRec = true;
        btn.style.background = '#ef4444';
        btn.innerText = '⏹️';
        window.kaAddMsg('user', 'Ouvindo... (clique no vermelho para parar)');
      }).catch(() => window.kaAddMsg('assistant', 'Erro: Permissão de mic negada.'));
    } else {
      kaRecorder.stop();
      kaIsRec = false;
      btn.style.background = '#FFD400';
      btn.innerText = '🎙️';
      window.kaAddMsg('user', 'Processando... ⏳');
      document.getElementById('ka-play-btn').style.display = 'none';
    }
  };

  window.kaSendAudio = async function() {
    const blob = new Blob(kaChunks, { type: 'audio/webm' });
    const form = new FormData();
    form.append('audio', blob, 'rec.webm');
    form.append('client_id', CONFIG.clientId);
    try {
      const res = await fetch(CONFIG.apiUrl + '/api/voice', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Erro: ' + res.status);
      const data = await res.json();
      document.getElementById('ka-messages').lastChild.innerText = data.transcription;
      window.kaAddMsg('assistant', data.response);
      kaAudioUrl = "data:audio/mpeg;base64," + data.audio;
      const playBtn = document.getElementById('ka-play-btn');
      playBtn.style.display = 'block';
      playBtn.innerText = '▶️ Ouvir Resposta';
    } catch (err) {
      console.error(err);
      window.kaAddMsg('assistant', 'Erro de conexão. Tente novamente.');
    }
  };

  window.kaSendText = async function() {
    const input = document.getElementById('ka-text-input');
    const text = input.value.trim();
    if (!text) return;
    window.kaStartRec();
    window.kaAddMsg('user', text);
    input.value = '';
    window.kaAddMsg('assistant', 'Processando... ⏳');
    document.getElementById('ka-play-btn').style.display = 'none';

    const form = new FormData();
    form.append('message', text);
    form.append('client_id', CONFIG.clientId);
    try {
      const res = await fetch(CONFIG.apiUrl + '/api/text', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Erro: ' + res.status);
      const data = await res.json();
      document.getElementById('ka-messages').lastChild.innerText = data.response;
      kaAudioUrl = "data:audio/mpeg;base64," + data.audio;
      const playBtn = document.getElementById('ka-play-btn');
      playBtn.style.display = 'block';
      playBtn.innerText = '▶️ Ouvir Resposta';
    } catch (err) {
      console.error(err);
      document.getElementById('ka-messages').lastChild.innerText = 'Erro de conexão.';
    }
  };

  window.kaPlayAudio = function() {
    if (!kaAudioUrl) return;
    const audio = document.getElementById('ka-audio');
    const playBtn = document.getElementById('ka-play-btn');
    audio.pause();
    audio.currentTime = 0;
    audio.src = kaAudioUrl;
    audio.play().catch(e => console.error('Erro ao tocar:', e));
    playBtn.innerText = '⏹️ Parar';
    playBtn.onclick = () => {
      audio.pause();
      audio.currentTime = 0;
      playBtn.style.display = 'none';
      playBtn.onclick = window.kaPlayAudio;
    };
    audio.onended = () => {
      playBtn.style.display = 'none';
      playBtn.onclick = window.kaPlayAudio;
    };
  };
})();
