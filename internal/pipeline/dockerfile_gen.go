package pipeline

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
)

func GenerateDockerfile(cloneDir string, framework string, buildCmd string, runCmd string) error {

	dockerfilePath := filepath.Join(cloneDir, "Dockerfile")

	if fileExists(dockerfilePath) {
		slog.Info("custom Dockerfile detected, skipping generation and command injection", "build_dir", cloneDir)
		return nil
	}

	formatRunCmd := func(defaultCmd string) string {
		if runCmd == "" {
			return defaultCmd
		}
		parts := strings.Fields(runCmd)
		jsonParts, _ := json.Marshal(parts)
		return "CMD " + string(jsonParts)
	}

	formatBuildCmd := func(defaultCmd string) string {
		if buildCmd == "" {
			return defaultCmd
		}
		cleanBuildCmd := strings.ReplaceAll(buildCmd, "\n", " ")
		return "RUN " + cleanBuildCmd
	}

	var dockerfileContent string

	switch framework {
	case "go":
		dockerfileContent = fmt.Sprintf(`
      FROM golang:1.22-alpine AS builder
      WORKDIR /app
      COPY go.mod go.sum ./
      RUN go mod download
      COPY . .
      %s

      FROM alpine:latest
      WORKDIR /app
      COPY --from=builder /app/main .
      %s
      `, formatBuildCmd("RUN CGO_ENABLED=0 GOOS=linux go build -o main ."), formatRunCmd(`CMD ["./main"]`))

	case "nodejs":
		dockerfileContent = fmt.Sprintf(`
      FROM node:20-alpine
      WORKDIR /app
      COPY package*.json ./
      RUN npm install --production
      COPY . .
      %s
      %s
      `, formatBuildCmd(""), formatRunCmd(`CMD ["npm", "start"]`))

	case "bun":
		dockerfileContent = fmt.Sprintf(`
		FROM oven/bun:alpine
		WORKDIR /app
		COPY package.json bun.lock* ./
		RUN bun install --production
		COPY . .
		%s
		%s
		`, formatBuildCmd(""), formatRunCmd(`CMD ["bun", "start"]`))

	case "nextjs":
		dockerfileContent = fmt.Sprintf(`
      FROM node:20-alpine AS builder
      WORKDIR /app
      COPY package*.json ./
      RUN npm install
      COPY . .
      %s

      FROM node:20-alpine AS runner
      WORKDIR /app
      ENV NODE_ENV production
      COPY --from=builder /app/package*.json ./
      COPY --from=builder /app/.next ./.next
      COPY --from=builder /app/public ./public
      COPY --from=builder /app/node_modules ./node_modules
      EXPOSE 3000
      %s
      `, formatBuildCmd("RUN npm run build"), formatRunCmd(`CMD ["npm", "start"]`))

	case "vite":
		dockerfileContent = fmt.Sprintf(`
      FROM node:20-alpine AS builder
      WORKDIR /app
      COPY package*.json ./
      RUN npm install
      COPY . .
      %s

      FROM nginx:alpine
      COPY --from=builder /app/dist /usr/share/nginx/html
      EXPOSE 80
      %s
      `, formatBuildCmd("RUN npm run build"), formatRunCmd(""))

	case "static-html":
		dockerfileContent = fmt.Sprintf(`
      FROM nginx:alpine
      COPY . /usr/share/nginx/html
      EXPOSE 80
      %s
      `, formatRunCmd(""))

	case "python":
		dockerfileContent = fmt.Sprintf(`
      FROM python:3.11-slim
      WORKDIR /app
      COPY requirements.txt ./
      RUN pip install --no-cache-dir -r requirements.txt
      COPY . .
      %s
      %s
      `, formatBuildCmd(""), formatRunCmd(`CMD ["python", "main.py"]`))

	default:
		return fmt.Errorf("unsupported framework: %s. Please provide a custom Dockerfile", framework)
	}

	slog.Info("generating dockerfile", "framework", framework, "path", dockerfilePath)

	err := os.WriteFile(dockerfilePath, []byte(strings.TrimSpace(dockerfileContent)), 0644)
	if err != nil {
		return fmt.Errorf("failed to write Dockerfile: %v", err)
	}

	return nil
}
