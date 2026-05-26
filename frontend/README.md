# Frontend Guide

React/Vite UI for LinkZ seat reservations. It supports Clerk when configured and a local multi-user mock provider when running Docker review mode.

## Setup

```bash
npm install
npm test
npm run build
```

Run the full app:

```bash
docker compose up --build
```

## Local Multi-User Auth

Without `VITE_CLERK_PUBLISHABLE_KEY`, `ExternalAuthPanel` shows:

- `Continue as Reviewer A`
- `Continue as Reviewer B`

Use two browsers or one normal window plus one incognito window to sign in as different reviewers. Each button creates a different mock bearer token, so the backend creates separate internal users and reservation histories.

## Clerk Mode

Set `VITE_CLERK_PUBLISHABLE_KEY` to render Clerk sign-in/sign-up buttons. `main.tsx` passes Clerk's `getToken` into `useAuth`, and `api/client.ts` attaches the token as `Authorization: Bearer <token>`.

## Frontend Boundary Design

| Boundary | Code | Role |
| --- | --- | --- |
| Composition | `src/main.tsx` | Chooses Clerk or mock auth and wires app workflows |
| API transport | `src/api/client.ts`, `src/api/types.ts` | Fetch wrapper, bearer-token attachment, typed response shapes |
| Workflow state | `src/hooks/useAuth.ts`, `useSeats.ts`, `useReservations.ts` | Auth, seat loading, payment creation, webhook simulation, reservation refresh |
| Presentation | `src/components/*` | Auth buttons, seat grid, reservation list |

## Reservation Flow

1. Pick Reviewer A, Reviewer B, or Clerk sign-in.
2. Fetch current user, then fetch seats and reservations with bearer auth.
3. Create a payment attempt for a selected seat.
4. Complete through `/payments/:id/mock-provider-complete`.
5. Refresh seats and the full reserved-seat list.

## Verification

```bash
npm test
npm run build
```

Tests cover multi-user mock auth buttons, bearer-token sign-in, reservation list rendering, sign-out cleanup, and reservation workflow API calls.
