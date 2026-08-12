# DPLOY

**DPLOY** is a lightweight, high-performance Platform-as-a-Service
(PaaS) built with **Go** and **Next.js**.

It lets developers connect their Git repositories and automatically
**build, deploy, and scale applications** --- including Dockerized
services and static sites.

dploy includes an intelligent, zero-downtime reverse proxy, asynchronous
background workers, dynamic load balancing, custom domain routing, and
real-time deployment logs.

------------------------------------------------------------------------

## Features

-   **Automated Deployments** --- Connect a Git repository and dploy
    handles cloning, building, and container orchestration.
-   **Intelligent Load Balancing** --- Dynamically routes traffic to the
    least-loaded replica using active connection tracking.
-   **Zero-Downtime Deployments** --- New deployments receive new
    traffic while existing connections remain connected to the previous
    replica until they finish.
-   **Asynchronous Workers** --- Git cloning, Docker builds, S3 uploads,
    and other heavy operations run through a Redis-backed Asynq task
    queue.
-   **Static Site Hosting** --- Native AWS S3 integration for static
    asset storage and delivery.
-   **Custom Domains & Subdomains** --- Supports platform subdomains and
    custom domain routing.
-   **Real-Time Logs** --- Streams build logs and deployment status to
    the Next.js dashboard over WebSockets.
-   **Docker-Based Orchestration** --- Uses the Docker Engine API to
    create, manage, scale, and replace application containers.
-   **Graceful Container Draining** --- Old replicas are drained after
    new replicas become healthy, avoiding unnecessary connection drops.

------------------------------------------------------------------------

## Architecture

dploy is split into several responsibilities so that the control plane,
background processing, routing, and application workloads can operate
independently.

``` text
                         ┌─────────────────────┐
                         │      Next.js UI     │
                         │   Dashboard / Logs   │
                         └──────────┬──────────┘
                                    │
                              REST / WebSocket
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Go API         │
                         │   Control Plane     │
                         └──────┬───────┬──────┘
                                │       │
                    Metadata    │       │ Tasks
                                ▼       ▼
                         ┌──────────┐ ┌──────────┐
                         │PostgreSQL│ │  Redis   │
                         │          │ │  +Asynq  │
                         └──────────┘ └────┬─────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │  Go Worker      │
                                 │ Build / Deploy  │
                                 └────────┬────────┘
                                          │
                                    Docker Engine
                                          │
                                          ▼
                              ┌────────────────────┐
                              │ Application         │
                              │ Containers / Apps   │
                              └─────────┬──────────┘
                                        │
                                        ▼
                              ┌────────────────────┐
                              │ Dynamic Reverse     │
                              │ Proxy / Load Bal.   │
                              └─────────┬──────────┘
                                        │
                                        ▼
                                     Caddy
                                  Edge / TLS
```

### Deployment Flow

1.  A developer creates or triggers a deployment from the dploy
    dashboard.
2.  The API validates the deployment request and persists deployment
    metadata.
3.  A background task is pushed to Redis through Asynq.
4.  A worker picks up the task.
5.  The worker clones the Git repository.
6.  The application is built and packaged into a Docker image when
    required.
7.  The worker starts the new application replica(s).
8.  The reverse proxy begins routing new requests to healthy replicas.
9.  Existing connections continue using the old replica.
10. Once the old replica has no active connections, it is gracefully
    drained and removed.
11. Deployment status and logs are streamed back to the dashboard in
    real time.

------------------------------------------------------------------------

## Intelligent Load Balancing

dploy includes a custom dynamic reverse proxy instead of relying on a
traditional static upstream configuration.

Each application replica maintains active connection information. The
proxy uses this information to make routing decisions at request time.

Conceptually:

``` text
Incoming Request
       │
       ▼
┌──────────────────┐
│ Dynamic Proxy    │
└────────┬─────────┘
         │
    ┌────┼────┬────┐
    ▼    ▼    ▼    ▼
   R1   R2   R3   R4
   12    4    8    3
   │     │    │    │
   └─────┴────┴────┘
         │
         ▼
   Least-loaded replica
```

