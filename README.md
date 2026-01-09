# 🎫 Tokens Management API

A **Token Management API** built with **NestJS** to handle secure, concurrent token distribution.  
This project was developed as part of the **Just Travel Technical Challenge**.

---

## 🧠 Technical Decisions & Challenges

### 1. Concurrency and Race Conditions

The core challenge is ensuring that **two users never receive the same token simultaneously**.

- **Solution:**  
  Implemented **Pessimistic Locking** using `FOR UPDATE SKIP LOCKED` via **Prisma Raw Queries**.

- **Why?**  
  Traditional *read-then-write* flows create race conditions.  
  Database-level row locking ensures:
  - Atomic operations
  - High performance
  - No retry loops or transaction bottlenecks

---

### 2. Pre-generated Token Strategy

- **Decision:**  
  Tokens are not generated on demand. They are consumed from a **pre-generated pool**.

- **Reasoning:**  
  - Generating unique hashes at request time is expensive
  - Indexed reads on `AVAILABLE` tokens are extremely fast

- **Seeding:**  
  The database is initially populated via a **seed script** that creates the token pool.

---

### 3. Fallback & Recycling Logic (Force Expire)

- **Decision:**  
  When no `AVAILABLE` tokens exist:
  - The system finds the **oldest active token** (by `updatedAt`)
  - Expires its session
  - Reassigns it to the new user

- **Reasoning:**  
  Guarantees high availability and prevents system blockage under heavy load.

---

### 4. Automated Token Expiration (Cron Strategy)

- **Decision:**  
  A **cron-based strategy** was implemented to automatically expire active tokens.

- **How it works:**  
  - A scheduled job runs at a fixed interval (each 10 seconds)
  - It scans for `ACTIVE` tokens that exceeded their allowed lifetime
  - Expired tokens are marked accordingly and returned to the pool

- **Reasoning:**  
  - Ensures tokens are always expired even if no new requests arrive  
  - Decouples expiration logic from user actions  
  - Improves system reliability and consistency over time

---

## 🚀 How to Run

### ✅ Prerequisites

- Git  
- Docker & Docker Compose  
- Node.js **v24+** (only if running without Docker)

---

### ⚙️ Initial Configuration

1. Create the environment file:
   ```bash
   cp .env.example .env
   ```

---

## 🐳 Option 1: Running with Docker (Recommended)

The project uses:
- **Multi-stage Dockerfile**
- **docker-compose with health checks**

### Start the application

```bash
docker-compose up --build -d
```

### What happens inside Docker?

Once Postgres is healthy, the API container automatically runs:

1. `prisma migrate deploy` → Applies database schema  
2. `prisma db seed` → Populates initial tokens  
3. `node dist/src/main` → Starts the production server  

---

## 🛠️ Option 2: Running Manually (Development)

### Install dependencies

```bash
npm install
```

### Generate Prisma Client
```bash
RUN npx prisma generate
```

### Database setup

Ensure a PostgreSQL instance is running, then execute:

```bash
npx prisma migrate dev

npx prisma db seed
```

### Start the server

```bash
npm run start:dev
```

📍 The API will be available at:  
**http://localhost:3001** (or the configured `API_PORT`)

---

## 📚 API Documentation

Interactive **Swagger documentation** is generated automatically.

👉 Access it at:  
**http://localhost:3001/docs**

---

## 🔧 Usage Example (cURL)

### Claim a token

```bash
curl -X POST http://localhost:3001/tokens/claim \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-uuid-here"}'
```

---

## 🧪 Testing Strategy

The project includes a robust test suite using **Jest** and `@nestjs/testing`.

### Run tests

```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov
```

### Key Test Coverage

- **Interactive Transactions**  
  Verified using custom mocks for `$transaction` and `$queryRaw`

- **Locking Simulation**  
  Ensures correct behavior for:
  - Available tokens
  - Force-expire fallback logic

- **Pagination & Metadata**  
  Validates correct counts and page calculations in `listTokens`

- **Cron Jobs**  
  Tests automated expiration of old active tokens

---

## 📂 Project Structure

```text
src/database/
  └─ Prisma service and configuration

src/tokens-management.service.ts
  └─ Core business logic (locking, transactions)

src/tokens-management.controller.ts
  └─ API endpoints with Swagger decorators

prisma/seed.ts
  └─ Token pre-generation script

Dockerfile
  └─ Multi-stage build for optimized production images
```
