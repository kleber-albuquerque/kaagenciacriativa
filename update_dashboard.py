import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Adicionar Chart.js
if 'chart.js' not in content:
    content = content.replace('</body>', '  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n</body>')

# 2. Substituir o placeholder da aba Analytics
old_placeholder = '<p style="color:#888;">Em desenvolvimento. Gráficos de performance e métricas de conversão serão adicionados na Fase 3.</p>'
new_analytics_html = """<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
        <div style="background:#1a1a1a; padding:16px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:12px; color:var(--muted); text-transform:uppercase;">Total de Leads</div>
          <div id="ana-total-leads" style="font-size:28px; font-weight:700; color:var(--accent);">-</div>
        </div>
        <div style="background:#1a1a1a; padding:16px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:12px; color:var(--muted); text-transform:uppercase;">Leads (7 dias)</div>
          <div id="ana-leads-7d" style="font-size:28px; font-weight:700; color:#10b981;">-</div>
        </div>
        <div style="background:#1a1a1a; padding:16px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:12px; color:var(--muted); text-transform:uppercase;">Clientes com Leads</div>
          <div id="ana-active-clients" style="font-size:28px; font-weight:700; color:#3b82f6;">-</div>
        </div>
        <div style="background:#1a1a1a; padding:16px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:12px; color:var(--muted); text-transform:uppercase;">Atividade Recente</div>
          <div id="ana-conversion" style="font-size:28px; font-weight:700; color:#f59e0b;">-</div>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap:24px; margin-top:24px;">
        <div style="background:#1a1a1a; padding:16px; border-radius:8px; border:1px solid var(--border);">
          <h3 style="margin-bottom:16px; font-size:16px;">Leads por Cliente (Top 5)</h3>
          <canvas id="chartClients"></canvas>
        </div>
        <div style="background:#1a1a1a; padding:16px; border-radius:8px; border:1px solid var(--border);">
          <h3 style="margin-bottom:16px; font-size:16px;">Leads por Dia (Últimos 14 dias)</h3>
          <canvas id="chartDays"></canvas>
        </div>
      </div>"""

if old_placeholder in content:
    content = content.replace(old_placeholder, new_analytics_html)

# 3. Adicionar a função loadAnalytics antes do </script> final
js_code = """
let chartClientsInstance = null;
let chartDaysInstance = null;

async function loadAnalytics() {
  try {
    const data = await apiCall('/admin/analytics');
    document.getElementById('ana-total-leads').textContent = data.total_leads || 0;
    document.getElementById('ana-leads-7d').textContent = data.leads_7d || 0;
    document.getElementById('ana-active-clients').textContent = data.leads_per_client ? data.leads_per_client.length : 0;
    document.getElementById('ana-conversion').textContent = (data.leads_7d > 0 ? data.leads_7d + ' esta semana' : 'Sem atividade recente');

    if (!data.leads_per_client || !data.leads_per_day) return;

    const ctxClients = document.getElementById('chartClients').getContext('2d');
    if (chartClientsInstance) chartClientsInstance.destroy();
    chartClientsInstance = new Chart(ctxClients, {
      type: 'bar',
      data: {
        labels: data.leads_per_client.map(c => c.client),
        datasets: [{ label: 'Leads', data: data.leads_per_client.map(c => c.total), backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1, borderRadius: 4 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#888' }, grid: { color: '#333' } }, x: { ticks: { color: '#888' }, grid: { display: false } } } }
    });

    const ctxDays = document.getElementById('chartDays').getContext('2d');
    if (chartDaysInstance) chartDaysInstance.destroy();
    chartDaysInstance = new Chart(ctxDays, {
      type: 'line',
      data: {
        labels: data.leads_per_day.map(d => new Date(d.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
        datasets: [{ label: 'Leads', data: data.leads_per_day.map(d => d.total), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#10b981' }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#888' }, grid: { color: '#333' } }, x: { ticks: { color: '#888' }, grid: { display: false } } } }
    });
  } catch (e) { console.error('loadAnalytics:', e); }
}

const originalSwitchTab = window.switchTab;
window.switchTab = function(tab, btn) {
  originalSwitchTab(tab, btn);
  if (tab === 'analytics') loadAnalytics();
  else if (tab === 'financeiro') loadFinance();
  else if (tab === 'sites') loadSites();
};
"""

if 'loadAnalytics' not in content:
    content = content.replace('</script>', js_code + '\n</script>')

with open('dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Dashboard atualizado com sucesso!")
