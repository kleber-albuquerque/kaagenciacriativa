// KA Widget v4.0 - White-label com branding dinâmico
(function() {
console.log('🚀 KA Widget v4.0 inicializando...');
var currentScript = document.currentScript;
var urlParams = new URLSearchParams(window.location.search);
var CONFIG = {
  apiUrl: 'https://ka-voice-backend.onrender.com',
  clientId: (currentScript && currentScript.getAttribute('data-client-id')) || urlParams.get('client') || 'ka_agencia'
};
console.log('🎯 Cliente identificado:', CONFIG.clientId);

// ==========================================================
// RASTREAMENTO DE TRÁFEGO (ANALYTICS)
// ==========================================================
const TRACK_URL = 'https://ka-voice-backend.onrender.com/widget/track';

// 1. Registra que a página foi carregada (Pageview)
fetch(TRACK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        client_id: CONFIG.clientId,
        event_type: 'pageview',
        url: window.location.href
    })
}).catch(() => {});

// 2. Registra quando o usuário abre o chat do widget
document.addEventListener('click', function(e) {
    if (e.target.closest('#ka-vox-button') || e.target.closest('#ka-vox-chat')) {
        if (!sessionStorage.getItem('ka_vox_opened')) {
            fetch(TRACK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: CONFIG.clientId,
                    event_type: 'widget_open',
                    url: window.location.href
                })
            }).catch(() => {});
            sessionStorage.setItem('ka_vox_opened', 'true');
        }
    }
});
// ==========================================================

var BRAND = {
  brand_name: 'Assistente Virtual',
  accent_color: '#FFD400',
  tooltip_text: '💬 Fale ou digite para nossa assistente',
  greeting: '',
  position: 'right'
};

function textColorFor(hex) {
  var c = (hex || '#FFD400').replace('#', '');
  if (c.length < 6) return '#000';
  var r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  return (0.299*r + 0.587*g + 0.114*b) > 150 ? '#000' : '#fff';
}
var kaIsListening = false, kaIsPlaying = false, kaRecognizer = null, kaAudioUrl = null;

function initWidget() {
  var accent = BRAND.accent_color || '#FFD400';
  var accentText = textColorFor(accent);
  var isLeft = BRAND.position === 'left';
  var pos = isLeft ? 'left:24px;' : 'right:24px;';
  var align = isLeft ? 'flex-start' : 'flex-end';

  var html = '<div id="ka-widget" style="position:fixed;bottom:24px;' + pos + 'z-index:99999;font-family:Inter,sans-serif;">'
  + '<div id="ka-chat" style="display:none;background:#111;color:#fff;padding:16px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #333;width:320px;max-height:450px;overflow:hidden;margin-bottom:12px;flex-direction:column;">'
  + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid #333;padding-bottom:8px;">'
  + '<span style="font-size:13px;font-weight:700;color:' + accent + ';">' + (BRAND.brand_name || 'Assistente') + '</span>'
  + '<button id="ka-close-btn" style="background:none;border:none;color:#888;cursor:pointer;font-size:18px;padding:0;line-height:1;">\u2715</button>'
  + '</div>'
  + '<div id="ka-messages" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;overflow-y:auto;flex:1;max-height:280px;"></div>'
  + '<div id="ka-status" style="display:none;font-size:12px;color:#aaa;margin-bottom:8px;text-align:center;"></div>'
  + '<div style="display:flex;gap:8px;align-items:center;">'
  + '<input type="text" id="ka-text-input" placeholder="Digite sua mensagem..." style="flex:1;background:#222;border:1px solid #444;color:#fff;padding:10px;border-radius:8px;font-size:13px;outline:none;">'
  + '<button id="ka-mic-btn" style="width:38px;height:38px;border-radius:50%;border:none;cursor:pointer;background:#333;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">\ud83c\udf99</button>'
  + '<button id="ka-send-btn" style="background:' + accent + ';color:' + accentText + ';border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;flex-shrink:0;">\u27a4</button>'
  + '</div>'
  + '<button id="ka-play-btn" style="display:none;background:#10b981;color:#fff;padding:8px 16px;border-radius:20px;border:none;cursor:pointer;font-size:12px;font-weight:600;margin-top:8px;width:100%;">\u25b6 Ouvir resposta</button>'
  + '</div>'
  + '<button id="ka-toggle-btn" style="width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;background:' + accent + ';color:' + accentText + ';display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,0.3);font-size:28px;transition:transform 0.2s;">\ud83d\udcac</button>'
  + '</div><audio id="ka-audio" style="display:none;"></audio>';

  document.body.insertAdjacentHTML('beforeend', html);
  // === TOGGLE CHAT ===
  var toggleBtn = document.getElementById('ka-toggle-btn');
  var chatBox = document.getElementById('ka-chat');
  var closeBtn = document.getElementById('ka-close-btn');
  function kaOpenChat() {
    chatBox.style.display = 'flex';
    toggleBtn.textContent = '\u2715';
    toggleBtn.style.transform = 'rotate(90deg)';
    setTimeout(function(){ var inp = document.getElementById('ka-text-input'); if(inp) inp.focus(); }, 100);
  }
  function kaCloseChat() {
    chatBox.style.display = 'none';
    toggleBtn.textContent = '\ud83d\udcac';
    toggleBtn.style.transform = 'rotate(0deg)';
  }
  toggleBtn.addEventListener('click', function() {
    if (chatBox.style.display === 'flex') { kaCloseChat(); } else { kaOpenChat(); }
  });
  if (closeBtn) closeBtn.addEventListener('click', kaCloseChat);
  toggleBtn.title = BRAND.tooltip_text || 'Fale conosco';


  var link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  if (BRAND.greeting) {
    setTimeout(function() { kaAddMsg('assistant', BRAND.greeting); }, 600);
  }

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
        if (b) { b.style.background = BRAND.accent_color; b.innerText = '🎙️'; }
      }
      kaSendMessage(transcript);
    };
    kaRecognizer.onerror = function(event) {
      console.error('Erro de voz:', event.error);
      if (kaIsListening) {
        try { kaRecognizer.stop(); } catch(e) {}
        kaIsListening = false;
        var b = document.getElementById('ka-mic-btn');
        if (b) { b.style.background = BRAND.accent_color; b.innerText = '🎙️'; }
      }
      if (event.error === 'not-allowed') kaAddMsg('assistant', 'Permita o acesso ao microfone.');
    };
    kaRecognizer.onend = function() {
      if (kaIsListening) {
        kaIsListening = false;
        var b = document.getElementById('ka-mic-btn');
        if (b) { b.style.background = BRAND.accent_color; b.innerText = '🎙️'; }
      }
    };
  }

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
  console.log('🎉 KA Widget v4.0 Finalizado! Marca:', BRAND.brand_name, '| Cor:', BRAND.accent_color);
}

