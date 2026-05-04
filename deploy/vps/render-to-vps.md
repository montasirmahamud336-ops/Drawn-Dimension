# Render to VPS Migration

This repo currently has two backend apps that can be moved from Render to the VPS:

1. `server-node`
   - Express/TypeScript API
   - Suggested public URL: `https://api.drawndimension.com`
   - Local process port: `4000`
   - Health check: `GET /health`

2. `server`
   - FastAPI chat/API service
   - Suggested public URL: `https://chat.drawndimension.com`
   - Local process port: `8000`
   - Health check: `GET /api/health`

The frontend is already serving from the VPS. Do not shut down the Render services until both VPS apps are healthy and the frontend has been rebuilt with the new backend URLs.

If you want to keep Render as an emergency fallback, keep both Render services running and also keep the backup frontend env file at `.env.production.render-backup`.

## Recommended Cutover Order

1. Keep the current Render services running.
2. Point `api.drawndimension.com` to the VPS IP.
3. Create `chat.drawndimension.com` and point it to the VPS IP.
4. Clone or upload this repo to the VPS, for example at `/opt/drawndimension/app`.
5. Install runtimes:
   - Node.js 20+
   - npm
   - Python 3.10+
   - `python3-venv`
   - PM2
6. Build and start the Node API.
7. Create a Python virtual environment and start the FastAPI app.
8. Add the nginx reverse proxy configs from `deploy/vps/nginx/`.
9. Run Certbot for `api.drawndimension.com` and `chat.drawndimension.com`.
10. Update the frontend production env to use the new VPS backend URLs.
11. Rebuild the frontend and redeploy the `dist` output.
12. Verify traffic on the VPS before disabling Render.

## Server Setup

Example runtime install commands on Ubuntu:

```bash
apt update
apt install -y curl git nginx python3 python3-venv python3-pip
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
```

## App Setup

Example repo path:

```bash
mkdir -p /opt/drawndimension
cd /opt/drawndimension
git clone YOUR_REPO_URL app
cd app
```

### Node API

```bash
cd /opt/drawndimension/app/server-node
cp .env.vps.example .env
npm ci
npm run build
```

### Chat API

```bash
cd /opt/drawndimension/app/server
cp .env.vps.example .env
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
deactivate
```

## PM2

From the repo root on the VPS:

```bash
cd /opt/drawndimension/app
pm2 start deploy/vps/ecosystem.config.cjs
pm2 save
pm2 startup
```

Useful commands:

```bash
pm2 status
pm2 logs drawndimension-node-api
pm2 logs drawndimension-chat-api
pm2 restart drawndimension-node-api
pm2 restart drawndimension-chat-api
```

## Nginx

Copy the sample configs:

```bash
cp deploy/vps/nginx/api.drawndimension.com.conf /etc/nginx/sites-available/api.drawndimension.com
cp deploy/vps/nginx/chat.drawndimension.com.conf /etc/nginx/sites-available/chat.drawndimension.com
ln -s /etc/nginx/sites-available/api.drawndimension.com /etc/nginx/sites-enabled/api.drawndimension.com
ln -s /etc/nginx/sites-available/chat.drawndimension.com /etc/nginx/sites-enabled/chat.drawndimension.com
nginx -t
systemctl reload nginx
```

Then issue certificates:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.drawndimension.com -d chat.drawndimension.com
```

## Frontend Env After Cutover

After both VPS backends are healthy, the frontend should use:

```dotenv
VITE_API_BASE_URL=https://api.drawndimension.com
VITE_CHAT_API_BASE_URL=https://chat.drawndimension.com
```

Then rebuild and redeploy the frontend:

```bash
npm run build
```

Backup/rollback reference:

- VPS env file: `.env.production.vps`
- Render backup env file: `.env.production.render-backup`
- Rollback guide: `deploy/render/failover-to-render.md`

## Verification Checklist

Run these on the VPS:

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:8000/api/health
curl -I https://api.drawndimension.com/health
curl -I https://chat.drawndimension.com/api/health
pm2 status
```

Check the browser:

- Website home page loads.
- CMS/admin login works.
- Contact form works.
- Live chat works.
- AI chat works.
- Employee dashboard API requests work.

Only after all of the above pass should the Render services be disabled.