This also enables dploy's rolling deployment behavior:

``` text
Old Deployment
┌───────────────┐
│   Replica A   │◄──── Existing connections
└───────────────┘
        │
        │ New deployment
        ▼
┌───────────────┐
│   Replica B   │◄──── New requests
└───────────────┘
        │
        ▼
Old replica drains
        │
        ▼
Container removed
```

The goal is to make deployments invisible to active users rather than
simply replacing running containers.

------------------------------------------------------------------------

## Tech Stack

### Backend

  Technology              Purpose
  ----------------------- ------------------------------------------------------
  **Go 1.25+**            Core backend, API, workers, proxy, and orchestration
  **PostgreSQL**          Persistent application and deployment metadata
  **GORM**                PostgreSQL ORM
  **Redis**               Queue and shared asynchronous task infrastructure
  **Asynq**               Background job processing
  **Docker Engine API**   Container lifecycle and orchestration
  **AWS SDK / S3**        Static site asset storage and delivery
  **WebSockets**          Real-time deployment logs and status

### Frontend

  Technology       Purpose
  ---------------- --------------------------------------
  **Next.js**      Web dashboard
  **React**        Frontend UI
  **REST API**     Backend communication
  **WebSockets**   Real-time logs and deployment events

### Infrastructure

  Technology           Purpose
  -------------------- --------------------------------------------
  **Docker**           Application containerization and execution
  **Docker Compose**   Local and production service orchestration
  **Caddy**            Edge routing and automatic TLS/SSL
  **GitHub Actions**   CI/CD workflows

------------------------------------------------------------------------

## Project Structure

``` text
dploy/
├── .github/
│   └── # CI/CD workflows (GitHub Actions)
│
├── cmd/
│   ├── api/
│   │   └── # API server entry point
│   └── worker/
│       └── # Background worker entry point
│
├── frontend/
│   └── # Next.js web dashboard
│
├── internal/
│   ├── api/
│   │   └── # HTTP handlers and middleware
│   │
│   ├── db/
│   │   └── # Database connection and migrations
│   │
│   ├── models/
│   │   └── # GORM database models
│   │
│   ├── orchestrator/
│   │   └── # Docker orchestration and scaling
│   │
│   ├── pipeline/
│   │   └── # Build and deployment pipelines
│   │
│   ├── proxy/
│   │   └── # Dynamic reverse proxy and load balancer
│   │
│   ├── testutils/
│   │   └── # Testing helpers and mock DB setup
│   │
│   └── worker/
│       └── # Asynq task definitions
│
├── .env.example
├── Caddyfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
└── README.md
```

------------------------------------------------------------------------

## Getting Started

### Prerequisites

Make sure the following are installed:

-   Go
-   Bun
-   Docker
-   Docker Compose
-   Git

------------------------------------------------------------------------

### 1. Clone the Repository

``` bash
git clone https://github.com/avichal-08/dploy.git
cd dploy
```

------------------------------------------------------------------------

### 2. Configure Environment Variables

Copy the example environment file:

``` bash
cp .env.example .env
```

Update the values in `.env`.

At minimum, make sure the required credentials and secrets are
configured, including:

-   `POSTGRES_PASSWORD`
-   `JWT_SECRET`
-   `INVITE_CODE`
-   PostgreSQL connection details
-   Redis configuration
-   AWS S3 credentials

> Never commit real secrets or production credentials to the repository.

------------------------------------------------------------------------

### 3. Start Infrastructure

Start the required infrastructure services with Docker Compose:

``` bash
docker-compose up -d
```

This provides the services required for local development, including
PostgreSQL, Redis, and Caddy.

------------------------------------------------------------------------

### 4. Run the Backend

Start the API server:

``` bash
go run ./cmd/api/main.go
```

In another terminal, start the worker:

``` bash
go run ./cmd/worker/main.go
```

The API and worker are intentionally separated so that request handling
and long-running deployment tasks do not block each other.

------------------------------------------------------------------------

