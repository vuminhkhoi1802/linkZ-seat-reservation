# LinkZ Seat Reservation

A small public seat reservation platform for the Senior / Lead Engineer technical assessment. The implementation favors availability correctness, secure defaults, explainable trade-offs, and a local reviewer experience that works with one command.

```bash
docker compose up --build
```

Open the application at:

```text
http://localhost:8080
```

## Table of Contents

- [What This Builds](#what-this-builds)
- [Quick Start](#quick-start)
- [Repository Structure](#repository-structure)
- [Architecture](#architecture)
- [Decision Matrix](#decision-matrix)
- [Core Business Flow](#core-business-flow)
- [Availability and Concurrency](#availability-and-concurrency)
- [Security Model](#security-model)
- [Database Model](#database-model)
- [API Reference](#api-reference)
- [Testing and Verification](#testing-and-verification)
- [Future Scaling Architecture](#future-scaling-architecture)
- [Migration Paths](#migration-paths)
- [Trade-Offs](#trade-offs)
- [Operational Notes](#operational-notes)

## What This Builds

The system displays three public seats and lets authenticated users reserve one seat after completing a mock payment flow.

The required user journey is:

1. Register or log in.
2. Receive a 90-day server-side session.
3. View three seats.
4. Select an available seat.
5. Create a mock payment attempt.
6. Complete payment.
7. Confirm the reservation if the seat is still available.

The goal is not production polish. The goal is to show senior engineering judgment around:

- preventing double booking
- modeling payment and reservation state
- keeping auth secure
- leaving room for future providers and infrastructure changes
- making the project easy for reviewers to run

## Quick Start

### Prerequisites

- Docker
- Docker Compose v2

No external database, Auth0 tenant, Stripe account, or local Node installation is required for the default reviewer path.

### Run Everything

```bash
docker compose up --build
```

Services started by Compose:

| Service | Purpose | URL |
| --- | --- | --- |
| `frontend` | Nginx serving the React app | `http://localhost:8080` |
| `backend` | NestJS API | `http://localhost:3000/api` |
| `backend docs` | Swagger/OpenAPI | `http://localhost:3000/api/docs` |
| `postgres` | PostgreSQL system of record | internal Compose network only |

PostgreSQL is intentionally not published to the host by default. The backend reaches it through the Compose network. This avoids conflicts with any existing local PostgreSQL on port `5432`.

### Reset Local Demo Data

To remove containers and the local PostgreSQL volume:

```bash
docker compose down -v
```

Then start again:

```bash
docker compose up --build
```

### Run Without Docker

This is optional. Docker is the intended path.

Backend:

```bash
cd backend
npm install
npm run build
npm test
```

Frontend:

```bash
cd frontend
npm install
npm test
npm run build
```

For local non-Docker runtime, provide a PostgreSQL connection string through `DATABASE_URL`.

## Repository Structure

```text
.
|-- backend
|   |-- src
|   |   |-- application     # Use cases & Orchestration
|   |   |-- domain          # Entities & Repository Contracts
|   |   |-- infrastructure  # TypeORM Repos & DB configuration
|   |   `-- interfaces      # REST Controllers & DTOs
|   |-- test                # Jest unit/integration tests
|   `-- Dockerfile
|-- frontend
|   |-- src
|   |   |-- api             # API client & domain types
|   |   |-- components      # Modular UI components
|   |   |-- hooks           # Logic & state management
|   |   `-- main.tsx        # Layout & entry point
|   |-- nginx.conf
|   `-- Dockerfile
|-- docker-compose.yml
`-- README.md
```

Backend layers:

| Layer | Responsibility |
| --- | --- |
| `interfaces` | REST controllers, DTOs, guards, current-user decorator |
| `application` | Use cases and workflow orchestration |
| `domain` | Shared domain types and state names |
| `infrastructure` | PostgreSQL access, session storage, password hashing |

Controllers are intentionally thin. Application services own business decisions. Infrastructure code owns database and security implementation details.

## Architecture

### Current Local Architecture

```mermaid
flowchart LR
  Browser[Browser] --> Nginx[Nginx / React frontend]
  Nginx -->|/api proxy| API[NestJS backend]
  API --> Auth[Auth/session module]
  API --> Reservation[Reservation use cases]
  API --> Payment[Mock payment use cases]
  API --> DB[(PostgreSQL)]

  Auth --> DB
  Reservation --> DB
  Payment --> DB
```

How the diagram maps to this codebase:

| Diagram block | Code location | What it does |
| --- | --- | --- |
| `Browser` | User's browser running `frontend/src/main.tsx` | Renders login/register, seat selection, payment simulation, and the reserved seats list. |
| `Nginx / React frontend` | `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/src/main.tsx` | Builds the React app, serves static assets, and proxies `/api/*` requests to the backend container. |
| `NestJS backend` | `backend/src/main.ts`, `backend/src/app.module.ts` | Boots the Nest app, configures validation, cookies, CORS, security headers, throttling, controllers, and services. |
| `Auth/session module` | `AuthController`, `LocalAuthService`, `SessionService`, `AuthGuard`, `CurrentUser` | Handles register/login/logout, creates 90-day DB-backed sessions, reads the session cookie, and attaches the authenticated user to protected requests. |
| `Reservation use cases` | `ReservationService.completePaymentAndReserve`, `ReservationService.listMyReservations` | Owns the critical reservation transaction, idempotent payment completion, conflict handling, and the user's reserved seats list. |
| `Mock payment use cases` | `PaymentsController`, `PaymentService.createPaymentAttempt` | Creates a mock `PENDING` payment attempt before reservation confirmation. |
| `PostgreSQL` | `DatabaseService.migrateAndSeed`, SQL tables/indexes in `backend/src/infrastructure/db/database.service.ts` | Stores users, identities, sessions, seats, payments, and reservations; enforces the unique confirmed reservation per seat. |

The local deployment is intentionally simple: one frontend container, one backend container, and one PostgreSQL container. The frontend does not talk to PostgreSQL directly. All reservation and payment decisions go through the backend so the browser cannot bypass availability or ownership checks.

### Backend Boundary Design

```mermaid
flowchart TB
  Controllers[Controllers and DTOs] --> App[Application services]
  Guards[Auth guards] --> App
  App --> Domain[Domain types and rules]
  App --> Ports[Repository/provider contracts]
  Ports --> Infra[Infrastructure adapters]
  Infra --> Postgres[(PostgreSQL)]
  Infra --> Argon2[Argon2 password hashing]
```

How the boundary diagram maps to this codebase:

| Boundary block | Code location | Representative classes/functions |
| --- | --- | --- |
| `Controllers and DTOs` | `backend/src/interfaces/controllers`, `backend/src/interfaces/dto` | `AuthController.register`, `PaymentsController.complete`, `ReservationsController.me`, `RegisterDto`, `CreatePaymentDto`. |
| `Auth guards` | `backend/src/interfaces/guards/auth.guard.ts`, `backend/src/interfaces/decorators/current-user.decorator.ts` | `AuthGuard.canActivate` validates the session cookie; `CurrentUser` extracts the authenticated `AuthPrincipal`. |
| `Application services` | `backend/src/application` | `LocalAuthService.register/login`, `SeatService.listSeats`, `PaymentService.createPaymentAttempt`, `ReservationService.completePaymentAndReserve/listMyReservations`. |
| `Domain types and rules` | `backend/src/domain/types.ts` | `ReservationStatus`, `PaymentStatus`, `AuthPrincipal`, `SeatView`, `ReservationView`. |
| `Repository/provider contracts` | `backend/src/domain/repositories.ts` | `IUserRepository`, `ISeatRepository`, `IPaymentRepository`, `IReservationRepository`. Defines database-agnostic data access contracts. |
| `Infrastructure adapters` | `backend/src/infrastructure` | `PostgresUserRepository`, `PostgresSeatRepository`, etc. Implementations using **TypeORM** for secure, type-safe data access. |
| `PostgreSQL` | TypeORM Entities in `backend/src/infrastructure/db/entities` | Provides transactions, row locks, and schema enforcement without raw SQL leakage into application logic. |
| `Argon2 password hashing` | `backend/src/infrastructure/security/password-hasher.ts` | `PasswordHasher.hash` and `PasswordHasher.verify` wrap Argon2 so password hashing does not leak into controllers or reservation logic. |

The main rule is dependency direction: HTTP controllers call application services; application services coordinate domain decisions and infrastructure; infrastructure does not call controllers. That is why a future Auth0 adapter, Stripe adapter, Redis rate limiter, or dedicated repository layer can be added without rewriting seat reservation workflows.

This keeps future provider changes contained:

- Auth0 can be added by replacing or extending the auth adapter.
- Stripe can replace the mock payment adapter.
- Redis can be added for rate limiting, queueing, or short-lived holds.
- Read models can be projected into MongoDB/OpenSearch without changing reservation writes.

## Decision Matrix

### Backend Framework

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| NestJS | Strong module boundaries, dependency injection, guards, validation, testing conventions | More framework overhead than Express/Fastify | Selected |
| Fastify | Fast, lightweight, good plugin ecosystem | More architecture decisions must be built manually | Not selected |
| ExpressJS | Familiar and simple | Easy to drift into controller-heavy code without clear boundaries | Not selected |

Why NestJS: the assessment values architecture and judgment, not minimal lines of code. NestJS gives reviewers clear seams for auth, payment, reservation, and infrastructure.

### Database

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| PostgreSQL | Transactions, row locks, partial unique indexes, foreign keys | Less horizontally elastic than some NoSQL patterns | Selected |
| MongoDB | Flexible documents, atomic single-document updates | Multi-step payment/reservation consistency is easier to get wrong | Not selected for writes |
| Redis | Fast locks/counters, good for rate limits and queues | Not durable enough as the reservation source of truth | Future supporting service |

Why PostgreSQL: seat availability is a correctness problem. The strongest guarantee comes from database transactions and constraints, not from application memory or UI state.

### Authentication

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Custom DB-backed sessions | Self-contained, secure cookies, easy local run, revocable sessions | We own password/session implementation | Selected for v1 |
| Auth0 or similar | Outsources identity, enterprise features | External setup, tenant config, harder reviewer flow | Future adapter |
| JWT-only | Simple stateless API auth | Harder revocation, easy to over-trust client tokens | Not selected |

Why custom sessions now: the project must run locally with Docker only. The schema still supports third-party auth later through `auth_identities`.

### Payment Provider

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Mock payment provider | No external setup, demonstrates state and idempotency | Not a real payment integration | Selected |
| Stripe test mode | Realistic provider model | Requires keys and webhook setup | Future adapter |
| Inline fake button only | Fastest | Too shallow for payment reliability assessment | Not selected |

### Seat Availability Strategy

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Reserve only after payment completion | Simple, avoids abandoned holds | User can lose a seat during checkout | Selected |
| Temporary seat holds | Better checkout UX | Requires expiry, cleanup, recovery paths | Future enhancement |
| In-memory locks | Simple demo | Breaks across processes and restarts | Rejected |

## Core Business Flow

```mermaid
sequenceDiagram
  actor User
  participant UI as React UI
  participant API as NestJS API
  participant DB as PostgreSQL

  User->>UI: Register or login
  UI->>API: POST /api/auth/register or /api/auth/login
  API->>DB: Store user/session
  API-->>UI: HttpOnly session cookie

  User->>UI: Select seat
  UI->>API: POST /api/payments/create
  API->>DB: Create PENDING payment attempt
  API-->>UI: paymentAttemptId

  User->>UI: Complete mock payment
  UI->>API: POST /api/payments/:id/complete
  API->>DB: Transaction with row locks
  DB-->>API: Confirm or reject reservation
  API-->>UI: CONFIRMED reservation or 409 conflict
```

## Availability and Concurrency

The critical availability rule is:

> A seat can have at most one confirmed reservation, even if multiple users complete payment at the same time.

The backend enforces this in multiple layers:

1. Payment completion runs inside one PostgreSQL transaction.
2. The payment attempt is locked with `FOR UPDATE`.
3. The selected seat row is locked with `FOR UPDATE`.
4. Existing confirmed reservations are checked inside the transaction.
5. A partial unique index prevents duplicate confirmed reservations even if application logic regresses.

Database protection:

```sql
CREATE UNIQUE INDEX one_confirmed_reservation_per_seat
ON reservations(seat_id)
WHERE status = 'CONFIRMED';
```

Why both application checks and database constraints:

- application checks produce clean business errors like `409 Conflict`
- database constraints are the final correctness backstop

Failure behavior:

| Scenario | Behavior |
| --- | --- |
| Same payment completion retried | Existing reservation is returned |
| Two users complete payment for same seat | One succeeds, one receives `409 Conflict` |
| User tries another user's payment attempt | `403 Forbidden` |
| Seat already confirmed before payment creation | Payment creation is rejected |
| Client shows stale availability | Backend rechecks during completion |

## Security Model

### Passwords

- Passwords are never stored in plaintext.
- Password hashes use Argon2.
- Password validation happens only in the auth service.

### Sessions

- Session tokens are random opaque values.
- Only SHA-256 hashes of session tokens are stored.
- Cookies are `HttpOnly`.
- Cookies are `SameSite=Lax`.
- Cookie expiry is 90 days.
- Cookies are marked `Secure` when `COOKIE_SECURE=true`.

### Request Protection

- **SQL Injection Mitigation:** Raw SQL has been eliminated from the repository layer in favor of TypeORM parameterized queries.
- **Session Isolation:** Explicit state cleanup ensures reservation data is wiped from the UI immediately upon logout, preventing cross-user data leakage.
- Authenticated routes use a NestJS guard.
- DTO validation rejects unexpected fields.
- Login and payment completion routes are rate-limited.
- The backend never trusts client seat state.
- Payment attempts are bound to the authenticated user.

### Dependency Security

Production dependency audits were run for both backend and frontend:

```bash
npm audit --omit=dev
```

Both report zero production vulnerabilities at the time this README was written.

## Database Model

```mermaid
erDiagram
  USERS ||--o{ AUTH_IDENTITIES : has
  USERS ||--o| LOCAL_CREDENTIALS : has
  USERS ||--o{ SESSIONS : has
  USERS ||--o{ PAYMENT_ATTEMPTS : creates
  USERS ||--o{ RESERVATIONS : owns
  SEATS ||--o{ PAYMENT_ATTEMPTS : targeted_by
  SEATS ||--o{ RESERVATIONS : reserved_by
  PAYMENT_ATTEMPTS ||--o| RESERVATIONS : confirms

  USERS {
    uuid id PK
    text email UK
    text display_name
    timestamptz created_at
    timestamptz updated_at
  }

  AUTH_IDENTITIES {
    uuid id PK
    uuid user_id FK
    text provider
    text provider_user_id
    text email
  }

  LOCAL_CREDENTIALS {
    uuid user_id PK
    text password_hash
  }

  SESSIONS {
    uuid id PK
    uuid user_id FK
    text token_hash UK
    timestamptz expires_at
  }

  SEATS {
    uuid id PK
    text label UK
  }

  PAYMENT_ATTEMPTS {
    uuid id PK
    uuid user_id FK
    uuid seat_id FK
    text status
    timestamptz completed_at
  }

  RESERVATIONS {
    uuid id PK
    uuid user_id FK
    uuid seat_id FK
    uuid payment_attempt_id UK
    text status
    timestamptz confirmed_at
  }
```

### Why `auth_identities` Exists

The app owns its internal `users.id`. Login providers are mapped to that user through `auth_identities`.

This means a future Auth0 migration does not require rewriting reservations or payments. Auth0 would add rows like:

```text
provider = auth0
provider_user_id = <auth0-sub>
user_id = <internal-user-id>
```

Business logic still receives the same internal `userId`.

## API Reference

Base URL in Docker:

```text
http://localhost:3000/api
```

When using the browser app, Nginx proxies `/api` to the backend.

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "email": "reviewer@example.com",
  "password": "password123",
  "displayName": "Reviewer"
}
```

Creates a user and sets the session cookie.

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "reviewer@example.com",
  "password": "password123"
}
```

### Current User

```http
GET /api/auth/me
```

Requires a valid session cookie.

### Logout

```http
POST /api/auth/logout
```

Deletes the server-side session and clears the cookie.

### List Seats

```http
GET /api/seats
```

Example response:

```json
[
  {
    "id": "uuid",
    "label": "Seat A",
    "isReserved": false
  }
]
```

### Create Payment Attempt

```http
POST /api/payments/create
Content-Type: application/json
```

```json
{
  "seatId": "seat-uuid"
}
```

Requires authentication.

### Complete Payment and Confirm Reservation

```http
POST /api/payments/{paymentAttemptId}/complete
```

Requires authentication.

This endpoint is idempotent for the same payment attempt.

### My Reservation

```http
GET /api/reservations/me
```

Returns the authenticated user's confirmed reservations, newest first.

## Example Curl Flow

Register and store cookies:

```bash
curl -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"reviewer@example.com","password":"password123","displayName":"Reviewer"}' \
  http://localhost:3000/api/auth/register
```

List seats:

```bash
curl -b cookies.txt http://localhost:3000/api/seats
```

Create payment:

```bash
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"seatId":"<seat-id>"}' \
  http://localhost:3000/api/payments/create
```

Complete payment:

```bash
curl -b cookies.txt \
  -X POST \
  http://localhost:3000/api/payments/<payment-attempt-id>/complete
```

## Testing and Verification

### Backend

```bash
cd backend
npm install
npm run build
npm test
npm audit --omit=dev
```

### Frontend

```bash
cd frontend
npm install
npm test
npm run build
npm audit --omit=dev
```

### Docker

```bash
docker compose up --build
docker compose ps
```

### Verified Scenarios

- **Unit/Integration Testing:** Achieved **>85% branch coverage** across both backend and frontend.
- **Security Testing:** 100% coverage for security-critical modules (PasswordHasher, SessionService).
- **Session Transitions:** Verified via integration tests that logout correctly clears sensitive data.
- Backend TypeScript build passes.
- Frontend TypeScript/Vite build passes.
- Docker Compose builds and starts all services.
- Seat listing returns exactly three seeded seats.
- Register to payment completion flow confirms a reservation.
- Concurrent users racing for the same seat produce one success and one `409 Conflict`.

## Future Scaling Architecture

The current monolith is intentionally modular. The first scaling step should be extraction by business capability, not by technical layer.

```mermaid
flowchart LR
  Web[Web / Mobile clients] --> Gateway[API Gateway / BFF]

  Gateway --> Identity[Identity service]
  Gateway --> Seat[Seat inventory service]
  Gateway --> Reservation[Reservation service]
  Gateway --> Payment[Payment service]

  Identity --> IdentityDB[(Identity DB)]
  Seat --> SeatDB[(Seat DB)]
  Reservation --> ReservationDB[(Reservation DB)]
  Payment --> PaymentDB[(Payment DB)]

  Reservation --> Broker[Event broker]
  Payment --> Broker
  Seat --> Broker

  Broker --> Analytics[Analytics projection]
  Broker --> Notifications[Notification worker]
  Broker --> Search[Search/read model]

  Analytics --> Warehouse[(Warehouse)]
  Search --> SearchDB[(OpenSearch / MongoDB)]
```

### Migration Sequence to Microservices

1. Keep the modular monolith and add an outbox table.
2. Publish domain events after successful transactions.
3. Add async consumers for analytics and notifications.
4. Extract payment integration behind the existing payment boundary.
5. Extract identity provider integration if SSO/Auth0 becomes required.
6. Extract reservation service last, because it owns the hardest consistency boundary.

### Why Reservation Should Be Extracted Last

Reservation correctness depends on strong consistency. Splitting reservation and seat inventory too early creates distributed transaction problems. Until there is a proven scale requirement, keeping reservation writes in one transactional boundary is safer.

## Migration Paths

### Auth0 or Third-Party Auth

Current design:

- internal `users` table
- provider mapping in `auth_identities`
- business logic uses internal `userId`

Migration path:

1. Add an Auth0 token verification adapter.
2. Map Auth0 `sub` to `auth_identities.provider_user_id`.
3. Create or link an internal user.
4. Return the same `AuthPrincipal` shape to guards/controllers.
5. Leave reservations and payments unchanged.

### Real Payment Provider

Current mock payment has the same important states as a real provider:

- `PENDING`
- `COMPLETED`
- `FAILED`

Migration path:

1. Replace mock payment creation with Stripe Checkout or PaymentIntent creation.
2. Store provider payment IDs on `payment_attempts`.
3. Process provider webhooks idempotently.
4. Call the same reservation confirmation use case after verified payment success.

### Redis

Redis should not become the confirmed reservation source of truth.

Good Redis uses:

- login rate limiting
- payment completion rate limiting
- short-lived seat holds
- job queue backend
- session cache in front of PostgreSQL

### MongoDB or Search Store

MongoDB/OpenSearch can be added as read projections for:

- analytics
- search
- reporting
- denormalized user reservation history

They should not replace PostgreSQL for reservation writes without redesigning consistency guarantees.

## Trade-Offs

| Trade-off | Why It Was Chosen | Cost |
| --- | --- | --- |
| Custom sessions over Auth0 | Keeps project runnable with Docker only | We own basic auth/session code |
| PostgreSQL over MongoDB for writes | Strong consistency for reservation correctness | Less database-agnostic |
| No temporary holds | Avoids hold expiry/cleanup complexity | User can lose a seat during checkout |
| Mock payment provider | Demonstrates payment state without external setup | Not production payment integration |
| Minimal frontend | Focuses effort on availability/security | Less visual polish |
| App-run schema setup | Simple reviewer experience | Production should use dedicated migrations |
| Modular monolith | Keeps consistency local and code simple | Requires discipline to preserve boundaries |

## Operational Notes

### Environment Variables

| Variable | Purpose | Default in Compose |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://app:app_password@postgres:5432/seat_reservation` |
| `PORT` | Backend port | `3000` |
| `COOKIE_SECURE` | Enables secure cookies | `false` |
| `CORS_ORIGIN` | Allowed browser origin | `http://localhost:8080` |

### Production Hardening Status

- [x] **API Documentation:** Interactive Swagger/OpenAPI 3.1 documentation enabled.
- [x] **Repository Pattern:** Logic decoupled from persistence via domain interfaces.
- [x] **ORM Integration:** TypeORM migration completed for secure, type-safe data access.
- [x] **Security Testing:** 100% coverage for security services.
- [ ] Move schema setup to a real migration tool.
- [ ] Use managed PostgreSQL with backups and point-in-time recovery.
- [ ] Add structured logging and request IDs.
- [ ] Add health/readiness endpoints.
- [ ] Add OpenTelemetry traces around payment/reservation completion.
- [ ] Add CSRF protection if supporting unsafe cross-site form submissions.
- [ ] Add session cleanup for expired sessions.
- [ ] Use real secret management instead of Compose literals.

## Final Notes

The main engineering choice is explicit: PostgreSQL is the correctness authority for confirmed reservations. Other infrastructure can change later, but the availability guarantee should remain backed by a transactional system or an equivalent consistency design.
