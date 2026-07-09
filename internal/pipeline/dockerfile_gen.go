package pipeline

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
)

func GenerateDockerfile(cloneDir string, framework string) error {
	dockerfilePath := filepath.Join(cloneDir, "Dockerfile")

	if fileExists(dockerfilePath) {
		slog.Info("custom Dockerfile detected, skipping generation", "build_dir", cloneDir)
		return nil
	}

	var dockerfileContent string

	switch framework {
	case "go":
		dockerfileContent = `
							FROM golang:1.22-alpine AS builder
							WORKDIR /app
							COPY go.mod go.sum ./
							RUN go mod download
							COPY . .
							RUN CGO_ENABLED=0 GOOS=linux go build -o main .

							FROM alpine:latest
							WORKDIR /app
							COPY --from=builder /app/main .
							CMD ["./main"]
							`
	case "nodejs":
		dockerfileContent = `
							FROM node:20-alpine
							WORKDIR /app
							COPY package*.json ./
							RUN npm install --production
							COPY . .
							CMD ["npm", "start"]
							`
	case "nextjs":
		dockerfileContent = `
							FROM node:20-alpine AS builder
							WORKDIR /app
							COPY package*.json ./
							RUN npm install
							COPY . .
							RUN npm run build

							FROM node:20-alpine AS runner
							WORKDIR /app
							ENV NODE_ENV production
							COPY --from=builder /app/package*.json ./
							COPY --from=builder /app/.next ./.next
							COPY --from=builder /app/public ./public
							COPY --from=builder /app/node_modules ./node_modules
							EXPOSE 3000
							CMD ["npm", "start"]
							`
	case "vite":
		dockerfileContent = `
							FROM node:20-alpine AS builder
							WORKDIR /app
							COPY package*.json ./
							RUN npm install
							COPY . .
							RUN npm run build

							FROM nginx:alpine
							# Vite builds to the 'dist' folder by default
							COPY --from=builder /app/dist /usr/share/nginx/html
							EXPOSE 80
							`
	case "static-html":
		dockerfileContent = `
							FROM nginx:alpine
							# Pure HTML doesn't need building, just copy the root directory
							COPY . /usr/share/nginx/html
							EXPOSE 80
							`
	case "python":
		dockerfileContent = `
							FROM python:3.11-slim
							WORKDIR /app
							COPY requirements.txt ./
							RUN pip install --no-cache-dir -r requirements.txt
							COPY . .
							CMD ["python", "main.py"]
							`
	default:
		return fmt.Errorf("unsupported framework: %s. Please provide a custom Dockerfile", framework)
	}

	slog.Info("generating dockerfile", "framework", framework, "path", dockerfilePath)

	err := os.WriteFile(dockerfilePath, []byte(dockerfileContent), 0644)
	if err != nil {
		return fmt.Errorf("failed to write Dockerfile: %v", err)
	}

	return nil
}