function getChatHistory() {
  var msgs = document.getElementById('ka-messages');
  if (!msgs) return [];
  var children = msgs.children, history = [];
  var start = Math.max(0, children.length - 6);
  for (var i = start; i < children.length; i++) {
    var div = children[i], text = div.innerText.trim();
    if (!text) continue;
    history.push({ role: div.getAttribute('data-role') || 'user', content: text });
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
  div.setAttribute('data-role', role);
  var accent = BRAND.accent_color || '#FFD400';
  div.style.cssText = role === 'user'
    ? 'background:' + accent + ';color:' + textColorFor(accent) + ';padding:10px 14px;border-radius:12px 12px 0 12px;align-self:flex-end;max-width:85%;font-size:13px;font-weight:500;'
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
  var payload = { message: text, client_id: CONFIG.clientId, history: getChatHistory() };
  fetch(CONFIG.apiUrl + '/api/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function(res) { if (!res.ok) throw new Error('Erro ' + res.status); return res.json(); })
  .then(function(data) {
    kaAddMsg('assistant', data.response);
    if (data.audio_base64) { kaAudioUrl = 'data:audio/mp3;base64,' + data.audio_base64; kaPlayAudio(); }
  })
  .catch(function(err) { console.error(err); kaAddMsg('assistant', 'Erro de conexão. Tente novamente.'); });
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
  if (kaIsPlaying) { audio.pause(); audio.currentTime = 0; kaIsPlaying = false; playBtn.innerText = '▶️ Ouvir'; return; }
  audio.src = kaAudioUrl;
  audio.play().then(function() { kaIsPlaying = true; playBtn.style.display = 'block'; playBtn.innerText = '⏹️ Parar'; })
  .catch(function(e) { console.error(e); playBtn.innerText = '▶️ Ouvir'; });
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
      btn.style.background = BRAND.accent_color;
      btn.innerText = '🎙️';
      setTimeout(function() {
        try { kaRecognizer.start(); kaIsListening = true; btn.style.background = '#ef4444'; btn.innerText = '⏹️'; } catch(e2) {}
      }, 200);
    }
  } else {
    try { kaRecognizer.stop(); } catch(e) {}
    kaIsListening = false;
    btn.style.background = BRAND.accent_color;
    btn.innerText = '🎙️';
    var s = document.getElementById('ka-status');
    if (s) s.style.display = 'none';
  }
}

// Busca branding e inicializa (com fallback para defaults)
fetch(CONFIG.apiUrl + '/widget/config/' + CONFIG.clientId)
  .then(function(r) { return r.json(); })
  .then(function(cfg) { BRAND = cfg; initWidget(); })
  .catch(function() { console.warn('Branding indisponível, usando padrões'); initWidget(); });
})();