### 5. Run the Frontend

``` bash
cd frontend
bun install
bun run dev
```

The Next.js dashboard will start in development mode.

------------------------------------------------------------------------

## Testing

dploy includes tests for HTTP handlers, database interactions,
deployment behavior, and load-balancer performance.

### Test Database

Tests should use a dedicated PostgreSQL database so that test execution
cannot overwrite development data.

For example, a dedicated Neon database or branch can be used.

Create a `.env.test` file in the repository root:

``` env
TEST_DATABASE_URL=postgres://<user>:<password>@<neon-hostname>.neon.tech/dploy_test?sslmode=require
```

Replace the placeholders with the credentials for your test database.

### Run Tests

``` bash
go test -v ./...
```

### Run Tests and Benchmarks

``` bash
go test -v -bench="." -benchmem ./...
```

------------------------------------------------------------------------

## Benchmarks

dploy includes benchmarks for performance-sensitive components such as
the load balancer.

Benchmarks can be executed with:

``` bash
go test -bench="." -benchmem ./...
```

For meaningful comparisons, run benchmarks on the same hardware and
under consistent system conditions.

------------------------------------------------------------------------

## Domains & Routing

dploy supports both platform-generated subdomains and custom domains.

Example platform route:

``` text
https://app1.localhost:8080
```

Custom domains can be mapped to deployments through the routing layer.

The architecture separates edge routing from application routing:

``` text
Internet
   │
   ▼
 Caddy
   │
   ▼
dploy Reverse Proxy
   │
   ├── app.example.com
   ├── api.example.com
   └── app1.localhost:8080
          │
          ▼
    Application Replica(s)
```

Caddy handles edge concerns such as TLS/SSL, while dploy's internal
proxy is responsible for application-level routing and load balancing.

------------------------------------------------------------------------

## Zero-Downtime Deployment

One of the core goals of dploy is to make deployments safe for
applications with active traffic.

Instead of immediately terminating the previous deployment:

``` text
Deploy v2
   │
   ▼
Start v2
   │
   ▼
Route new requests → v2
   │
   ├───────────────┐
   │               │
Existing users    New users
   │               │
   ▼               ▼
  v1              v2
   │
   ▼
Connections finish
   │
   ▼
Graceful drain
   │
   ▼
Remove v1
```

This allows a new version to become active without unnecessarily
interrupting existing connections.

------------------------------------------------------------------------

## Production Deployment

A production deployment configuration is provided through:

``` text
docker-compose.prod.yml
```

Before using it in production, configure:

1.  Production PostgreSQL.
2.  Production Redis.
3.  AWS S3 credentials and bucket configuration.
4.  Secure JWT and application secrets.
5.  DNS records for platform and custom domains.
6.  Caddy configuration for the production domain.
7.  Docker host permissions and resource limits.

The production setup should be reviewed and hardened according to the
environment in which dploy is deployed.

------------------------------------------------------------------------

## Design Principles

dploy is built around a few core principles:

### Keep the control plane lightweight

The API should coordinate deployments rather than perform expensive
operations synchronously.

### Push heavy work to workers

Builds, cloning, uploads, and container operations are handled
asynchronously through the worker system.

### Prefer graceful transitions

Deployments should replace infrastructure without unnecessarily
interrupting active traffic.

### Keep routing dynamic

Application replicas can change over time, so routing should reflect the
current deployment state instead of relying on static configuration.

### Use simple infrastructure primitives

dploy relies on Go, Docker, Redis, PostgreSQL, S3, and Caddy rather than
requiring Kubernetes for its core orchestration model.

------------------------------------------------------------------------

## Contributing

Contributions are welcome.

A typical development workflow is:

``` bash
git checkout -b feature/my-feature
```

Make your changes, add tests where appropriate, and verify the project
locally:

``` bash
go test ./...
```

For larger changes, please document the architectural reasoning and any
operational implications.

------------------------------------------------------------------------

## License

This project is licensed under the **MIT License**.

------------------------------------------------------------------------

## Built with Go. Deployed with dploy.
