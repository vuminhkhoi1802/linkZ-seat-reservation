# Backend: LinkZ Seat Reservation API

High-performance NestJS API architected for transactional consistency, modularity, and security.

## Tech Stack
- **Framework:** NestJS
- **Persistence:** TypeORM (PostgreSQL)
- **Authentication:** Custom Session-based (HttpOnly Cookies)
- **Security:** Argon2, Helmet, Throttler
- **Documentation:** Swagger/OpenAPI 3.1
- **Testing:** Jest

## Architecture: The 3-Layer Pattern
The backend is structured to separate business rules from infrastructure concerns, ensuring high maintainability and testability.

1.  **Interface Layer (`interfaces/`):** Thin controllers managing HTTP concerns and DTO-based validation.
2.  **Application Layer (`application/`):** Use cases and workflow orchestration. This layer owns transaction management and coordinates between repositories.
3.  **Domain Layer (`domain/`):** Database-agnostic interfaces (`repositories.ts`) and core business models (`types.ts`).
4.  **Infrastructure Layer (`infrastructure/`):** Concrete implementations of domain interfaces using TypeORM, along with database configuration and security adapters.

## Persistence: TypeORM & Repository Pattern
We've implemented a robust repository layer that abstracts database interactions:
- **Database Agnostic:** Naming conventions (e.g., `TypeOrmSeatRepository`) and domain-level interfaces ensure the core logic isn't tied to a specific SQL dialect.
- **SQL Injection Prevention:** All queries are mediated by the ORM using parameterized Query Builders.
- **Transactional Consistency:** Leverages pessimistic row locking (`setLock('pessimistic_write')`) to guarantee atomic seat reservations under concurrent load.

## API Documentation
The API is fully documented using Swagger.
- **Interactive UI:** Available at `http://localhost:3000/api/docs`
- **Standardized:** Provides a comprehensive schema for all endpoints, DTOs, and error responses.

## Security Highlights
- **Session-First Auth:** Uses random opaque tokens in `HttpOnly` cookies to neutralize XSS theft risks.
- **Session Isolation:** Reactive state cleanup prevents data leakage during user logout/login transitions.
- **Password Hardening:** Argon2-based hashing for all local credentials.

## Testing Strategy
Achieved **>85% branch coverage** across all critical modules.
- **Resilient Unit Tests:** Services are tested by mocking Repository interfaces, making tests immune to SQL schema changes.
- **Full Coverage Repos:** Infrastructure repositories are 100% verified, including fallback logic for standalone vs. transactional queries.

```bash
cd backend
npm test -- --coverage
```
