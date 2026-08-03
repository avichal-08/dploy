FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/dploy-api ./cmd/api/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/dploy-worker ./cmd/worker/main.go

FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache docker-cli git

COPY --from=builder /app/bin/dploy-api .
COPY --from=builder /app/bin/dploy-worker .

RUN chmod +x ./dploy-api ./dploy-worker

EXPOSE 8080

CMD ["./dploy-api"]
