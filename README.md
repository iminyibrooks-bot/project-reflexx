# Project Reflex 🚀

A high-performance real-time dispatch management system built with TypeScript, Express, Socket.io, and PostgreSQL.

## Architecture Overview

apps/
└── backend/
    ├── src/
    │   ├── config/       # Database pool, SQL migration schemas & seeds
    │   ├── controllers/  # Auth & Delivery HTTP logic
    │   ├── routes/       # Express API routes (/api/auth, /api/deliveries)
    │   ├── utils/        # JWT utilities & auth signers
    │   └── index.ts      # Express & Socket.io entry point

## System Workflow & Real-Time Engine

* **Authentication:** JWT-based auth supporting three distinct user roles: RETAILER, DISPATCHER, and RIDER.
* **Dispatch Engine:** Real-time location tracking using WebSockets (Socket.io).
* **Database Layer:** Connection-pooled PostgreSQL engine for transaction logging and location history audits.

## Backend Environment Setup

1. Navigate to the backend directory:
   cd apps/backend

2. Create your environment file from the template:
   cp .env.example .env

3. Configure your local PostgreSQL credentials inside .env:
   PORT=5000
   CORS_ORIGIN=http://localhost:3000
   DATABASE_URL=postgresql://user:password@localhost:5432/reflex_db
   JWT_SECRET=supersecretkey

4. Run schema migration:
   psql -d reflex_db -f src/config/schema.sql

---

## Team Roles & Ownership

* **Brooks (Team Lead):** Core backend architecture, DB pooling, Auth engine, and Socket.io event distribution pipeline.
* **Cess, Joyce, Wangari, Jerry:** Frontend application features, UI components, client state, and API integrations.
* **Gavin (Database & Data Engineering):** Database seeding automation (seed.ts), mock data generation, and local test environment tooling.
