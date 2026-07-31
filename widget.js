// KA Widget v3.0 - JSON puro, data-client-id, mic blindado
(function() {
console.log('🚀 KA Widget v3.0 inicializando...');
var currentScript = document.currentScript;
var urlParams = new URLSearchParams(window.location.search);
var CONFIG = {
  apiUrl: 'https://ka-voice-backend.onrender.com',
  clientId: (currentScript && currentScript.getAttribute('data-client-id')) || urlParams.get('client') || 'ka_agencia'
};
console.log('🎯 Cliente identificado:', CONFIG.clientId);

var widgetHTML = '<div id="ka-widget" style="position:fixed;bottom:24px;right:24px;z-index:99999;font-family:Inter,sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:12px;">'
+ '<div id="ka-tooltip" style="background:#fff;color:#000;padding:10px 16px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.15);cursor:pointer;border:1px solid #e5e5e5;">💬 Fale ou digite para nossa assistente</div>'
+ '<div id="ka-chat" style="display:none;background:#111;color:#fff;padding:16px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #333;width:300px;max-height:320px;overflow-y:auto;">'
+ '<div id="ka-messages" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;"></div>'
+ '<div id="ka-status" style="display:none;font-size:12px;color:#aaa;margin-bottom:8px;text-align:center;"></div>'
+ '<div style="display:flex;gap:8px;">'
+ '<input type="text" id="ka-text-input" placeholder="Digite sua mensagem..." style="flex:1;background:#222;border:1px solid #444;color:#fff;padding:10px;border-radius:8px;font-size:13px;outline:none;">'
+ '<button id="ka-send-btn" style="background:#FFD400;color:#000;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">➤</button>'
+ '</div></div>'
+ '<div style="display:flex;gap:8px;align-items:center;">'
+ '<button id="ka-play-btn" style="display:none;background:#10b981;color:#fff;padding:10px 16px;border-radius:20px;border:none;cursor:pointer;font-size:13px;font-weight:600;">▶️ Ouvir</button>'
+ '<button id="ka-mic-btn" style="width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:#FFD400;color:#000;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(255,212,0,0.4);font-size:24px;">🎙️</button>'
+ '</div></div><audio id="ka-audio" style="display:none;"></audio>';

document.body.insertAdjacentHTML('beforeend', widgetHTML);

var link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);

var kaIsListening = false;
var kaIsPlaying = false;
var kaRecognizer = null;
var kaAudioUrl = null;

var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  kaRecognizer = new SpeechRecognition();
  kaRecognizer.lang = 'pt-BR';
  kaRecognizer.continuous = false;
  kaRecognizer.interimResults = false;
  kaRecognizer.onresult = function(event) {
    var transcript = event.results[0][0].transcript;
    if (kaIsListening) {
      try { kaRecognizer.stop(); } catch(e) {}
      kaIsListening = false;
      var b = document.getElementById('ka-mic-btn');
      if (b) { b.style.background = '#FFD400'; b.innerText = '🎙️'; }
    }
    kaSendMessage(transcript);
  };
  kaRecognizer.onerror = function(event) {
    console.error('Erro de voz:', event.error);
    if (kaIsListening) {
      try { kaRecognizer.stop(); } catch(e) {}
      kaIsListening = false;
      var b = document.getElementById('ka-mic-btn');
      if (b) { b.style.background = '#FFD400'; b.innerText = '🎙️'; }
    }
    if (event.error === 'not-allowed') kaAddMsg('assistant', 'Permita o acesso ao microfone.');
  };
  kaRecognizer.onend = function() {
    if (kaIsListening) {
      kaIsListening = false;
      var b = document.getElementById('ka-mic-btn');
      if (b) { b.style.background = '#FFD400'; b.innerText = '🎙️'; }
    }
  };
}

function getChatHistory() {
  var msgs = document.getElementById('ka-messages');
  if (!msgs) return [];
  var children = msgs.children;
  var history = [];
  var start = Math.max(0, children.length - 6);
  for (var i = start; i < children.length; i++) {
    var div = children[i];
    var text = div.innerText.trim();
    if (!text) continue;
    history.push({ role: div.style.alignSelf === 'flex-end' ? 'user' : 'assistant', content: text });
  }
  return history;
}

function kaSetStatus(text) {
  var s = document.getElementById('ka-status');
  if (s) { s.innerText = text; s.style.display = 'block'; }
}

