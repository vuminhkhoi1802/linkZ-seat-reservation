# Backend Refactoring: SOLID & Clean Architecture

This document details the architectural improvements applied to the backend to adhere to SOLID principles and enhance maintainability.

## Improvements

### 1. Repository Pattern (DIP & SRP)
Previously, application services (e.g., `ReservationService`) were tightly coupled to raw SQL and the `DatabaseService`. We introduced Repository interfaces in the domain layer and concrete implementations in the infrastructure layer.

- **Contracts:** `domain/repositories.ts` defines clear data access interfaces.
- **Implementations:** `infrastructure/repositories/` contains SQL logic, isolating the database provider.
- **Benefit:** Application services now focus purely on orchestration (SRP) and depend on abstractions (DIP), making them resilient to infrastructure changes.

### 2. Dependency Injection
We utilized NestJS's dependency injection to map interfaces to implementations in `AppModule`. This allows us to swap out repositories (e.g., for testing or different DB providers) without modifying the service logic.

### 3. Enhanced Testability
By mocking repository interfaces instead of raw `DatabaseService.query` chains, tests are now more readable and less brittle.

## Implementation Details
- **Repositories:** `PostgresSeatRepository`, `PostgresPaymentRepository`, `PostgresReservationRepository`, `PostgresUserRepository`.
- **Services:** Refactored to inject repositories via `@Inject('IRepositoryName')`.
