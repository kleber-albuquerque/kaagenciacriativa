import re

# Caminho do arquivo
arquivo = 'index.html'

# Código oficial do Dograh (você vai substituir depois)
CODIGO_DOGRAH = '''<!-- Widget Oficial Dograh -->
<script src="COLE_AQUI_O_SCRIPT_OFICIAL_DO_DOGRAH"></script>'''

# Lê o conteúdo do arquivo
with open(arquivo, 'r', encoding='utf-8') as f:
    conteudo = f.read()

# Remove qualquer bloco de widget anterior (procura pelos comentários marcadores)
# Remove tudo entre "<!-- ====...WIDGET" e o próximo "<!-- ====...-->"
padrao = r'<!--\s*=+\s*-->[\s\S]*?WIDGET[\s\S]*?<!--\s*=+\s*-->'
conteudo_limpo = re.sub(padrao, '', conteudo, flags=re.IGNORECASE)

# Também remove o bloco antigo do ka-voice-btn se existir
padrao2 = r'<!--\s*=+\s*-->[\s\S]*?ka-voice-btn[\s\S]*?<!--\s*=+\s*-->'
conteudo_limpo = re.sub(padrao2, '', conteudo_limpo, flags=re.IGNORECASE)

# Remove qualquer script do widget antigo que tenha DOGRAH_API_URL
padrao3 = r'<script>[\s\S]*?DOGRAH_API_URL[\s\S]*?</script>'
conteudo_limpo = re.sub(padrao3, '', conteudo_limpo, flags=re.IGNORECASE)

# Insere o código do Dograh antes do </body>
if '</body>' in conteudo_limpo:
    conteudo_final = conteudo_limpo.replace('</body>', f'{CODIGO_DOGRAH}\n\n</body>')
else:
    conteudo_final = conteudo_limpo + '\n\n' + CODIGO_DOGRAH

# Salva o arquivo
with open(arquivo, 'w', encoding='utf-8') as f:
    f.write(conteudo_final)

print('✅ Widget antigo removido e espaço preparado para o código oficial do Dograh')
print('📝 Agora edite o arquivo e substitua "COLE_AQUI_O_SCRIPT_OFICIAL_DO_DOGRAH" pelo código real')
