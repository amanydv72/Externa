# Order Execution Engine

> Production-grade DEX order execution system with intelligent routing, WebSocket updates, and queue management

**Live Deployment:** https://eterna-production.up.railway.app/

**GitHub Repository:** https://github.com/amanydv72/Eterna

## Overview

A high-performance order execution engine built for Solana DEX trading. Features intelligent multi-DEX routing (Raydium/Meteora), real-time WebSocket status updates, and robust queue-based processing with automatic retries. Supports native SOL trading with automatic WSOL handling for seamless user experience.

## Table of Contents

- [Live Demo](#live-demo)
- [Features](#features)
- [Architecture & Design Decisions](#architecture--design-decisions)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [WebSocket Real-Time Updates](#websocket-real-time-updates)
- [WSOL Support](#wsol-support)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

## Live Demo

**Production URL:** https://eterna-production.up.railway.app/

**Quick Test:**
```bash
# Health Check
curl https://eterna-production.up.railway.app/health

# Submit Market Order
curl -X POST https://eterna-production.up.railway.app/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "11111111111111111111111111111111",
    "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amountIn": 1.5,
    "slippage": 0.01,
    "orderType": "market"
  }'
```

**Postman Collection:** Import `postman_collection.json` (40+ test cases included)

## Features

### Core Functionality
- **Market Order Execution** - Immediate execution at best available price
- **Multi-DEX Routing** - Automatic price comparison between Raydium and Meteora
- **Real-time WebSocket Updates** - Live order status streaming through 6 distinct states
- **Queue Management** - BullMQ with 10 concurrent workers, 100 orders/min rate limit
- **Automatic Retries** - Exponential backoff with max 3 attempts for failed orders
- **Slippage Protection** - Configurable tolerance (0.1% - 50%)
- **Native SOL Support** - Automatic WSOL wrapping/unwrapping

### Production Features
- **Persistent Storage** - PostgreSQL for order history, Redis for queue state
- **Error Handling** - Comprehensive validation and graceful error recovery
- **Logging** - Structured JSON logging with Pino
- **Type Safety** - Full TypeScript with strict mode
- **Test Coverage** - 84.74% coverage, 35 passing tests

## Architecture & Design Decisions

### System Architecture

```
┌─────────────┐
│   Client    │
│  (Postman)  │
└──────┬──────┘
       │ POST /api/orders/execute
       ↓
┌─────────────────────────────┐
│   Fastify HTTP Server       │
│   - Input Validation (Zod)  │
│   - WSOL Address Handling   │
└──────┬──────────────────────┘
       │
       ↓
┌─────────────────────────────┐
│   BullMQ Queue              │
│   - 10 Concurrent Workers   │
│   - 100 orders/min limit    │
│   - Exponential Backoff     │
└──────┬──────────────────────┘
       │
       ↓
┌─────────────────────────────┐
│   Order Processor           │
│   1. Route Selection        │
│   2. Transaction Building   │
│   3. Swap Execution         │
└──────┬──────────────────────┘
       │
       ├──→ Raydium DEX
       └──→ Meteora DEX
       
       ↓ (Status Updates)
       
┌─────────────────────────────┐
│   WebSocket Manager         │
│   - Real-time notifications │
│   - Auto-reconnect support  │
└─────────────────────────────┘
```

### Key Design Decisions

#### 1. Market Orders Only (Phase 1)

**Decision:** Implement market orders before limit/sniper orders

**Rationale:**
- Market orders demonstrate the complete execution pipeline
- Immediate execution allows comprehensive testing of DEX routing
- Rapid state transitions showcase WebSocket capabilities
- Provides solid foundation for future order types
- Reduces initial complexity while maintaining production quality

**Future Extensions:**
- **Limit Orders** (Est. 1-2 weeks): Price monitoring + conditional execution
- **Sniper Orders** (Est. 2-3 weeks): Event listeners + MEV protection

#### 2. BullMQ Queue System

**Decision:** Use BullMQ instead of simple in-memory queue

**Rationale:**
- **Persistence**: Orders survive server restarts (backed by Redis)
- **Concurrency Control**: Configurable worker count prevents DEX overload
- **Rate Limiting**: Built-in rate limiting (100 orders/min)
- **Retry Logic**: Automatic exponential backoff for failed orders
- **Monitoring**: Job progress tracking and metrics

**Configuration:**
```typescript
{
  concurrency: 10,           // Max simultaneous orders
  rateLimit: 100,            // Orders per minute
  maxRetryAttempts: 3,       // Failed order retries
  backoff: 'exponential'     // 1s → 2s → 4s delay
}
```

#### 3. PostgreSQL + Redis Architecture

**Decision:** Dual-database approach instead of single database

**Rationale:**
- **PostgreSQL**: Long-term order history, complex queries, ACID compliance
- **Redis**: High-speed queue state, active order tracking, ephemeral data
- **Separation of Concerns**: Queue state vs. permanent records
- **Performance**: Redis for hot data, PostgreSQL for cold storage
- **Scalability**: Each database optimized for its workload

#### 4. WebSocket Status Updates

**Decision:** Automatic WebSocket upgrade after order submission

**Rationale:**
- **Real-time UX**: Users see order progress immediately
- **Reduced Polling**: No need for repeated HTTP requests
- **Efficient**: Single persistent connection vs. multiple requests
- **State Tracking**: 6 distinct states (pending → routing → building → submitted → confirmed/failed)

**Status Flow:**
```
PENDING (queued)
   ↓
ROUTING (comparing DEX prices)
   ↓
BUILDING (creating transaction)
   ↓
SUBMITTED (sent to blockchain)
   ↓
CONFIRMED ✅ / FAILED ❌
```

#### 5. WSOL (Wrapped SOL) Handling

**Decision:** Transparent WSOL conversion for native SOL

**Rationale:**
- **User-Friendly**: Users can trade with native SOL address (111...1)
- **DEX Compatibility**: Automatically wraps to WSOL (So111...2) for DEX swaps
- **Backward Compatible**: Still accepts WSOL addresses
- **Validation**: Prevents SOL↔WSOL swaps (same asset)

**Implementation:**
- Input validation detects native SOL addresses
- Automatic conversion to WSOL for DEX routing
- Output unwrapping for native SOL destinations

#### 6. Intelligent DEX Routing

**Decision:** Price comparison across multiple DEXs

**Rationale:**
- **Best Execution**: Always get optimal price for users
- **Failover**: If one DEX fails, try alternative
- **Extensible**: Easy to add more DEXs (Orca, Jupiter)
- **Logging**: Full audit trail of routing decisions

**Price Comparison:**
```typescript
quotes = await Promise.all([
  raydiumDex.getQuote(params),
  meteoraDex.getQuote(params)
]);

bestQuote = quotes.sort((a, b) => 
  b.outputAmount - a.outputAmount
)[0];
```

#### 7. Drizzle ORM Choice

**Decision:** Drizzle ORM instead of Prisma/TypeORM

**Rationale:**
- **Type Safety**: Full TypeScript inference without code generation
- **Performance**: Minimal overhead, close to raw SQL
- **Migrations**: SQL-based migrations (readable and version controlled)
- **Bundle Size**: Lightweight compared to alternatives
- **Developer Experience**: Excellent autocompletion and type checking

## Tech Stack

### Core Technologies
- **Runtime:** Node.js 20+ (ESM modules)
- **Language:** TypeScript 5.6 (strict mode)
- **Framework:** Fastify 4.28 (HTTP + WebSocket)
- **Queue:** BullMQ 5.13 + ioredis 5.4
- **Database:** PostgreSQL 16 + Drizzle ORM 0.35
- **Validation:** Zod 3.23
- **Testing:** Jest 29 + ts-jest
- **Logging:** Pino 9.4 (structured JSON)

### Infrastructure
- **Hosting:** Railway.app (free tier)
- **Database:** Railway PostgreSQL (managed)
- **Cache/Queue:** Railway Redis (managed)
- **CI/CD:** GitHub Actions (automatic deployment)

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL 16
- Redis 7
- npm or yarn

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/amanydv72/Eterna.git
cd Eterna/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME
# - REDIS_URL or REDIS_HOST/REDIS_PORT
# - NODE_ENV=development
```

4. **Start PostgreSQL and Redis**

**Option A: Using Docker**
```bash
docker-compose up -d
```

**Option B: Local Installation**
```bash
# PostgreSQL (default port 5432)
# Redis (default port 6379)
```

5. **Run database migrations**
```bash
npm run migration:run
```

6. **Start development server**
```bash
npm run dev
```

Server will be running at `http://localhost:3000`

### Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database (Option 1: Connection URL)
DATABASE_URL=postgresql://user:password@localhost:5432/order_engine

# Database (Option 2: Individual params)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=order_engine

# Redis (Option 1: Connection URL)
REDIS_URL=redis://localhost:6379

# Redis (Option 2: Individual params)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Queue Configuration
QUEUE_CONCURRENCY=10
QUEUE_RATE_LIMIT=100
MAX_RETRY_ATTEMPTS=3

# DEX Configuration (for mock testing)
MOCK_BASE_PRICE=1.0
RAYDIUM_FEE=0.003
METEORA_FEE=0.002
EXECUTION_DELAY_MIN=2000
EXECUTION_DELAY_MAX=3000

# Logging
LOG_LEVEL=info
```

## API Documentation

## API Documentation

### Base URL
- **Production:** `https://eterna-production.up.railway.app`
- **Local:** `http://localhost:3000`

### Health Check

**GET** `/health`

Check if the service is running.

**Response:**
```json
{
  "name": "Order Execution Engine",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "orders": "/api/orders"
  }
}
```

### Execute Order

**POST** `/api/orders/execute`

Submit a new market order for execution.

**Request Body:**
```json
{
  "tokenIn": "11111111111111111111111111111111",
  "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amountIn": 1.5,
  "slippage": 0.01,
  "orderType": "market"
}
```

**Parameters:**
- `tokenIn` (string, required): Source token address (supports native SOL or WSOL)
- `tokenOut` (string, required): Destination token address
- `amountIn` (number, required): Amount to swap (> 0)
- `slippage` (number, required): Slippage tolerance (0.001 - 0.5)
- `orderType` (string, required): Order type ("market")

**Success Response (200):**
```json
{
  "success": true,
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Order queued successfully",
  "data": {
    "tokenIn": "So11111111111111111111111111111111111111112",
    "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amountIn": 1.5,
    "slippage": 0.01
  },
  "websocketUrl": "ws://localhost:3000/ws/orders/550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Cannot swap SOL for WSOL - they represent the same asset",
  "statusCode": 400
}
```

### Get Order Details

**GET** `/api/orders/:id`

Retrieve details of a specific order.

**Response:**
```json
{
  "order": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "confirmed",
    "tokenIn": "So11111111111111111111111111111111111111112",
    "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amountIn": "1.5",
    "amountOut": "155.25",
    "dex": "raydium",
    "transactionSignature": "5j7s...",
    "createdAt": "2025-11-08T10:30:00.000Z",
    "updatedAt": "2025-11-08T10:30:05.000Z"
  }
}
```

### List Orders

**GET** `/api/orders?status=confirmed&limit=10&offset=0`

Retrieve order history with optional filters.

**Query Parameters:**
- `status` (optional): Filter by status (pending/routing/building/submitted/confirmed/failed)
- `limit` (optional, default: 10): Number of orders per page
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "orders": [
    {
      "id": "...",
      "status": "confirmed",
      "tokenIn": "...",
      "amountIn": "1.5",
      "createdAt": "2025-11-08T10:30:00.000Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 42
  }
}
```

### Get Order Statistics

**GET** `/api/orders/stats`

Get aggregated order statistics.

**Response:**
```json
{
  "stats": {
    "pending": 5,
    "routing": 2,
    "building": 1,
    "submitted": 3,
    "confirmed": 150,
    "failed": 8,
    "total": 169
  }
}
```

## WebSocket Real-Time Updates

After submitting an order, connect to the WebSocket URL provided in the response to receive real-time status updates.

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/orders/550e8400-e29b-41d4-a716-446655440000');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Order update:', update);
};
```

### Status Update Messages

```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "message": "Comparing prices across DEXs...",
  "timestamp": "2025-11-08T10:30:01.000Z",
  "data": {
    "raydiumQuote": 155.25,
    "meteoraQuote": 154.80,
    "selectedDex": "raydium"
  }
}
```

### Connection Events

- **Connected:** Initial connection established
- **Status Updates:** Real-time order progress (every state change)
- **Completion:** Order confirmed or failed
- **Error:** Connection or processing error
- **Close:** Connection closed after order completion

### Status Sequence

1. **PENDING** - Order queued in BullMQ
2. **ROUTING** - Comparing DEX prices (Raydium vs Meteora)
3. **BUILDING** - Creating swap transaction
4. **SUBMITTED** - Transaction sent to blockchain
5. **CONFIRMED** - Order executed successfully ✅
6. **FAILED** - Order execution failed (with retry if attempts remaining) ❌

## WSOL Support

The system automatically handles Wrapped SOL (WSOL) for seamless native SOL trading.

### Token Addresses

- **Native SOL:** `11111111111111111111111111111111`
- **Wrapped SOL (WSOL):** `So11111111111111111111111111111111111111112`
- **USDC:** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **USDT:** `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

### Automatic Conversion

**Native SOL → Token (e.g., USDC)**
```json
{
  "tokenIn": "11111111111111111111111111111111",  // Native SOL
  "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amountIn": 10
}
```
System automatically:
1. Wraps native SOL to WSOL
2. Executes WSOL → USDC swap on DEX
3. Returns USDC to user

**Token → Native SOL (e.g., USDC → SOL)**
```json
{
  "tokenIn": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "tokenOut": "11111111111111111111111111111111",  // Native SOL
  "amountIn": 100
}
```
System automatically:
1. Executes USDC → WSOL swap on DEX
2. Unwraps WSOL to native SOL
3. Returns native SOL to user

### Validation

The system prevents invalid SOL/WSOL swaps:
```json
// ❌ INVALID: Cannot swap SOL for WSOL
{
  "tokenIn": "11111111111111111111111111111111",
  "tokenOut": "So11111111111111111111111111111111111111112"
}

// Error: "Cannot swap SOL for WSOL - they represent the same asset"
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Test Coverage

**Current Coverage: 84.74%**

```
File                  | % Stmts | % Branch | % Funcs | % Lines
----------------------|---------|----------|---------|--------
All files             |   84.74 |    78.33 |   88.23 |   84.21
 api                  |     100 |      100 |     100 |     100
 config               |   91.66 |       75 |     100 |   91.30
 queue                |   83.33 |    77.27 |   85.71 |   82.60
 services/dex         |   88.88 |    85.71 |   90.90 |   88.46
 services/order       |   82.35 |    71.42 |   87.50 |   81.25
 websocket            |   79.16 |    66.66 |   83.33 |   78.57
```

### Test Suites

1. **API Tests** (`tests/unit/api.test.ts`)
   - Order validation
   - WSOL address handling
   - Error responses

2. **DEX Tests** (`tests/unit/dex.test.ts`)
   - Price comparison
   - Quote generation
   - DEX selection logic

3. **Queue Tests** (`tests/unit/queue.test.ts`)
   - Job processing
   - Retry logic
   - Rate limiting

4. **WebSocket Tests** (`tests/unit/websocket.test.ts`)
   - Connection lifecycle
   - Status broadcasting
   - Error handling

5. **Integration Tests** (`src/integration/orderExecutionFlow.test.ts`)
   - End-to-end order execution
   - Multi-order concurrency
   - DEX routing validation

### Postman Collection

Import `postman_collection.json` for comprehensive API testing:

- **40+ test cases** covering all endpoints
- **Automated validation** scripts
- **Pre-configured variables** for local and production
- **WSOL feature tests** demonstrating native SOL support
- **Error scenario tests** for validation coverage

**Collection Highlights:**
- Execute orders with native SOL
- Execute orders with WSOL (backward compatibility)
- Invalid swap validation (SOL ↔ WSOL)
- Order retrieval and filtering
- WebSocket health checks

## Deployment

### Production Deployment (Railway)

The application is deployed on Railway.app with managed PostgreSQL and Redis instances.

**Live URL:** https://eterna-production.up.railway.app/

**Infrastructure:**
- **Platform:** Railway.app (free tier)
- **Database:** PostgreSQL 16 (managed, persistent storage)
- **Cache/Queue:** Redis 7 (managed, in-memory)
- **Auto-Deploy:** GitHub integration (automatic deployment on push)

### Deployment Process

1. **Code Push:** Push to GitHub `main` branch
2. **Railway Trigger:** Webhook triggers new deployment
3. **Build:** `npm run build` (TypeScript compilation + migration copy)
4. **Migrations:** `npm run migration:run` (creates database tables)
5. **Start:** `node dist/server.js` (starts Fastify server)

### Environment Configuration

Railway automatically injects:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NODE_ENV=production` - Enables production optimizations

Additional variables configured:
- Queue settings (concurrency, rate limit)
- DEX configuration (fees, delays)
- Logging level

### Monitoring

**Health Check:** https://eterna-production.up.railway.app/health

**Logs:** Available in Railway dashboard
- Application logs (Pino structured JSON)
- Database connection status
- Redis connection status
- Migration execution logs
- Order processing events

### Deploy Your Own

1. Fork the repository
2. Create Railway account (free tier)
3. Create new project from GitHub repo
4. Add PostgreSQL service
5. Add Redis service
6. Configure environment variables
7. Deploy automatically on push

## Project Structure

```
backend/
├── src/
│   ├── api/                  # API routes and handlers
│   │   ├── index.ts          # Route registration
│   │   ├── routes/
│   │   │   └── orders.ts     # Order endpoints
│   │   └── schemas.ts        # Zod validation schemas
│   ├── config/               # Configuration modules
│   │   ├── database.ts       # PostgreSQL connection
│   │   ├── environment.ts    # Environment variables
│   │   └── redis.ts          # Redis connection
│   ├── database/             # Database layer
│   │   ├── index.ts          # Drizzle DB instance
│   │   ├── schema.ts         # Table schemas
│   │   ├── repository.ts     # Data access layer
│   │   ├── mappers.ts        # DTO transformations
│   │   ├── migrate.ts        # Migration runner
│   │   └── migrations/       # SQL migration files
│   ├── models/               # Domain models
│   │   ├── Order.ts          # Order entity
│   │   ├── DEXQuote.ts       # DEX quote model
│   │   ├── enums.ts          # Status enums
│   │   └── validators.ts     # Business validation
│   ├── queue/                # Queue management
│   │   ├── index.ts          # Queue exports
│   │   ├── QueueManager.ts   # BullMQ orchestration
│   │   ├── orderQueue.ts     # Order queue definition
│   │   └── orderProcessor.ts # Job processing logic
│   ├── services/             # Business logic
│   │   ├── cache/
│   │   │   └── CacheService.ts
│   │   ├── dex/              # DEX integration
│   │   │   ├── DexService.ts # Multi-DEX routing
│   │   │   ├── MockDexRouter.ts
│   │   │   ├── MockRaydiumDex.ts
│   │   │   ├── MockMeteoraDex.ts
│   │   │   └── MockSwapExecutor.ts
│   │   ├── order/
│   │   │   ├── OrderService.ts    # Order orchestration
│   │   │   └── OrderValidator.ts  # Validation logic
│   │   └── queue/
│   │       └── QueueService.ts
│   ├── websocket/            # WebSocket layer
│   │   ├── index.ts
│   │   ├── routes.ts         # WS route registration
│   │   └── WebSocketManager.ts # Connection management
│   ├── utils/                # Utilities
│   │   ├── errors.ts         # Custom error classes
│   │   ├── helpers.ts        # Helper functions
│   │   ├── logger.ts         # Pino logger config
│   │   └── response.ts       # Response formatters
│   ├── integration/          # Integration tests
│   └── server.ts             # Application entry point
├── tests/                    # Unit tests
│   ├── setup.ts
│   └── unit/
├── scripts/                  # Build scripts
│   └── copy-migrations.js
├── docs/                     # Documentation
├── postman_collection.json   # Postman test collection
├── package.json
├── tsconfig.json
├── jest.config.js
├── drizzle.config.ts
└── README.md
```



## Author

**GitHub:** [@amanydv72](https://github.com/amanydv72)

**Repository:** [Eterna](https://github.com/amanydv72/Eterna)

---

