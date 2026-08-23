import re

# 1. Ler o arquivo original
with open('widget.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 2. Injetar a detecção de iOS/Fallback antes da inicialização do SpeechRecognition
fallback_detection = """// --- KA VOX FALLBACK LOGIC (iOS/No Support) ---
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const hasSpeechSupport = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
const useTextFallback = !hasSpeechSupport || isIOS;

if (useTextFallback) {
    console.log("KA Vox: Ativando modo fallback (Texto) para iOS ou navegador sem suporte.");
    const micBtn = document.getElementById('ka-vox-mic-btn');
    if (micBtn) micBtn.style.display = 'none';
    const textFallback = document.getElementById('ka-vox-text-fallback');
    if (textFallback) textFallback.style.display = 'flex';
} else {
"""

# Substitui o início do bloco original pelo novo bloco com a condição
old_block = "var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;\n  if (SpeechRecognition) {"
new_block = fallback_detection + "  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;\n  if (SpeechRecognition) {"
content = content.replace(old_block, new_block)

# 3. Adicionar a UI e a lógica de envio de texto ao final do arquivo
# NOTA: Usa CONFIG.apiUrl e CONFIG.clientId que já existem no seu código!
fallback_ui_logic = """

// --- KA VOX TEXT FALLBACK UI & LOGIC ---
function injectTextFallback() {
    const fallbackHTML = \`
      <div id="ka-vox-text-fallback" style="display: none; flex-direction: column; gap: 10px; width: 100%; padding: 10px; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <input type="text" id="ka-vox-text-input" placeholder="Digite sua dúvida aqui..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
        <button id="ka-vox-send-btn" style="padding: 10px; background-color: #FFD400; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: #000;">Enviar</button>
        <div style="text-align: center; margin-top: 8px;">
          <a href="https://wa.me/557171717171" target="_blank" style="font-size: 12px; color: #666; text-decoration: none;">Ou fale direto no WhatsApp 💬</a>
        </div>
      </div>
    \`;
    
    const widgetContainer = document.getElementById('ka-vox-widget') || document.body;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fallbackHTML;
    widgetContainer.appendChild(tempDiv.firstChild);

    const sendBtn = document.getElementById('ka-vox-send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            const inputEl = document.getElementById('ka-vox-text-input');
            const userMessage = inputEl.value.trim();
            if (!userMessage) return;

            inputEl.value = '';
            inputEl.disabled = true;
            sendBtn.innerText = 'Enviando...';

            try {
                // Usa as variáveis CONFIG que já existem no seu widget.js
                const response = await fetch(CONFIG.apiUrl + '/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        client_id: CONFIG.clientId, 
                        message: userMessage,
                        is_text_fallback: true 
                    })
                });
                const data = await response.json();
                
                // Tenta usar sua função existente de exibir mensagem, ou cai no alert
                if (typeof addMessageToUI === 'function') {
                    addMessageToUI('ai', data.text || "Desculpe, não entendi.");
                } else if (typeof displayResponse === 'function') {
                    displayResponse(data.text || "Desculpe, não entendi.");
                } else {
                    alert("Assistente: " + (data.text || "Erro ao processar."));
                }
                
            } catch (error) {
                console.error("Erro no fallback:", error);
                alert("Erro ao enviar. Tente pelo WhatsApp.");
            } finally {
                inputEl.disabled = false;
                sendBtn.innerText = 'Enviar';
            }
        });
    }
}
setTimeout(injectTextFallback, 500);
"""

content += fallback_ui_logic

# 4. Salvar o arquivo modificado
with open('widget.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Modificação aplicada com sucesso!")
print("🎯 O script agora usa automaticamente CONFIG.clientId e CONFIG.apiUrl.")
