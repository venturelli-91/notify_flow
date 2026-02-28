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

## 3. Setup Database

```bash
npm run db:push
npm run db:seed
```

Creates admin user: `admin@notifyflow.com` / `admin123`

## 4. Start Development (Two Terminals)

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
npm run worker
```

## 5. Access

- 🌐 http://localhost:3000
- 📧 admin@notifyflow.com / admin123

## Testing

```bash
npm test
```

---

See [docs/DEPLOY.md](docs/DEPLOY.md) for production deployment.
