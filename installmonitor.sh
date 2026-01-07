#!/bin/bash

echo "🚀 Iniciando instalação do Monitor de Investimentos"

# ===============================
# VARIÁVEIS
# ===============================
APP_DIR="/opt/invest-monitor"
APP_NAME="invest-monitor"
JS_URL="https://raw.githubusercontent.com/Henrique28122000/invest/refs/heads/main/monitor.js"

# ===============================
# ATUALIZA SISTEMA
# ===============================
sudo apt update -y

# ===============================
# INSTALA NODE.JS (LTS)
# ===============================
if ! command -v node >/dev/null 2>&1; then
  echo "📦 Instalando Node.js LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

# ===============================
# INSTALA PM2
# ===============================
if ! command -v pm2 >/dev/null 2>&1; then
  echo "📦 Instalando PM2..."
  sudo npm install -g pm2
fi

# ===============================
# CRIA DIRETÓRIO DO APP
# ===============================
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR
cd $APP_DIR

# ===============================
# BAIXA SCRIPT
# ===============================
echo "⬇️ Baixando monitor.js..."
curl -o monitor.js $JS_URL

# ===============================
# CRIA package.json (se não existir)
# ===============================
if [ ! -f package.json ]; then
cat <<EOF > package.json
{
  "name": "invest-monitor",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "axios": "^1.6.0"
  }
}
EOF
fi

# ===============================
# INSTALA DEPENDÊNCIAS
# ===============================
echo "📦 Instalando dependências..."
npm install

# ===============================
# INICIA COM PM2
# ===============================
echo "▶️ Iniciando serviço..."
pm2 start monitor.js --name $APP_NAME
pm2 save
pm2 startup | bash

# ===============================
# STATUS
# ===============================
echo "✅ Monitor rodando 24h com sucesso!"
pm2 status
