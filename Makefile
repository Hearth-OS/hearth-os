# Hearth OS — local dev helpers (GNU Make 4.x)
# Windows: use Git Bash or WSL, with Node + Docker on PATH. Or use scripts\verify-build.cmd + manual dev.
# Default: show help
.DEFAULT_GOAL := help

REPO    := $(CURDIR)
PID_DIR := $(REPO)/.make
GRAPH   := $(REPO)/packages/graph
ROUTER  := ghcr.io/wundergraph/cosmo/router:latest

.PHONY: help check verify test start start-all start-api start-web start-router stop stop-api stop-router status logs

help:
	@echo "Hearth OS — make targets"
	@echo "  make check|verify  — npm run verify:build (lint + build, no services)"
	@echo "  make test         — npm test (needs .env, API :3001, router :4000; run start-all first)"
	@echo "  make start-all    — start API + WunderGraph router (background + Docker)"
	@echo "  make start-api    — API only (logs: .make/api.log, PID: .make/api.pid)"
	@echo "  make start-web    — Next.js on :3000 (optional)"
	@echo "  make start-router — Cosmo router on :4000 (Docker, name: hearth-os-router)"
	@echo "  make stop         — stop API, web, and remove router container"
	@echo "  make status       — curl :3001 and :4000 health"
	@echo "  make logs         — tail API log (Ctrl+C to exit)"

check verify:
	@cd "$(REPO)" && npm run verify:build

test:
	@cd "$(REPO)" && npm test

$(PID_DIR):
	@mkdir -p "$(PID_DIR)"

# --- start ---

start-api: $(PID_DIR)
	@if [ -f "$(PID_DIR)/api.pid" ] && kill -0 "$$(cat "$(PID_DIR)/api.pid")" 2>/dev/null; then \
		echo "API already running (PID $$(cat "$(PID_DIR)/api.pid"))"; \
		exit 0; \
	fi
	@cd "$(REPO)" && ( nohup npm run dev --workspace @hearth-os/api > "$(PID_DIR)/api.log" 2>&1 & echo $$! > "$(PID_DIR)/api.pid" )
	@echo "API  http://localhost:3001  PID=$$(cat "$(PID_DIR)/api.pid")  log: .make/api.log"

start-web: $(PID_DIR)
	@if [ -f "$(PID_DIR)/web.pid" ] && kill -0 "$$(cat "$(PID_DIR)/web.pid")" 2>/dev/null; then \
		echo "Web already running (PID $$(cat "$(PID_DIR)/web.pid"))"; \
		exit 0; \
	fi
	@cd "$(REPO)" && ( nohup npm run dev --workspace @hearth-os/web > "$(PID_DIR)/web.log" 2>&1 & echo $$! > "$(PID_DIR)/web.pid" )
	@echo "Web  http://localhost:3000  PID=$$(cat "$(PID_DIR)/web.pid")  log: .make/web.log"

start-router:
	-docker rm -f hearth-os-router 2>/dev/null
	@docker run -d --name hearth-os-router -p 4000:4000 \
		-v "$(GRAPH)":/config \
		$(ROUTER) \
		--config=/config/router.yaml
	@echo "Router  http://localhost:4000/graphql  (container hearth-os-router)"

# API then router (router federates the API; brief pause lets API bind first)
start-all: start-api
	@sleep 2
	@$(MAKE) start-router
	@echo "Next:  make test   OR  make start-web  (optional UI on :3000)"

start: start-all

# --- stop ---

stop-api:
	-@if [ -f "$(PID_DIR)/api.pid" ]; then kill "$$(cat "$(PID_DIR)/api.pid")" 2>/dev/null; rm -f "$(PID_DIR)/api.pid"; echo "API stopped."; else echo "No .make/api.pid (API not started via make)."; fi

stop-web:
	-@if [ -f "$(PID_DIR)/web.pid" ]; then kill "$$(cat "$(PID_DIR)/web.pid")" 2>/dev/null; rm -f "$(PID_DIR)/web.pid"; echo "Web stopped."; else echo "No .make/web.pid."; fi

stop-router:
	-docker rm -f hearth-os-router

stop: stop-api stop-web stop-router
	@echo "make stop: done."

# --- misc ---

status:
	@command -v curl >/dev/null 2>&1 && curl -sS -m 2 -o /dev/null -w "API     :3001  HTTP %{http_code}\n" http://localhost:3001/health || echo "API     :3001  (curl missing or down)"
	@command -v curl >/dev/null 2>&1 && curl -sS -m 2 -o /dev/null -w "Router  :4000  HTTP %{http_code}\n" http://localhost:4000/health/ready || echo "Router  :4000  (curl missing or down)"

logs:
	@if [ -f "$(PID_DIR)/api.log" ]; then tail -n 100 -f "$(PID_DIR)/api.log"; else echo "No .make/api.log — run: make start-api"; fi
