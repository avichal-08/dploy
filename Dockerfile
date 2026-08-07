FROM golang:alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .

RUN --mount=type=cache,target=/root/.cache/go-build --mount=type=cache,target=/go/pkg/mod CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/dploy-api ./cmd/api/main.go

RUN --mount=type=cache,target=/root/.cache/go-build --mount=type=cache,target=/go/pkg/mod CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/dploy-worker ./cmd/worker/main.go
FROM alpine:latest AS api_runner

WORKDIR /app

RUN apk add --no-cache docker-cli git

COPY --from=builder /app/bin/dploy-api .
RUN chmod +x ./dploy-api

EXPOSE 8080
CMD ["./dploy-api"]

FROM alpine:latest AS worker_runner

WORKDIR /app

RUN apk add --no-cache docker-cli git

COPY --from=builder /app/bin/dploy-worker .
RUN chmod +x ./dploy-worker

CMD ["./dploy-worker"]
