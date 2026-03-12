# 🚀 Quick Start Guide

## One-Command Setup & Run

Just run this script - it handles **everything**:

```bash
./scripts/setup-and-run.sh
```

## What This Script Does

1. ✅ Checks for Python 3.11+ and Docker
2. ✅ Creates `.env` file if missing (prompts for API keys)
3. ✅ Sets up Python virtual environment
4. ✅ Installs all dependencies
5. ✅ Starts Redis and PostgreSQL (via Docker)
6. ✅ Runs the application
7. ✅ Shows you where to access the API

## Before Running

You'll need API keys from:
- **Polygon.io** (free tier available): https://polygon.io
- **OpenRouter** (requires credits): https://openrouter.ai

The script will prompt you to add these to `.env` before starting.

## After Running

Once the script completes, you'll have:

- **API running at**: http://localhost:8000
- **Interactive docs at**: http://localhost:8000/docs
- **WebSocket at**: ws://localhost:8000/ws/articles

## Manual Setup (if you prefer)

See `docs/README.md` for detailed manual setup instructions.

## Docker Compose Only

If you just want to use Docker Compose:

```bash
# Edit .env with your API keys first
./scripts/docker-up.sh
```

## Troubleshooting

**Script fails?**
- Make sure you have Python 3.11+ installed
- Make sure Docker Desktop is running
- Check that ports 6379, 5432, and 8000 are available

**Need help?**
- Check `docs/README.md` for detailed documentation
- Check `docs/API.md` for API reference
- View logs: `docker-compose logs -f`

## Quick Commands

```bash
# Stop everything
docker-compose down

# View logs
docker-compose logs -f app

# Restart app
docker-compose restart app

# Check status
docker-compose ps
```

---

**That's it!** The script handles everything else automatically. 🎉