function kaAddMsg(role, text) {
  var chat = document.getElementById('ka-chat');
  var msgs = document.getElementById('ka-messages');
  var status = document.getElementById('ka-status');
  if (chat) chat.style.display = 'block';
  if (status) status.style.display = 'none';
  var div = document.createElement('div');
  div.style.cssText = role === 'user'
    ? 'background:#FFD400;color:#000;padding:10px 14px;border-radius:12px 12px 0 12px;align-self:flex-end;max-width:85%;font-size:13px;font-weight:500;'
    : 'background:#333;color:#fff;padding:10px 14px;border-radius:12px 12px 12px 0;align-self:flex-start;max-width:85%;font-size:13px;';
  div.innerText = text;
  msgs.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function kaStartRec() {
  var tooltip = document.getElementById('ka-tooltip');
  var chat = document.getElementById('ka-chat');
  if (tooltip) tooltip.style.display = 'none';
  if (chat) chat.style.display = 'block';
}

function kaSendMessage(text) {
  kaStartRec();
  kaAddMsg('user', text);
  kaSetStatus('Processando... ⏳');
  var playBtn = document.getElementById('ka-play-btn');
  if (playBtn) playBtn.style.display = 'none';

  var payload = {
    message: text,
    client_id: CONFIG.clientId,
    history: getChatHistory()
  };

  fetch(CONFIG.apiUrl + '/api/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function(res) {
    if (!res.ok) throw new Error('Erro no servidor: ' + res.status);
    return res.json();
  })
  .then(function(data) {
    kaAddMsg('assistant', data.response);
    if (data.audio_base64) {
      kaAudioUrl = 'data:audio/mp3;base64,' + data.audio_base64;
      kaPlayAudio();
    }
  })
  .catch(function(err) {
    console.error('Erro na requisição:', err);
    kaAddMsg('assistant', 'Erro de conexão. Tente novamente.');
  });
}

function kaSendText() {
  var input = document.getElementById('ka-text-input');
  var text = input.value.trim();
  if (!text) return;
  input.value = '';
  kaSendMessage(text);
}

function kaPlayAudio() {
  if (!kaAudioUrl) return;
  var audio = document.getElementById('ka-audio');
  var playBtn = document.getElementById('ka-play-btn');
  if (kaIsPlaying) {
    audio.pause(); audio.currentTime = 0; kaIsPlaying = false;
    playBtn.innerText = '▶️ Ouvir'; return;
  }
  audio.src = kaAudioUrl;
  audio.play().then(function() {
    kaIsPlaying = true; playBtn.style.display = 'block'; playBtn.innerText = '⏹️ Parar';
  }).catch(function(e) {
    console.error('Erro ao tocar:', e); playBtn.innerText = '▶️ Ouvir';
  });
  audio.onended = function() { kaIsPlaying = false; playBtn.innerText = '▶️ Ouvir'; };
}

function kaToggleMic() {
  kaStartRec();
  var btn = document.getElementById('ka-mic-btn');
  if (!kaIsListening) {
    if (!kaRecognizer) { kaAddMsg('assistant', 'Navegador não suporta voz.'); return; }
    try {
      kaRecognizer.start();
      kaIsListening = true;
      btn.style.background = '#ef4444';
      btn.innerText = '⏹️';
      kaSetStatus('Ouvindo... (clique para parar)');
    } catch(e) {
      console.error('Erro ao iniciar mic:', e);
      try { kaRecognizer.stop(); } catch(err) {}
      kaIsListening = false;
      btn.style.background = '#FFD400';
      btn.innerText = '🎙️';
      setTimeout(function() {
        try {
          kaRecognizer.start();
          kaIsListening = true;
          btn.style.background = '#ef4444';
          btn.innerText = '⏹️';
        } catch(e2) { console.error('Falha no restart:', e2); }
      }, 200);
    }
  } else {
    try { kaRecognizer.stop(); } catch(e) {}
    kaIsListening = false;
    btn.style.background = '#FFD400';
    btn.innerText = '🎙️';
    var s = document.getElementById('ka-status');
    if (s) s.style.display = 'none';
  }
}

setTimeout(function() {
  var tooltip = document.getElementById('ka-tooltip');
  var micBtn = document.getElementById('ka-mic-btn');
  var sendBtn = document.getElementById('ka-send-btn');
  var playBtn = document.getElementById('ka-play-btn');
  var textInput = document.getElementById('ka-text-input');
  if (tooltip) tooltip.addEventListener('click', kaStartRec);
  if (micBtn) micBtn.addEventListener('click', kaToggleMic);
  if (sendBtn) sendBtn.addEventListener('click', kaSendText);
  if (playBtn) playBtn.addEventListener('click', kaPlayAudio);
  if (textInput) textInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') kaSendText(); });
  console.log('🎉 KA Widget v3.0 Finalizado!');
}, 100);
})();
