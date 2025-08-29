# LemonStand – B2B e‑commerce microservices platform

LemonStand is a high‑performance, scalable B2B e‑commerce platform built on a modern microservices architecture. It separates core business concerns into individual services, such as authentication, product catalog, order processing, payments and email notifications. Each service is independently deployable, communicates over HTTP and AMQP, and is instrumented for observability.

## Architecture overview

The platform is composed of the following core services:

| Service          | Port | Responsibility                                                             |
|------------------|------|----------------------------------------------------------------------------|
| **API Gateway**   | 3000 | Routes external API requests to the appropriate backend service via HTTP proxy, provides rate limiting and exposes a unified API surface. |
| **Auth Service**  | 3001 | Handles user registration, login and JWT‑based authentication/authorization. |
| **Products Service** | 3002 | Manages the product catalogue, categories and inventory, with Redis caching for performance. |
| **Orders Service** | 3003 | Processes orders, calculates totals and taxes, emits events to a message broker. |
| **Payments Service** | 3004 | Integrates with Stripe to create payment intents, handle webhooks and perform post‑payment actions. |
| **Email Service**   | 3005 | Listens to RabbitMQ events and sends transactional emails using Nodemailer. |
| **Service Registry** | 3006 | Performs health checks on services and provides simple service discovery for the API gateway. |

These services are containerized with Docker and orchestrated via Docker Compose or Kubernetes (see the `k8s` folder for example manifests). MongoDB, Redis and RabbitMQ provide persistence, caching and message queueing respectively.

## Technology stack

* **Backend:** Node.js 20, Express.js, MongoDB (Mongoose)
* **Authentication:** JWT, bcrypt
* **Payments:** Stripe API
* **Caching:** Redis
* **Message queue:** RabbitMQ
* **Containerization:** Docker, Docker Compose
* **Orchestration:** Kubernetes (optional)
* **Monitoring:** Prometheus metrics exposed via `/metrics` endpoints on each service
* **Testing:** Jest, Supertest

## Getting started

### Prerequisites

* Node.js 20+
* npm 8+ with [Workspaces](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
* Docker and Docker Compose (for running services locally in containers)
* MongoDB, Redis and RabbitMQ installed locally if you don’t use Docker

### Development setup

1. **Clone the repository and install dependencies.**

   ```bash
   git clone https://github.com/simon-hirst/lemonstand.git
   cd lemonstand-platform
   npm install
   ```

   This installs all dependencies across the workspace. The project no longer uses Lerna – workspaces are managed via npm.

2. **Configure environment variables.** Each service expects a `.env` file in its root. Edit them as required:

   ```bash
   nano packages/auth-service/.env
   # repeat for products-service, orders-service, payments-service, email-service
   ```

3. **Start supporting infrastructure.** If you have MongoDB, Redis and RabbitMQ installed locally, ensure they are running. Alternatively you can use Docker Compose:

   ```bash
   # start only the infrastructure containers
   docker compose up -d mongo redis rabbitmq
   ```

4. **Run a service.** To run the authentication service for development, execute:

   ```bash
   cd packages/auth-service
   npm run dev
   ```

   Each service has `start` and `dev` scripts defined in its `package.json`. The dev script uses Nodemon for autoreload.

5. **Run tests.** Execute all tests across the workspace:

   ```bash
   npm test
   ```

### Running with Docker Compose

The included `docker-compose.yml` file defines the full stack, including MongoDB, Redis, RabbitMQ, the service registry, API gateway and all backend services. To build and start everything:

```bash
docker compose up --build
```

The services will be available on the ports described above. The API gateway will proxy requests to `/api/v1/{service}/...` to the underlying services. For example:

```bash
curl http://localhost:3000/api/v1/products/products
```

### Health checks and metrics

Each service exposes a `/health` endpoint that returns a simple JSON payload indicating that the service is running. Prometheus‑formatted metrics are available on `/metrics` and can be scraped by a Prometheus server. The service registry polls each service’s health endpoint every 30 seconds and stores the results; the API gateway queries the registry to discover the location and health of services at runtime.
