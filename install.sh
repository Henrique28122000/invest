#!/bin/bash
set -e

APP_NAME="investor-api"
APP_DIR="/opt/investor-api"
SERVICE="/etc/systemd/system/${APP_NAME}.service"
REPO_URL="https://raw.githubusercontent.com/Henrique28122000/invest/refs/heads/main/index.js"

echo "🚀 Instalando Investor API…"

# 1) Verifica root
if [ "$EUID" -ne 0 ]; then
  echo "⚠️ Execute como root: sudo ./install.sh"
  exit 1
fi

# 2) Atualiza pacotes
apt update -y
apt install -y curl ca-certificates gnupg

# 3) Instala Node.js se não existir
if ! command -v node > /dev/null; then
  echo "📦 Instalando Node.js LTS…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

# 4) Cria pasta da API
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# 5) Baixa o index.js
echo "📥 Baixando código da API…"
curl -sSL "$REPO_URL" -o index.js

# 6) Cria package.json (se não existir)
if [ ! -f package.json ]; then
  echo "📦 Criando package.json…"
  cat > package.json <<EOF
{
  "name": "investor-api",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}
EOF
fi

# 7) Instala dependências
echo "📌 Instalando dependências…"
npm install express axios cheerio

# 8) Cria serviço systemd
echo "🔧 Criando serviço systemd…"
cat > "$SERVICE" <<EOF
[Unit]
Description=Investor API
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 9) Ativa e inicia
systemctl daemon-reload
systemctl enable "$APP_NAME"
systemctl restart "$APP_NAME"

echo "✅ Investor API instalada!"
echo "📍 Servindo em http://localhost:3000"
echo "🔎 Ver logs: journalctl -u $APP_NAME -f"
