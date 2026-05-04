# DrawnDimension

Production deploy and day-to-day publish guide for the DrawnDimension website.

## Stack

- Frontend: Vite + React + TypeScript
- Node API: `server-node`
- Chat/API service: `server`
- Process manager: PM2
- Web server: Nginx
- Database: PostgreSQL on VPS
- Media storage: `/opt/drawndimension/media`

## Production

- Server: `root@63.250.47.127`
- Website: `https://www.drawndimension.com`
- API: `https://api.drawndimension.com`
- Chat API: `https://chat.drawndimension.com`

## Important Paths

- App root: `/opt/drawndimension/app`
- Frontend live files: `/var/www/vhosts/drawndimension.com/public_html`
- Media root: `/opt/drawndimension/media`
- Node env: `/opt/drawndimension/app/server-node/.env`
- Chat env: `/opt/drawndimension/app/server/.env`

## Frontend Env

Use [`.env.production.vps`](c:/DrawnDimension/.env.production.vps) for VPS frontend builds.

Expected values:

```env
VITE_API_BASE_URL=https://api.drawndimension.com
VITE_CHAT_API_BASE_URL=https://chat.drawndimension.com
VITE_GOOGLE_CLIENT_ID=587021367202-3enh0k12b9ej0h6tjgtd7llbbjf4egk9.apps.googleusercontent.com
```

## Local Development

Frontend:

```powershell
cd C:\DrawnDimension
npm install
npm run dev
```

Node API:

```powershell
cd C:\DrawnDimension\server-node
npm install
npm run dev
```

Chat API:

