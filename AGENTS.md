# Repository Guidelines

## Project Structure & Module Organization

This repository is a Dockerized seat reservation app with a NestJS backend, React/Vite frontend, and PostgreSQL.

- `backend/src/interfaces`: HTTP controllers, DTOs, guards, and request decorators.
- `backend/src/application`: use-case services such as auth, seats, payments, and reservations.
- `backend/src/domain`: shared types and repository contracts.
- `backend/src/infrastructure`: TypeORM entities, repository implementations, database bootstrap, sessions, and password hashing.
- `backend/test`: Jest unit tests for services, repositories, and security behavior.
- `frontend/src`: React app, styles, and Vitest tests.
- `docker-compose.yml`: local app, backend, and database orchestration.

## Build, Test, and Development Commands

Run the full local stack:

```bash
docker compose up --build
```

Backend:

```bash
cd backend
npm install
npm run build      # compile NestJS TypeScript
npm test           # run Jest tests
npm run start:dev  # local watch mode
```

Frontend:

```bash
cd frontend
npm install
npm run build      # type-check and build Vite assets
npm test           # run Vitest/Testing Library tests
npm run dev        # Vite dev server
```

## Coding Style & Naming Conventions

Use TypeScript throughout. Prefer small services with explicit dependencies over controller-heavy logic. Keep HTTP concerns in `interfaces`, workflows in `application`, contracts in `domain`, and database/provider details in `infrastructure`.

Use PascalCase for classes and React components, camelCase for functions/variables, and kebab-case filenames such as `reservation.repository.ts`. Keep comments short and only where they clarify non-obvious behavior.

## Testing Guidelines

Backend tests use Jest with `*.spec.ts` files under `backend/test`. Frontend tests use Vitest and Testing Library with `*.test.tsx` files under `frontend/src`.

Add regression tests for security, validation, reservation concurrency, payment idempotency, and UI request payloads. Run both backend and frontend tests before pushing.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries, for example `Fix login request payload` and `Add frontend regression tests`. Keep commits focused and describe the user-visible or architectural impact.

Pull requests should include a short summary, validation commands run, screenshots for UI changes, and notes for security or data-model changes. Link issues when applicable.

## Security & Configuration Tips

Do not commit secrets or local `.env` files. Keep session, auth, and reservation correctness server-side. PostgreSQL is the confirmed-reservation source of truth; do not replace database constraints with client-side or in-memory checks.
