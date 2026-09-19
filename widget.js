function textColorFor(hex) {
  hex = hex.replace('#', '');
  var r = parseInt(hex.substring(0, 2), 16);
  var g = parseInt(hex.substring(2, 4), 16);
  var b = parseInt(hex.substring(4, 6), 16);
  var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

function initWidget() {
  var accent = BRAND.accent_color || '#FFD400';
  var accentText = textColorFor(accent);
  var isLeft = BRAND.position === 'left';
  var pos = isLeft ? 'left:24px;' : 'right:24px;';

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

  // === INJEÇÃO SEGURA DO AVATAR ===
  injectAvatarSafely();
  // ================================

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

// ===== AVATAR DO ASSISTENTE (Injeção Segura) =====
(function() {
  if (!document.getElementById('ka-avatar-style')) {
    const style = document.createElement('style');
    style.id = 'ka-avatar-style';
    style.textContent = `
      .ka-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        border: 2px solid var(--ka-color, #6366f1);
        overflow: hidden; flex-shrink: 0; background: #1a1a1a;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
      .ka-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .ka-avatar.speaking {
        animation: ka-pulse 1.2s ease-in-out infinite;
        border-color: #10b981;
        box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
      }
      @keyframes ka-pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
        50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(16, 185, 129, 0.6); }
      }
      .ka-avatar-placeholder { font-size: 20px; }
    `;
    document.head.appendChild(style);
  }
})();

function renderAvatar(config) {
  const avatarUrl = (config && (config.avatar_url || config.logo_url)) || '';
  if (avatarUrl) {
    return '<div class="ka-avatar" id="ka-avatar"><img src="' + avatarUrl + '" onerror="this.parentElement.innerHTML=\'<span class=ka-avatar-placeholder>🤖</span>\'"></div>';
  }
  return '<div class="ka-avatar" id="ka-avatar"><span class="ka-avatar-placeholder">🤖</span></div>';
}

function setAvatarSpeaking(isSpeaking) {
  const avatar = document.getElementById('ka-avatar');
  if (avatar) {
    if (isSpeaking) avatar.classList.add('speaking');
    else avatar.classList.remove('speaking');
  }
}

function injectAvatarSafely() {
  var kaHeader = document.querySelector('#ka-chat > div:first-child');
  if (kaHeader && typeof BRAND !== 'undefined') {
    var brandSpan = kaHeader.querySelector('span');
    if (brandSpan) {
      var avatarHTML = renderAvatar(BRAND);
      var wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '10px';
      wrapper.innerHTML = avatarHTML + brandSpan.outerHTML;
      brandSpan.replaceWith(wrapper);
    }
  }
}
// ===== FIM DO AVATAR =====

// Busca branding e inicializa (com fallback para defaults)
fetch(CONFIG.apiUrl + '/widget/config/' + CONFIG.clientId)
  .then(function(r) { return r.json(); })
  .then(function(cfg) { BRAND = cfg; initWidget(); })
  .catch(function() { console.warn('Branding indisponível, usando padrões'); initWidget(); });
})();
// ==========================================================
// PATCH SEGURO DO AVATAR (Não altera o código original)
// ==========================================================
(function() {
  // 1. Injeta o CSS do avatar de forma isolada
  var style = document.createElement('style');
  style.innerHTML = '.ka-avatar-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; margin-right: 8px; border: 2px solid #FFD400; vertical-align: middle; }';
  document.head.appendChild(style);

  // 2. Função que busca a imagem e a coloca no cabeçalho
  window.kaInjectAvatar = function() {
    if (!window.BRAND) return;
    var imgUrl = window.BRAND.logo_url || window.BRAND.avatar_url;
    if (!imgUrl) return; // Se não tiver imagem, não faz nada

    var header = document.querySelector('#ka-chat > div:first-child');
    if (header && !header.querySelector('.ka-avatar-img')) {
      var img = document.createElement('img');
      img.src = imgUrl;
      img.className = 'ka-avatar-img';
      img.alt = 'Avatar';
      // Insere a imagem antes do nome da marca
      header.insertBefore(img, header.firstChild);
    }
  };

  // 3. "Intercepta" a função original de abrir o chat para injetar o avatar
  var originalOpen = window.kaOpenChat;
  if (typeof originalOpen === 'function') {
    window.kaOpenChat = function() {
      originalOpen(); // Chama o código original que já funciona
      setTimeout(window.kaInjectAvatar, 50); // Injeta o avatar 50ms depois
    };
  }
})();
// ==========================================================