```powershell
cd C:\DrawnDimension\server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Frontend Only Deploy

Use this when you only changed files under `src`, `public`, `index.html`, or frontend env.

### Step 1. Build locally

```powershell
cd C:\DrawnDimension
npm run build
```

### Step 2. Upload `dist`

Simple way:

```powershell
scp -r .\dist root@63.250.47.127:/root/
```

If connection drops often, zip first:

```powershell
cd C:\DrawnDimension
tar.exe -a -c -f frontend-dist.zip dist
scp -C .\frontend-dist.zip root@63.250.47.127:/root/
```

Then on the VPS:

```bash
cd /root
unzip -oq frontend-dist.zip -d /
```

### Step 3. Publish on VPS

```bash
mkdir -p /var/www/vhosts/drawndimension.com/public_html
rm -rf /var/www/vhosts/drawndimension.com/public_html/*
cp -r /root/dist/. /var/www/vhosts/drawndimension.com/public_html/
chown -R nginx:nginx /var/www/vhosts/drawndimension.com/public_html
nginx -t
systemctl reload nginx
```

### Step 4. Verify

```bash
curl -I https://www.drawndimension.com/
curl -I https://drawndimension.com/
curl -I https://www.drawndimension.com/media/cms-uploads/0.49357286088052577.jpg
```

For SEO, `https://www.drawndimension.com` is the canonical website host. The apex host `https://drawndimension.com` must return a `301` redirect to the matching `www` URL. Use [`deploy/vps/nginx/drawndimension.com.conf`](c:/DrawnDimension/deploy/vps/nginx/drawndimension.com.conf) as the frontend Nginx reference config, then reload Nginx and recheck both URLs.

## Node Backend Deploy

Use this when you changed `server-node`.

### Step 1. Upload code

```powershell
cd C:\DrawnDimension
scp -r .\server-node root@63.250.47.127:/opt/drawndimension/app/
```

### Step 2. Build and restart

```bash
cd /opt/drawndimension/app/server-node
npm install
npm run build
pm2 restart drawndimension-node-api --update-env
sleep 3
curl http://127.0.0.1:4000/health
curl https://api.drawndimension.com/health
```

## Chat Backend Deploy

Use this when you changed `server`.

### Step 1. Upload code

```powershell
cd C:\DrawnDimension
scp -r .\server root@63.250.47.127:/opt/drawndimension/app/
```

### Step 2. Install and restart

```bash
cd /opt/drawndimension/app/server
rm -rf .venv
python3.11 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
deactivate

cd /opt/drawndimension/app
pm2 restart drawndimension-chat-api --update-env
sleep 3
curl http://127.0.0.1:8000/api/health
curl https://chat.drawndimension.com/api/health
```

## Full App Upload Using One Zip

Use this when connection is unstable or when you want to upload `deploy`, `server`, `server-node`, and `dist` together.

### Step 1. Create bundle locally

```powershell
cd C:\DrawnDimension
tar.exe -a -c -f namecheap_full_bundle.zip `
  --exclude "server/.venv" `
  --exclude "server/.env" `
  --exclude "server-node/node_modules" `
  --exclude "server-node/.env" `
  --exclude "server-node/dist" `
  deploy server server-node dist
```

### Step 2. Upload

```powershell
scp -C .\namecheap_full_bundle.zip root@63.250.47.127:/root/
```

### Step 3. Extract on VPS

```bash
mkdir -p /opt/drawndimension/app
unzip -oq /root/namecheap_full_bundle.zip -d /opt/drawndimension/app
```

### Step 4. Rebuild and restart

```bash
cd /opt/drawndimension/app/server-node
npm install
npm run build

cd /opt/drawndimension/app/server
rm -rf .venv
python3.11 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
deactivate

cd /opt/drawndimension/app
pm2 restart drawndimension-node-api --update-env
pm2 restart drawndimension-chat-api --update-env
pm2 save
```

## PM2 Commands

Check:

```bash
pm2 status
```

Restart one:

```bash
pm2 restart drawndimension-node-api --update-env
pm2 restart drawndimension-chat-api --update-env
```

Restart all:

```bash
pm2 restart all --update-env
```

Logs:

```bash
pm2 logs drawndimension-node-api --lines 50
pm2 logs drawndimension-chat-api --lines 50
```

Persist after reboot:

```bash
pm2 save
pm2 startup
```

## Health Checks

Local on VPS:

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:8000/api/health
```

Public:

```bash
curl https://api.drawndimension.com/health
curl https://chat.drawndimension.com/api/health
```

## Environment Changes

If you only changed `.env`:

```bash
pm2 restart drawndimension-node-api --update-env
pm2 restart drawndimension-chat-api --update-env
```

Current important CORS values:

Node API:

```env
CORS_ORIGIN=https://drawndimension.com,https://www.drawndimension.com,https://api.drawndimension.com,http://localhost:8080,http://127.0.0.1:8080
```

Chat API:

```env
CORS_ORIGINS=https://drawndimension.com,https://www.drawndimension.com,https://api.drawndimension.com,https://chat.drawndimension.com,http://localhost:8080,http://127.0.0.1:8080
```

## Database Backup

```bash
mkdir -p /root/backups
PGPASSWORD='DrawnDB2026Safe_91' pg_dump -h 127.0.0.1 -U drawndimension_app -d drawndimension_db -Fc -f /root/backups/drawndimension_$(date +%F).dump
```

## Media Backup

```bash
cd /opt/drawndimension
zip -r /root/backups/media_$(date +%F).zip media
```

## Quick Smoke Test

After a deploy, test:

1. Homepage loads
2. Google login works
3. Dashboard opens
4. CMS login works
5. World map loads
6. Portfolio/work images load
7. Live chat works
8. AI chatbot works
9. Employee dashboard works
10. Uploads/media open correctly

## Notes

- Main production runtime is now VPS-based: frontend, Node API, chat API, PostgreSQL, and media.
- Old Supabase-style names may still exist in a few helper files, but production traffic is routed through the VPS stack.
- If a browser page says `Failed to fetch` while server-side `curl` works, check CORS first.



scp -r .\dist root@63.250.47.127:/root/
S3yv9YFL1Qa99xYfb0

mkdir -p /var/www/vhosts/drawndimension.com/public_html
rm -rf /var/www/vhosts/drawndimension.com/public_html/*
cp -r /root/dist/. /var/www/vhosts/drawndimension.com/public_html/
chown -R nginx:nginx /var/www/vhosts/drawndimension.com/public_html
nginx -t
systemctl reload nginx



cd C:\DrawnDimension; npm run build; if (Test-Path .\website-dist.zip) { Remove-Item .\website-dist.zip -Force }; if (Test-Path .\server-node.zip) { Remove-Item .\server-node.zip -Force }; Compress-Archive -Path .\dist\* -DestinationPath .\website-dist.zip -Force; Compress-Archive -Path .\server-node\* -DestinationPath .\server-node.zip -Force; scp .\website-dist.zip .\server-node.zip root@63.250.47.127:/tmp/





ssh root@63.250.47.127
cd /var/www/vhosts/drawndimension.com
mv public_html public_html_backup_$(date +%F_%H-%M-%S)
mkdir public_html
unzip -o /tmp/website-dist.zip -d public_html
cd /opt/drawndimension/app
cp -r server-node server-node_safe_backup_$(date +%F_%H-%M-%S)
mv server-node server-node_prev_$(date +%F_%H-%M-%S)
unzip -o /tmp/server-node.zip -d /opt/drawndimension/app
cd /opt/drawndimension/app/server-node
npm install
node ./node_modules/typescript/lib/tsc.js -p tsconfig.json
pm2 restart drawndimension-node-api --update-env
curl http://127.0.0.1:4000/health
curl https://api.drawndimension.com/health
nginx -t
systemctl reload nginx

## Recommended Quick Deploy Guide

Use these quick rules:

- Use `Frontend only deploy` when you changed only `src`, `public`, `index.html`, Vite/frontend env, or UI text/styles.
- Use `Backend only deploy` when you changed only `server-node`.
- Use `Full deploy` when both frontend and `server-node` changed in the same release.
- Do not deploy both sides together unless you actually changed both. It adds unnecessary risk.

### Frontend Only Deploy

Use this when only the website UI changed.

Local:

```powershell
cd C:\DrawnDimension
npm run build
if (Test-Path .\website-dist.zip) { Remove-Item .\website-dist.zip -Force }
Compress-Archive -Path .\dist\* -DestinationPath .\website-dist.zip -Force
scp .\website-dist.zip root@63.250.47.127:/tmp/
```

VPS:

```bash
cd /var/www/vhosts/drawndimension.com
mv public_html public_html_backup_$(date +%F_%H-%M-%S)
mkdir public_html
unzip -o /tmp/website-dist.zip -d public_html
chown -R nginx:nginx public_html
curl -I https://www.drawndimension.com/
curl -I https://www.drawndimension.com/
curl -I https://drawndimension.com/
```

### Backend Only Deploy

Use this when only `server-node` changed.

Local:

```powershell
cd C:\DrawnDimension
if (Test-Path .\server-node.zip) { Remove-Item .\server-node.zip -Force }
tar.exe -a -c -f server-node.zip `
  --exclude "server-node/node_modules" `
  --exclude "server-node/dist" `
  --exclude "server-node/.env" `
  server-node
scp .\server-node.zip root@63.250.47.127:/tmp/
```

VPS:

```bash
cd /opt/drawndimension/app
cp -r server-node server-node_safe_backup_$(date +%F_%H-%M-%S)
mv server-node server-node_prev_$(date +%F_%H-%M-%S)
unzip -o /tmp/server-node.zip -d /opt/drawndimension/app
cd /opt/drawndimension/app/server-node
npm install
node ./node_modules/typescript/lib/tsc.js -p tsconfig.json
pm2 restart drawndimension-node-api --update-env
curl http://127.0.0.1:4000/health
curl https://api.drawndimension.com/health
```

### Full Deploy

Use this when both frontend and `server-node` changed.

Local:

```powershell
cd C:\DrawnDimension
npm run build
if (Test-Path .\website-dist.zip) { Remove-Item .\website-dist.zip -Force }
if (Test-Path .\server-node.zip) { Remove-Item .\server-node.zip -Force }
Compress-Archive -Path .\dist\* -DestinationPath .\website-dist.zip -Force
tar.exe -a -c -f server-node.zip `
  --exclude "server-node/node_modules" `
  --exclude "server-node/dist" `
  --exclude "server-node/.env" `
  --exclude "server-node/data" `
  server-node
scp .\website-dist.zip .\server-node.zip root@63.250.47.127:/tmp/
```

VPS:

```bash
cd /var/www/vhosts/drawndimension.com
mv public_html public_html_backup_$(date +%F_%H-%M-%S)
mkdir public_html
unzip -o /tmp/website-dist.zip -d public_html
chown -R nginx:nginx public_html

cd /opt/drawndimension/app
BACKUP_DIR="server-node_safe_backup_$(date +%F_%H-%M-%S)"
PREV_DIR="server-node_prev_$(date +%F_%H-%M-%S)"
cp -r server-node "$BACKUP_DIR"
mv server-node "$PREV_DIR"
unzip -o /tmp/server-node.zip -d /opt/drawndimension/app
cp "$PREV_DIR/.env" server-node/.env
mkdir -p server-node/data
cp -a "$PREV_DIR/data/." server-node/data/
cd /opt/drawndimension/app/server-node
npm install
node ./node_modules/typescript/lib/tsc.js -p tsconfig.json
pm2 restart drawndimension-node-api --update-env
sleep 3
curl http://127.0.0.1:4000/health
curl https://api.drawndimension.com/health
curl -I https://drawndimension.com/
```

The `.env` and `data/` restore lines are important. They preserve live CMS-backed JSON data such as home hero cards, hero software strip, trusted logos, header/footer settings, service FAQs, and service blogs during backend replacement.

### Important Note About Backend Zip

For backend deploy, zip the `server-node` folder itself, not `server-node\*`.

Correct:

```powershell
tar.exe -a -c -f server-node.zip server-node
```

Wrong:

```powershell
Compress-Archive -Path .\server-node\* -DestinationPath .\server-node.zip -Force
```

The wrong version extracts files directly into `/opt/drawndimension/app` instead of `/opt/drawndimension/app/server-node`.






mkdir -p /var/www/vhosts/drawndimension.com/public_html
rm -rf /var/www/vhosts/drawndimension.com/public_html/*
cp -r /root/dist/. /var/www/vhosts/drawndimension.com/public_html/
chown -R nginx:nginx /var/www/vhosts/drawndimension.com/public_html
nginx -t
systemctl reload nginx
