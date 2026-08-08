# VPS Setup Guide: PDF Tools & AI Chat Dual Python Services

DrawnDimension uses **PM2** and **Nginx** to run 3 background services on your VPS:
1. **Node API** (`port 4000`)
2. **AI Chat Assistant Python API** (`port 8000`)
3. **PDF Tools Suite Python API** (`port 8001`)

---

## 🛠️ Step-by-Step VPS Setup Commands

### 1. Install Linux PDF System Dependencies (`poppler-utils`)
Connect to your VPS via SSH and run:
```bash
sudo apt update
sudo apt install -y poppler-utils python3-pip python3-venv
```

### 2. Install PDF Tools Dependencies inside Virtualenv
Navigate to your app directory on VPS and install requirements:
```bash
cd /opt/drawndimension/app
source server/.venv/bin/activate
pip install -r pdf-tools/requirements.txt
```

### 3. Start PDF Tools Service with PM2
Reload your PM2 services using the updated `ecosystem.config.cjs`:
```bash
cd /opt/drawndimension/app
pm2 restart deploy/vps/ecosystem.config.cjs --env production
pm2 save
```

Check PM2 status to confirm all 3 services are online:
```bash
pm2 status
```
*(You will see `drawndimension-node-api`, `drawndimension-chat-api`, and `drawndimension-pdf-tools` running cleanly!)*

---

## 🌐 Nginx Subdomain / Reverse Proxy Setup (Optional)

If you want PDF Tools accessible on `tools.drawndimension.com`:

1. Create `/etc/nginx/sites-available/tools.drawndimension.com`:
```nginx
server {
    listen 80;
    server_name tools.drawndimension.com;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

2. Enable & Issue SSL Certificate:
```bash
sudo ln -s /etc/nginx/sites-available/tools.drawndimension.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d tools.drawndimension.com
```
