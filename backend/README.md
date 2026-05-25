# Backend Refactoring: SOLID & Clean Architecture

This document details the architectural improvements applied to the backend to adhere to SOLID principles and enhance maintainability.

## Improvements

### 1. Repository Pattern (DIP & SRP) with TypeORM
Previously, application services (e.g., `ReservationService`) were tightly coupled to raw SQL and the `DatabaseService`. We introduced Repository interfaces in the domain layer and concrete implementations in the infrastructure layer using **TypeORM**.

- **Contracts:** `domain/repositories.ts` defines clear data access interfaces, agnostic of the database client.
- **Entities:** `infrastructure/db/entities/` contains TypeORM entities mirroring the database schema.
- **Implementations:** `infrastructure/repositories/` utilizes TypeORM's `Repository` and `EntityManager`, eliminating raw SQL and mitigating **SQL Injection** risks.
- **Benefit:** Application services now focus purely on orchestration (SRP) and depend on abstractions (DIP), making them resilient to infrastructure changes and significantly more secure.

### 2. Dependency Injection
We utilized NestJS's dependency injection to map interfaces to implementations in `AppModule`. This allows us to swap out repositories (e.g., for testing or different DB providers) without modifying the service logic.

### 3. Enhanced Testability
By mocking repository interfaces instead of raw `DatabaseService.query` chains, tests are now more readable and less brittle.

### 4. Interactive API Documentation
Integrated Swagger (OpenAPI 3.1) to provide automated, interactive documentation of the API endpoints, DTOs, and authentication mechanisms.
- **URL:** `http://localhost:3000/api/docs`
- **Benefits:** Standardized documentation, easier frontend-backend integration, and an interactive playground for developers.

## Implementation Details
- **Repositories:** `PostgresSeatRepository`, `PostgresPaymentRepository`, `PostgresReservationRepository`, `PostgresUserRepository`.
- **Services:** Refactored to inject repositories via `@Inject('IRepositoryName')`.
