# Frontend: LinkZ Seat Reservation UI

Modular React frontend architected for clarity, security, and developer experience.

## Tech Stack
- **Framework:** React 18 (Vite)
- **State Management:** Custom Hooks
- **Testing:** Vitest & React Testing Library
- **Architecture:** Modular Components

## Architecture: Modular & Decoupled
The frontend is structured to strictly separate concerns, following SRP (Single Responsibility Principle).

### 1. Custom Logic Hooks (`src/hooks/`)
Orchestrate API calls and manage internal state:
- `useAuth`: Manages the user session and authentication lifecycle.
- `useSeats`: Handles seat availability listing and polling.
- `useReservations`: Manages the complex seat reservation workflow and user history.

### 2. Functional UI Components (`src/components/`)
Pure presentation components that receive state and callbacks via props:
- `AuthPanel`: Dedicated UI for registration and login transitions.
- `SeatGrid`: Interactive grid for seat selection.
- `ReservationList`: Real-time display of confirmed reservations.

### 3. API Client Layer (`src/api/`)
Centralized `fetch` wrapper and domain-specific type definitions, ensuring consistent error handling and header management (e.g., credentials for session cookies).

## Security & Reliability
- **Session Isolation:** Implements reactive cleanup logic that wipes the local reservation state immediately upon logout, preventing cross-user data leakage.
- **Async-Safe UI:** Components utilize `busy` states and optimistic updates where appropriate to ensure a smooth user experience.
- **Type Safety:** TypeScript is used throughout to guarantee contract consistency between frontend and backend.

## Testing & Quality
Achieved **>85% branch coverage** across the frontend stack.
- **Hook Testing:** Verified all state transition paths, including complex error handling in `catch` blocks.
- **Integration Tests:** Comprehensive regression suite in `main.test.tsx` covering the full user journey from sign-up to reservation confirmation.
- **Session Transitions:** Verified that logout correctly clears sensitive data and returns the user to a clean auth state.

```bash
cd frontend
npm test -- --coverage
```
