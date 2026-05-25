# Frontend Refactoring: Modularization & SOLID

This document details the refactoring of the frontend to improve modularity, separation of concerns, and testability.

## Improvements

### 1. API Client Extraction (SRP)
The core `api` fetching logic was moved from the main `App` component into a dedicated `api/client.ts`. Domain types were centralized in `api/types.ts`.

### 2. Custom React Hooks (SRP)
Business logic and state management (authentication, seat management, reservations) were extracted into custom hooks:
- `useAuth`: Manages user session and authentication state.
- `useSeats`: Handles seat listing and refresh logic.
- `useReservations`: Manages reservation history and the seat reservation workflow.

### 3. Component Extraction (SRP)
The monolithic `App.tsx` was decomposed into smaller, focused UI components:
- `AuthPanel`: Handles login and registration UI.
- `SeatGrid`: Manages seat selection and reservation triggering.
- `ReservationList`: Displays the list of confirmed reservations.

### 4. Transparent Refactoring
The refactoring was verified against the existing Vitest regression suite, ensuring that the user-facing behavior remains unchanged while the underlying code quality improved.

## Benefits
- **Readability:** `main.tsx` is now a high-level layout component.
- **Maintainability:** Logic is isolated and can be modified or tested independently.
- **Reusability:** Hooks and components can be reused across different parts of the application.
