(function() {
  console.log('🚀 KA Widget inicializando...');
  
  const CONFIG = {
    apiUrl: 'https://ka-voice-backend.onrender.com',
    clientId: 'ka_agencia'
  };

  const widgetHTML = `
    <div id="ka-widget" style="position:fixed;bottom:24px;right:24px;z-index:99999;font-family:'Inter',sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:12px;">
      <div id="ka-tooltip" style="background:#fff;color:#000;padding:10px 16px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.15);cursor:pointer;border:1px solid #e5e5e5;transition:transform 0.2s;">
        💬 Fale ou digite para nossa assistente
      </div>
      <div id="ka-chat" style="display:none;background:#111;color:#fff;padding:16px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #333;width:300px;max-height:320px;overflow-y:auto;">
        <div id="ka-messages" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;"></div>
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
  console.log('✅ Widget HTML injetado');

  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  let kaIsRec = false;
  let kaRecorder = null;
  let kaChunks = [];
  let kaAudioUrl = null;

  window.getChatHistory = function() {
    const msgs = document.getElementById('ka-messages').children;
    const history = [];
    // Pega apenas as últimas 4 mensagens para não estourar o limite de tokens
    const start = Math.max(0, msgs.length - 4);
    for (let i = start; i < msgs.length; i++) {
      const div = msgs[i];
      const text = div.innerText.trim();
      // Ignora mensagens de sistema (Processando, Ouvindo...)
      if (!text || text.includes('Processando') || text.includes('Ouvindo') || text.includes('Erro')) continue;
      
      // Identifica se é user (amarelo/flex-end) ou assistant (cinza/flex-start)
      if (div.style.alignSelf === 'flex-end') {
        history.push({role: 'user', content: text});
      } else {
        history.push({role: 'assistant', content: text});
      }
    }
    return JSON.stringify(history);
  };


  window.getChatHistory = function() {
    const msgs = document.getElementById('ka-messages').children;
    const history = [];
    // Pega apenas as últimas 4 mensagens para não estourar o limite de tokens
    const start = Math.max(0, msgs.length - 4);
    for (let i = start; i < msgs.length; i++) {
      const div = msgs[i];
      const text = div.innerText.trim();
      // Ignora mensagens de sistema (Processando, Ouvindo...)
      if (!text || text.includes('Processando') || text.includes('Ouvindo') || text.includes('Erro')) continue;
      
      // Identifica se é user (amarelo/flex-end) ou assistant (cinza/flex-start)
      if (div.style.alignSelf === 'flex-end') {
        history.push({role: 'user', content: text});
      } else {
        history.push({role: 'assistant', content: text});
      }
    }
    return JSON.stringify(history);
  };


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
    console.log('🔘 kaStartRec chamado');
    const tooltip = document.getElementById('ka-tooltip');
    const chat = document.getElementById('ka-chat');
    if (tooltip) {
      tooltip.style.display = 'none';
      console.log('✅ Tooltip ocultado');
    }
    if (chat) chat.style.display = 'block';
  };

  window.kaToggleMic = function() {
    console.log('🎙️ kaToggleMic chamado');
    window.kaStartRec();
    const btn = document.getElementById('ka-mic-btn');
    if (!kaIsRec) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
        kaRecorder = new MediaRecorder(stream);
        kaChunks = [];
        kaRecorder.ondataavailable = function(e) { kaChunks.push(e.data); };
        kaRecorder.onstop = window.kaSendAudio;
        kaRecorder.start();
        kaIsRec = true;
        btn.style.background = '#ef4444';
        btn.innerText = '⏹️';
        window.kaAddMsg('user', 'Ouvindo... (clique no vermelho para parar)');
      }).catch(function(err) {
        console.error('Erro ao acessar mic:', err);
        window.kaAddMsg('assistant', 'Erro: Permissão de mic negada.');
      });
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
    console.log('📤 Enviando áudio...');
    const blob = new Blob(kaChunks, { type: 'audio/webm' });
    const form = new FormData();
    form.append('audio', blob, 'rec.webm');
    form.append('client_id', CONFIG.clientId);
    form.append('history', window.getChatHistory());
    form.append('history', window.getChatHistory());
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
      console.log('✅ Áudio processado com sucesso');
    } catch (err) {
      console.error('❌ Erro ao enviar áudio:', err);
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
    form.append('history', window.getChatHistory());
    form.append('history', window.getChatHistory());
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
    if (!kaAudioUrl) {
      console.error('❌ kaAudioUrl está vazio!');
      return;
    }
    const audio = document.getElementById('ka-audio');
    const playBtn = document.getElementById('ka-play-btn');
    
    audio.pause();
    audio.currentTime = 0;
    audio.src = kaAudioUrl;
    audio.load();
    
    console.log('🔊 Tentando tocar áudio...');
    
    audio.play().then(function() {
      console.log('✅ Áudio tocando!');
      playBtn.innerText = '⏹️ Parar';
      playBtn.onclick = function() {
        audio.pause();
        audio.currentTime = 0;
        playBtn.style.display = 'none';
        playBtn.onclick = window.kaPlayAudio;
      };
    }).catch(function(e) {
      console.error('❌ ERRO AO TOCAR ÁUDIO:', e);
      playBtn.innerText = '❌ Erro (F12)';
      setTimeout(function() { playBtn.innerText = '▶️ Ouvir Resposta'; }, 3000);
    });
    
    audio.onended = function() {
      playBtn.style.display = 'none';
      playBtn.onclick = window.kaPlayAudio;
    };
  };

  setTimeout(function() {
    const tooltip = document.getElementById('ka-tooltip');
    const micBtn = document.getElementById('ka-mic-btn');
    const sendBtn = document.getElementById('ka-send-btn');
    const playBtn = document.getElementById('ka-play-btn');
    const textInput = document.getElementById('ka-text-input');

    if (tooltip) {
      tooltip.addEventListener('click', window.kaStartRec);
      console.log('✅ Evento de clique registrado no tooltip');
    }
    if (micBtn) {
      micBtn.addEventListener('click', window.kaToggleMic);
      console.log('✅ Evento de clique registrado no micBtn');
    }
    if (sendBtn) {
      sendBtn.addEventListener('click', window.kaSendText);
      console.log('✅ Evento de clique registrado no sendBtn');
    }
    if (playBtn) {
      playBtn.addEventListener('click', window.kaPlayAudio);
      console.log('✅ Evento de clique registrado no playBtn');
    }
    if (textInput) {
      textInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') window.kaSendText();
      });
      console.log('✅ Evento de Enter registrado no textInput');
    }
    
    console.log('🎉 KA Widget 100% inicializado!');
  }, 100);
})();
