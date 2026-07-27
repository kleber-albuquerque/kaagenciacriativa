with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

clean_lines = []
for line in lines:
    # Remove qualquer linha que contenha dograh ou ngrok (ignorando maiúsculas/minúsculas)
    if 'dograh' in line.lower() or 'ngrok' in line.lower():
        continue
    clean_lines.append(line)

html = "".join(clean_lines)

widget = """
<!-- Widget de Voz IA da Agência KA -->
<div id="ka-widget" style="position:fixed;bottom:24px;right:24px;z-index:9999;font-family:sans-serif;">
  <div id="ka-status" style="background:#111;color:#fff;padding:8px 12px;border-radius:20px;font-size:12px;margin-bottom:8px;opacity:0;transition:opacity 0.3s;pointer-events:none;">Clique para falar 🎙️</div>
  <button id="ka-btn" onclick="toggleRec()" style="width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;background:#FFD400;color:#000;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
    <span id="ka-icon" style="font-size:24px;">🎙️</span>
  </button>
</div>
<audio id="ka-audio" style="display:none;"></audio>
<script>
  let recorder, chunks = [], isRec = false;
  const API = 'http://localhost:8001/api/voice';
  
  function status(msg) {
    const el = document.getElementById('ka-status');
    el.innerText = msg; el.style.opacity = '1';
    setTimeout(() => { if(!isRec) el.style.opacity = '0'; }, 3000);
  }

  async function toggleRec() {
    const btn = document.getElementById('ka-btn');
    const icon = document.getElementById('ka-icon');
    if (!isRec) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder = new MediaRecorder(stream);
        chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const form = new FormData(); form.append('audio', blob, 'rec.webm');
          status('Processando... ⏳');
          try {
            const res = await fetch(API, { method: 'POST', body: form });
            if (!res.ok) throw new Error('Erro: ' + res.status);
            const audioBlob = await res.blob();
            const audio = document.getElementById('ka-audio');
            audio.src = URL.createObjectURL(audioBlob);
            status('Respondendo... 🔊');
            audio.play();
            audio.onended = () => status('Clique para falar 🎙️');
          } catch (err) {
            status('Erro ao processar');
            console.error(err);
          }
          stream.getTracks().forEach(t => t.stop());
        };
        recorder.start(); isRec = true;
        btn.style.background = '#ef4444'; icon.innerText = '⏹️';
        status('Ouvindo...');
      } catch (e) { status('Erro no mic'); }
    } else {
      recorder.stop(); isRec = false;
      btn.style.background = '#FFD400'; icon.innerText = '🎙️';
    }
  }
</script>
"""

if '</body>' in html:
    html = html.replace('</body>', widget + '\n</body>')
else:
    html += widget

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("✅ Arquivo limpo e atualizado com sucesso!")
