
DB_URL ?= postgresql://dploy_user:dploy_pass@localhost:5432/dploy_db?sslmode=disable
REDIS_ADDR ?= localhost:6379

.PHONY: help dev dev-api dev-worker dev-web build-api build-worker build-web clean migrate-up migrate-down migrate-create test logs

help:
   @echo "Dploy Makefile Commands:"
   @echo ""
   @echo "Local Development:"
   @echo "  make dev          - Starts everything (DB, Redis, API, Worker, Web) via Docker Compose and local processes"
   @echo "  make dev-infra    - Starts only the infrastructure (Postgres, Redis) via Docker Compose"
   @echo "  make dev-api      - Starts the Go API server"
   @echo "  make dev-worker   - Starts the Go background worker"
   @echo "  make dev-web      - Starts the Next.js frontend"
   @echo ""
   @echo "Building:"
   @echo "  make build-api    - Compiles the Go API binary"
   @echo "  make build-worker - Compiles the Go Worker binary"
   @echo "  make build-web    - Builds the Next.js production app"
   @echo ""
   @echo "Database Migrations:"
   @echo "  make migrate-up   - Runs all pending database migrations"
   @echo "  make migrate-down - Rolls back the last database migration"
   @echo "  make migrate-create name= - Creates a new migration file"
   @echo ""
   @echo "Maintenance:"
   @echo "  make clean        - Stops docker containers and removes binaries"
   @echo "  make logs         - Tails docker-compose logs"

dev-infra:
   @echo "--> Starting infrastructure (Postgres, Redis)..."
   docker-compose up -d dploy-db redis

dev-api:
   @echo "--> Starting Go API Server..."
   go run cmd/api/main.go

dev-worker:
   @echo "--> Starting Go Background Worker..."
   go run cmd/worker/main.go

dev-web:
   @echo "--> Starting Next.js Frontend..."
   cd frontend && npm run dev

dev: dev-infra
   @echo "--> Starting Full Stack..."
   @make dev-api & make dev-worker & make dev-web & wait

build-api:
   @echo "--> Building Go API..."
   CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/dploy-api ./cmd/api/main.go

build-worker:
   @echo "--> Building Go Worker..."
   CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/dploy-worker ./cmd/worker/main.go

build-web:
   @echo "--> Building Next.js Frontend..."
   cd frontend && npm install && npm run build

migrate-up:
   @echo "--> Running migrations up..."
   migrate -path internal/db/migrations -database "$(DB_URL)" up

migrate-down:
   @echo "--> Rolling back last migration..."
   migrate -path internal/db/migrations -database "$(DB_URL)" down 1

migrate-create:
   @if [ -z "$(name)" ]; then echo "Error: name is required. Usage: make migrate-create name=<migration_name>"; exit 1; fi
   @echo "--> Creating new migration..."
   migrate create -ext sql -dir internal/db/migrations -seq $(name)



clean:
   @echo "--> Cleaning up..."
   docker-compose down
   rm -rf bin/
   rm -rf frontend/.next/

logs:
   docker-compose logs -f
