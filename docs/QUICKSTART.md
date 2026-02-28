# 🚀 QuickStart — NotifyFlow

Get the project running in **5 minutes**.

## Prerequisites

- Docker + Docker Compose
- Node.js 18+
- Git

## 1. Clone & Setup

```bash
git clone https://github.com/venturelli-91/notify_flow.git
cd notify_flow
cp .env.example .env
npm install
```

## 2. Start Services

```bash
docker compose up -d
```

Verify all services are running:
```bash
docker compose ps
```

## 3. Setup Database

```bash
npm run db:push
npm run db:seed
```

This creates:
- Database tables
- Admin user: `admin@notifyflow.com` / `admin123`

## 4. Start Development (Two Terminals)

**Terminal 1 — Next.js Server:**
```bash
npm run dev
```

**Terminal 2 — BullMQ Worker:**
```bash
npm run worker
```

## 5. Access the App

- 🌐 **Web UI:** http://localhost:3000
- 📝 **Login:** `admin@notifyflow.com` / `admin123`
- 📊 **API:** http://localhost:3000/api/notifications

## Testing

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Specific suite
npm run test:unit
npm run test:integration
```

## Next Steps

1. **Send a notification**
   - Go to http://localhost:3000/send
   - Fill in title/body
   - Choose channel (in-app is available by default)
   - Click send

2. **Check worker logs**
   - Watch Terminal 2 for delivery status
   - Notification status updates in real-time

3. **View analytics**
   - http://localhost:3000/analytics shows delivery metrics

## Troubleshooting

### Docker containers won't start
```bash
docker compose down
docker compose up -d
```

### Database migration errors
```bash
npm run db:push -- --force-reset
npm run db:seed
```

### Worker not processing jobs
- Ensure both servers are running (Terminal 1 + 2)
- Check Terminal 2 for error logs
- Verify Redis is running: `docker compose ps redis`

### Port conflicts
Modify `.env`:
```bash
# Change app port
# Update docker-compose.yml for Postgres/Redis ports
```

## Useful Commands

```bash
# Database
npm run db:push          # Apply schema changes
npm run db:migrate       # Run migrations
npm run db:seed          # Seed test data

# Development
npm run dev              # Start Next.js (port 3000)
npm run worker           # Start BullMQ worker
npm run lint             # Check code quality
npm run lint --fix       # Auto-fix

# Testing
npm test                 # Run all tests
npm run test:integration # Integration tests only

# Docker
docker compose logs app  # View app logs
docker compose logs postgres
docker compose logs redis
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  Browser (http://localhost:3000)        │
│  - Dashboard, send form, analytics      │
└──────────────┬──────────────────────────┘
               │
               │ HTTP
               ▼
┌─────────────────────────────────────────┐
│  Next.js Server (npm run dev)           │
│  - API routes (/api/notifications)      │
│  - Validation, authentication           │
│  - Enqueue jobs to Redis                │
└──────────────┬──────────────────────────┘
               │
               │ BullMQ Queue
               ▼
┌─────────────────────────────────────────┐
│  BullMQ Worker (npm run worker)         │
│  - Process delivery jobs                │
│  - Call notification services           │
│  - Update DB status                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Database + Channels                    │
│  - PostgreSQL (persist data)            │
│  - Redis (queue + rate limiting)        │
│  - Email/Webhook/In-App delivery        │
└─────────────────────────────────────────┘
```

## Production Deployment

See [docs/DEPLOY.md](docs/DEPLOY.md) for:
- Hosting options (Vercel, Railway, self-hosted)
- Environment variables for production
- Scaling the worker process
- Monitoring & observability

---

**Ready to go!** 🎉 Start with Terminal 1 + Terminal 2, then visit http://localhost:3000
