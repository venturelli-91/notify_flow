# 🚀 Deployment Guide — NotifyFlow

Production-ready deployment strategies for NotifyFlow.

## Local Development

See [QUICKSTART.md](../QUICKSTART.md) for local setup.

---

## Option 1: Vercel (Easiest)

**Pros:** Free tier available, built for Next.js, automatic deployments
**Cons:** Serverless functions have cold start delays

### Steps

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Visit https://vercel.com/import
   - Select your NotifyFlow repository
   - Click "Deploy"

3. **Configure Environment Variables**
   In Vercel dashboard → Settings → Environment Variables:
   ```
   DATABASE_URL=postgresql://user:pass@neon.tech/notifyflow
   REDIS_URL=rediss://default:token@upstash.redis.io:6380
   NEXTAUTH_SECRET=your-32-char-secret
   NODE_ENV=production
   TRUSTED_PROXY_IPS=34.120.0.0/10,35.184.0.0/13
   ```

4. **Setup Database (Neon)**
   - Create account at https://neon.tech
   - Copy PostgreSQL connection string
   - Paste into `DATABASE_URL`
   - Run migrations: `npm run db:push`

5. **Setup Redis (Upstash)**
   - Create account at https://upstash.com
   - Create Redis database
   - Copy connection string
   - Paste into `REDIS_URL` (use `rediss://` for TLS)

6. **Deploy Worker as a Cron Job**
   - Vercel doesn't support long-running processes
   - Option A: Use a separate service (see Railway below)
   - Option B: Use Vercel Cron + trigger job processing
   - Option C: Use managed queue service (Bull Cloud)

### Limitations
- ⚠️ Worker can't run continuously on Vercel
- Consider separate worker deployment on Railway/Render

---

## Option 2: Railway (Recommended)

**Pros:** Easy Docker deployment, great for full-stack apps, free credits
**Cons:** Paid after free tier

### Steps

1. **Create Railway Account**
   - Visit https://railway.app
   - Sign in with GitHub

2. **Create New Project**
   - Select "Deploy from GitHub"
   - Select `notify_flow` repository
   - Select `main` branch

3. **Add PostgreSQL**
   - Click "Add Services" → "PostgreSQL"
   - Railway auto-provides `DATABASE_URL`

4. **Add Redis**
   - Click "Add Services" → "Redis"
   - Railway auto-provides `REDIS_URL`

5. **Configure Environment Variables**
   In Railway dashboard → Variables:
   ```
   NEXTAUTH_SECRET=your-32-char-secret
   NODE_ENV=production
   TRUSTED_PROXY_IPS=<railway-egress-ip>
   ```

6. **Run Migrations**
   - In Railway "Connect" tab → "Shell"
   - Run: `npm run db:push && npm run db:seed`

7. **Deploy Application**
   - Railway auto-deploys on git push
   - View logs: Dashboard → "Deployments"

8. **Deploy Worker**
   - Add another service with same repo
   - Change start command to: `npm run worker`
   - Ensure it has access to same DATABASE_URL + REDIS_URL

### Cost Estimate
- App dyno: ~$5/month
- Worker dyno: ~$5/month
- PostgreSQL: ~$15/month
- Redis: ~$5/month
- **Total:** ~$30/month

---

## Option 3: Self-Hosted (Full Control)

For VPS (DigitalOcean, AWS EC2, Hetzner)

### Prerequisites
- Ubuntu 22.04+ server
- Docker + Docker Compose
- Domain name with DNS

### Steps

1. **SSH into Server**
   ```bash
   ssh root@your-server-ip
   ```

2. **Install Dependencies**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   newgrp docker

   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
   sudo apt install -y nodejs git
   ```

3. **Clone Repository**
   ```bash
   cd /opt
   git clone https://github.com/venturelli-91/notify_flow.git
   cd notify_flow
   ```

4. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   nano .env
   ```

5. **Start Services**
   ```bash
   docker compose up -d
   npm install
   npm run db:push
   npm run db:seed
   ```

6. **Start App + Worker**
   ```bash
   # Terminal 1: Node app
   npm run dev

   # Terminal 2: Worker (keep running)
   npm run worker
   ```

   Or use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start "npm run dev" --name app
   pm2 start "npm run worker" --name worker
   pm2 save
   ```

7. **Setup Nginx Reverse Proxy**
   ```nginx
   server {
       listen 80;
       server_name notify.youromain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

8. **Enable HTTPS (Let's Encrypt)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d notify.yourdomain.com
   ```

---

## Environment Variables for Production

```bash
# Database (required)
DATABASE_URL=postgresql://user:pass@host:5432/notifyflow

# Redis (required)
REDIS_URL=redis://host:6379
# or with TLS: rediss://token@host:6380

# Authentication (required)
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# Email channel (optional, leave blank to disable)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx
SMTP_FROM=noreply@yourdomain.com

# Webhook channel (optional)
WEBHOOK_URL=https://your-webhook-endpoint.com
WEBHOOK_SECRET=<your-secret-token>

# Rate limiting
RATE_LIMIT_MAX=20
RATE_LIMIT_WINDOW_S=60

# Network
TRUSTED_PROXY_IPS=<your-proxy-ips>
NODE_ENV=production
```

---

## Monitoring & Alerts

### Health Checks

Add a health endpoint to check system status:

```bash
curl http://your-app.com/api/health
# Returns: { "status": "ok", "database": "connected", "redis": "connected" }
```

### Log Aggregation

- **Railway:** Built-in logs dashboard
- **Vercel:** Built-in logs
- **Self-hosted:** Use ELK stack or Datadog

### Performance Monitoring

- **New Relic:** APM for Node.js
- **Sentry:** Error tracking
- **Datadog:** Full observability

---

## Scaling the Worker

As traffic grows, run multiple worker instances:

```bash
# Worker 1
npm run worker

# Worker 2 (separate process/container)
npm run worker

# Worker 3...
npm run worker
```

BullMQ handles load distribution automatically via Redis.

---

## Database Backups

### Automated Backups (Neon/Railway)
- Both providers offer automatic daily backups
- Retention: 7-30 days depending on plan

### Manual Backup
```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

---

## Disaster Recovery

If database goes down:

```bash
# 1. Restore from backup
psql $NEW_DATABASE_URL < backup.sql

# 2. Update DATABASE_URL in environment
# 3. Redeploy application
# 4. Verify: npm run test:integration
```

---

## Troubleshooting

### Database connection fails
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Worker not processing jobs
```bash
# Check Redis connection
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

### High memory usage
```bash
# Check Node.js memory limit
node --max-old-space-size=512 src/server/workers/notificationWorker.ts
```

### Email not sending
- Verify SMTP credentials
- Check firewall port 587/465
- Review email logs in SMTP dashboard

---

**Need help?** Open an issue on GitHub: https://github.com/venturelli-91/notify_flow/issues
