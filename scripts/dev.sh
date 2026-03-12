#!/bin/bash
# News Screener - Development startup script
# Usage: ./scripts/dev.sh [start|stop|restart|logs]

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[dev]${NC} $1"; }
warn() { echo -e "${YELLOW}[dev]${NC} $1"; }
err() { echo -e "${RED}[dev]${NC} $1"; }

check_deps() {
    command -v docker >/dev/null 2>&1 || { err "Docker is required"; exit 1; }
    command -v node >/dev/null 2>&1 || { err "Node.js is required"; exit 1; }
    command -v python3 >/dev/null 2>&1 || { err "Python3 is required"; exit 1; }
}

start_infra() {
    log "Starting PostgreSQL and Redis..."

    # Stop app/frontend containers if running (they conflict with native dev servers)
    docker compose stop app frontend 2>/dev/null || true
    docker compose rm -f app frontend 2>/dev/null || true

    docker compose up postgres redis -d --wait
    log "Infrastructure ready"
}

start_backend() {
    log "Starting backend on :8000..."

    # Activate venv if it exists
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    fi

    uvicorn src.app:app --reload --host 0.0.0.0 --port 8000 &
    echo $! > /tmp/newsscreener-backend.pid
    log "Backend PID: $(cat /tmp/newsscreener-backend.pid)"
}

start_frontend() {
    log "Starting frontend on :3000..."
    cd "$PROJECT_DIR/frontend"

    # Install deps if needed
    if [ ! -d "node_modules" ]; then
        warn "Installing frontend dependencies..."
        npm install
    fi

    npm run dev &
    echo $! > /tmp/newsscreener-frontend.pid
    log "Frontend PID: $(cat /tmp/newsscreener-frontend.pid)"
    cd "$PROJECT_DIR"
}

stop_all() {
    log "Stopping all services..."

    if [ -f /tmp/newsscreener-backend.pid ]; then
        kill "$(cat /tmp/newsscreener-backend.pid)" 2>/dev/null || true
        rm -f /tmp/newsscreener-backend.pid
        log "Backend stopped"
    fi

    if [ -f /tmp/newsscreener-frontend.pid ]; then
        kill "$(cat /tmp/newsscreener-frontend.pid)" 2>/dev/null || true
        rm -f /tmp/newsscreener-frontend.pid
        log "Frontend stopped"
    fi

    # Also kill any stray uvicorn/vite processes for this project
    pkill -f "uvicorn src.app:app" 2>/dev/null || true
    pkill -f "vite.*frontend" 2>/dev/null || true

    log "All services stopped"
}

stop_infra() {
    log "Stopping infrastructure..."
    docker compose down
    log "Infrastructure stopped"
}

show_status() {
    echo ""
    echo "=== News Screener Status ==="
    echo ""

    if [ -f /tmp/newsscreener-backend.pid ] && kill -0 "$(cat /tmp/newsscreener-backend.pid)" 2>/dev/null; then
        log "Backend:  ${GREEN}running${NC} (PID $(cat /tmp/newsscreener-backend.pid))"
    else
        warn "Backend:  ${RED}stopped${NC}"
    fi

    if [ -f /tmp/newsscreener-frontend.pid ] && kill -0 "$(cat /tmp/newsscreener-frontend.pid)" 2>/dev/null; then
        log "Frontend: ${GREEN}running${NC} (PID $(cat /tmp/newsscreener-frontend.pid))"
    else
        warn "Frontend: ${RED}stopped${NC}"
    fi

    docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || true
    echo ""
    echo "  Backend:  http://localhost:8000"
    echo "  Frontend: http://localhost:3000"
    echo "  Health:   http://localhost:8000/health"
    echo ""
}

case "${1:-start}" in
    start)
        check_deps
        stop_all
        start_infra
        start_backend
        start_frontend
        sleep 2
        show_status
        log "Ready! Open http://localhost:3000"
        log "Press Ctrl+C to stop, or run: ./scripts/dev.sh stop"
        wait
        ;;
    stop)
        stop_all
        ;;
    stop-all)
        stop_all
        stop_infra
        ;;
    restart)
        stop_all
        start_backend
        start_frontend
        sleep 2
        show_status
        ;;
    status)
        show_status
        ;;
    logs)
        docker compose logs -f
        ;;
    *)
        echo "Usage: $0 {start|stop|stop-all|restart|status|logs}"
        echo ""
        echo "  start     - Start infra + backend + frontend (default)"
        echo "  stop      - Stop backend + frontend (keep infra)"
        echo "  stop-all  - Stop everything including Docker"
        echo "  restart   - Restart backend + frontend only"
        echo "  status    - Show service status"
        echo "  logs      - Follow Docker container logs"
        exit 1
        ;;
esac
