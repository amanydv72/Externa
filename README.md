# Order Execution Engine

> DEX order execution engine with WebSocket status updates and intelligent routing

## 🎯 Overview

A production-ready order execution engine that processes market orders with DEX routing across Raydium and Meteora, real-time WebSocket status updates, and robust queue management.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Order Type Selection](#order-type-selection)
- [Deployment](#deployment)
- [Testing](#testing)
- [Demo](#demo)

## ✨ Features

- **Market Order Execution** - Immediate execution at best available price
- **Intelligent DEX Routing** - Automatic price comparison between Raydium and Meteora
- **Real-time WebSocket Updates** - Live order status streaming (6 states)
- **Queue Management** - BullMQ with 10 concurrent orders, 100 orders/min rate limit
- **Retry Logic** - Exponential backoff with max 3 attempts
- **Slippage Protection** - Configurable slippage tolerance
- **Persistent Storage** - PostgreSQL for order history, Redis for active orders

## 🏗️ Architecture

```
Client Request (POST) → API Validation → BullMQ Queue
                                              ↓
WebSocket Upgrade ← Status Updates ← Order Processor
                                              ↓
                                    DEX Router (Raydium vs Meteora)
                                              ↓
                                    Swap Execution → PostgreSQL
```

### Order Status Flow

```
PENDING → ROUTING → BUILDING → SUBMITTED → CONFIRMED
                                              ↓
                                           FAILED (on error)
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Fastify 4.x (HTTP + WebSocket)
- **Queue**: BullMQ 5.x + Redis
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Testing**: Jest
- **Logging**: Pino

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL 16
- Redis 7
- Docker (optional)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd order-execution-engine
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start services with Docker**
```bash
docker-compose up -d
```

5. **Run database migrations**
```bash
npm run migration:generate
npm run migration:run
```

6. **Start development server**
```bash
npm run dev
```

The server will be running at `http://localhost:3000`

## 📖 API Documentation

### Execute Order

**POST** `/api/orders/execute`

Submit a new market order for execution.

**Request Body:**
```json
{
  "type": "market",
  "tokenIn": "So11111111111111111111111111111111111111112",
  "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amountIn": 1.5,
  "slippage": 0.01
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Order queued successfully"
}
```

**WebSocket Updates:**

The connection automatically upgrades to WebSocket after order submission. You'll receive real-time status updates:

```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "message": "Comparing DEX prices...",
  "timestamp": "2025-11-07T10:30:00.000Z"
}
```

### Get Order Details

**GET** `/api/orders/:id`

Retrieve details of a specific order.

### List Orders

**GET** `/api/orders?status=confirmed&limit=10`

Retrieve order history with optional filters.

## 🎯 Order Type Selection

### Why Market Orders?

**Chosen**: Market Order

**Rationale**:
- Most fundamental order type demonstrating core execution flow
- Immediate execution allows testing full DEX routing pipeline
- Best showcases WebSocket real-time updates through rapid state transitions
- Provides foundation for other order types

### Extension Strategy

**Limit Orders** (1-2 weeks):
- Add price monitoring service watching DEX pools
- Implement conditional execution when target price reached
- Extend queue with priority for triggered limit orders

**Sniper Orders** (2-3 weeks):
- Add event listeners for token launches/migrations
- Implement MEV protection and front-running detection
- Integrate Solana program monitoring for new liquidity pools

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Test Coverage:**
- Unit tests for DEX routing logic
- Integration tests for order execution flow
- WebSocket lifecycle tests
- Queue behavior tests

## 🌐 Deployment

**Deployed URL**: [Coming Soon]

**Platform**: Render / Railway (Free Tier)

### Deploy Steps

1. Push to GitHub
2. Connect to Render/Railway
3. Add environment variables
4. Deploy

## 🎥 Demo

**Video Demo**: [YouTube Link - Coming Soon]

**Demonstrates:**
- 5 concurrent order submissions
- WebSocket status updates for all orders
- DEX routing decisions in logs
- Queue processing multiple orders
- Failed order retry logic

## 📊 Postman Collection

Import the collection from `postman/collection.json`

## 📝 License

MIT

---

**Built with ❤️ for DEX trading optimization**
