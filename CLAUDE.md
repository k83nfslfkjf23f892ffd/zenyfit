# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Guidelines

When working with this codebase, Claude should:
- **Ask for clarification** when requirements are ambiguous or more context is needed
- **Say "I don't know"** when genuinely uncertain rather than guessing or making assumptions
- **Flag potential issues** before implementing changes
- **Suggest alternatives** when a better approach exists
- **Be honest about limitations** - accuracy over assumptions

## Development Commands

### Running the Application
```bash
npm run dev          # Start dev server on http://localhost:5000
npm run build        # Build for production (outputs to dist/public)
npm run preview      # Preview production build
```

### Development Server Details
- Dev server runs on port **5000** with host `0.0.0.0`
- API requests to `/api/*` are proxied to `http://localhost:3000` in development
- For production, Vercel handles API routing via serverless functions

## Architecture Overview

### Monorepo Structure
```
zenyfit/
├── client/src/          # React frontend (Vite + TypeScript)
├── api/                 # Vercel serverless functions (backend)
├── shared/              # Shared Zod schemas and types
└── dist/public/         # Build output
```

### Key Architectural Patterns

#### 1. Authentication Flow
- **Client**: Uses Firebase Auth with email/password (emails are `username@zenyfit.local`)
- **Server**: Validates ID tokens via Firebase Admin SDK (`verifyAuthToken` in `api/lib/firebase-admin.ts`)
- **Pattern**: Client authenticates with Firebase → Gets ID token → Sends to API in `Authorization: Bearer <token>` header → Server verifies token
- **Important**: All protected API routes must call `verifyAuthToken()` before processing

#### 2. Data Integrity Model
**All writes to Firestore happen server-side only** (via API endpoints) to prevent cheating:
- XP calculations are server-controlled (prevents users from manipulating their XP)
- Challenge progress updates are transaction-based
- Firestore rules deny all client-side writes to `exercise_logs`, `challenges`, `challengeInvites`, `inviteCodes`
- Users can only update their own `avatar` and `username` fields (enforced by `firestore.rules`)

#### 3. API Architecture
Each file in `/api` corresponds to a serverless function:
- Exports a default function that handles HTTP requests
- Must initialize Firebase Admin via `getAdminInstances()` from `api/lib/firebase-admin.ts`
- Should use `cors()` middleware for cross-origin requests
- Path: `/api/filename` (e.g., `api/workouts.ts` → `/api/workouts`)

Example pattern:
```typescript
import { getAdminInstances, verifyAuthToken } from './lib/firebase-admin';
import cors from 'cors';

export default async function handler(req, res) {
  await cors()(req, res);

  const authResult = await verifyAuthToken(req.headers.authorization);
  if (!authResult) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { db } = getAdminInstances();
  // ... handle request
}
```

#### 4. Client State Management
- **Server state**: React Query (`@tanstack/react-query`) with `queryClient` from `lib/queryClient.ts`
- **Auth state**: Custom `useAuth()` hook with real-time Firestore listener on user profile
- **Local state**: React's `useState` for UI state
- **Routing**: Wouter (lightweight client-side router)

#### 5. Firebase Initialization
**Client-side** (`client/src/lib/firebase.ts`):
- Fetches config from `/api/config` endpoint (keeps secrets server-side)
- Singleton pattern: checks `firebaseInitialized` flag
- Sets persistence to `browserLocalPersistence`

**Server-side** (`api/lib/firebase-admin.ts`):
- Uses service account key from env vars
- Singleton pattern: `adminApp`, `adminDb`, `adminAuth`
- Call `getAdminInstances()` to get instances

#### 6. XP and Leveling System
**XP Rates** (defined in `client/src/hooks/use-auth.ts`):
- Pull-ups: 15 XP/rep
- Push-ups: 3 XP/rep
- Dips: 10 XP/rep
- Running: 50 XP/km
- Custom exercises: 5 XP/unit

**Level Calculation**:
- Levels 1-10: Fixed thresholds at `[0, 500, 1500, 3000, 5000, 8000, 12000, 17000, 23000, 30000]` XP
- Level 11+: Additional 7000 XP per level
- Formula: `calculateLevel(xp)` and `getXPForNextLevel(level)` in `use-auth.ts`

**Critical**: XP is calculated server-side in `api/workouts.ts` when logging exercises, not client-side

#### 7. Challenge System
- **Progress Updates**: When a user logs a workout, the API checks if the exercise type matches any of their active challenges and updates progress via Firestore transactions
- **Participants**: Array of objects with `{userId, username, avatar, progress}`
- **participantIds**: Separate array for efficient queries (mirrored from `participants`)
- **Visibility**: `isPublic` determines if non-participants can view/join

#### 8. Custom Exercises
- Stored in **localStorage** (not Firestore) as JSON at key `customExercises`
- Structure: `{ name, type, unit, xpMultiplier, quickActions, limit }`
- Each custom exercise earns 5 XP per unit by default
- Quick actions: Array of predefined amounts for fast logging (e.g., `[5, 10, 25, 50]`)

#### 9. PWA Service Worker & Offline Support
- Located at `client/public/sw.js`
- Registered in `client/src/main.tsx`
- **Caching strategy**:
  - Static assets: Cache on install
  - API calls: Network-first with cache fallback
  - HTML: Falls back to cached homepage when offline
  - Workout logging: Queued to IndexedDB when offline, syncs when online
- **Cache name**: `zenyfit-v2`
- **Offline persistence**:
  - Firebase config cached in localStorage
  - User profile cached in localStorage
  - Firestore IndexedDB persistence enabled
  - Auth persistence via browserLocalPersistence
- **Background sync**: Queued workouts automatically sync when connection is restored

## Type Safety and Validation

### Shared Schemas (`shared/schema.ts`)
- **Zod schemas** define the shape of data for both client and server
- Import these schemas when validating API requests or form inputs
- Key schemas: `userSchema`, `exerciseLogSchema`, `challengeSchema`, `signUpSchema`, `signInSchema`

### Path Aliases (defined in `vite.config.ts`)
```typescript
"@"         → "client/src"
"@shared"   → "shared"
"@assets"   → "attached_assets"
```

Use these imports consistently:
```typescript
import { userSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
```

## Build and Deployment

### Vite Configuration (`vite.config.ts`)
- **Root**: `client/` directory
- **Output**: `dist/public/`
- **Code splitting**: Manual chunks for `vendor`, `firebase`, `ui`, `charts`, `motion`
- **Dev proxy**: `/api` routes proxied to `localhost:3000`

### Vercel Configuration (`vercel.json`)
- **Build command**: `npm run build`
- **Output directory**: `dist/public`
- **Rewrites**: All non-API routes serve `index.html` (SPA routing)
- **API routes**: Auto-detected from `/api` directory

### Environment Variables
**Required for client** (prefixed with `VITE_`):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**Required for server**:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_KEY` (entire JSON service account key as string)
- `MASTER_INVITE_CODE` (bootstrap invite code for first users)

**Note**: Client-side env vars are exposed in the browser. Keep secrets server-side only.

## Database Schema (Firestore)

### Collections Overview
1. **`users`**: User profiles (id, username, avatar, level, xp, totals, invitedBy, createdAt)
2. **`exercise_logs`**: Workout records (userId, type, amount, timestamp, synced, isCustom)
3. **`challenges`**: Competition events (title, description, type, goal, dates, participants, participantIds, isPublic, colors, createdBy)
4. **`challengeInvites`**: Pending challenge invitations (challengeId, invitedUserId, invitedBy, status, timestamp)
5. **`inviteCodes`**: Registration codes (code as doc ID, createdBy, used, usedBy, createdAt, usedAt)

### Security Rules Pattern
All **writes** (create/update/delete) are denied on the client except:
- `users/{userId}`: Can update own `avatar` and `username` only
- All other operations handled via Admin SDK (server-side)

All **reads** require authentication, with additional constraints:
- `exercise_logs`: Only read your own logs
- `challenges`: Public challenges OR you're a participant
- `challengeInvites`: You're the inviter OR invitee

## UI Component Library

### shadcn/ui Integration
- Components are in `client/src/components/ui/`
- Built on Radix UI primitives for accessibility
- Styled with Tailwind CSS + `class-variance-authority` (CVA)
- Use `cn()` utility from `@/lib/utils` for conditional classes

### Theme System
- Uses `next-themes` package
- Provider: `ThemeProvider` from `@/components/theme-provider`
- Hook: `useTheme()` from `@/hooks/use-theme`
- Supports: `light`, `dark`, `system`

### Toast Notifications
- Uses `sonner` library
- Component: `Toaster` from `@/components/ui/toaster`
- Hook: `useToast()` from `@/hooks/use-toast`
- Import `toast` function for displaying notifications

## Important Constraints and Known Issues

### Historical Context
**Critical**: The last major update introduced bugs and undesired features and was **reverted**. The current codebase is the stable state from before that update. Exercise caution when making large architectural changes.

### Known Incomplete Features
None! All previously incomplete features have been implemented.

## Common Patterns

### Making Authenticated API Calls (Client)
```typescript
const { user } = useAuth();
const token = await user?.getIdToken();

const response = await fetch('/api/workouts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify(data),
});
```

### Adding a New API Endpoint
1. Create `api/new-endpoint.ts`
2. Export default async function handler
3. Add CORS middleware
4. Verify auth token if protected
5. Use `getAdminInstances()` for Firestore/Auth access
6. Handle errors and return appropriate status codes

### Adding a New Page
1. Create component in `client/src/pages/`
2. Add route in `client/src/App.tsx` using wouter's `Route` component
3. Add navigation item in `client/src/components/layout/BottomNav.tsx` if needed
4. Ensure page uses proper layout wrapper

### Querying Firestore (Server-side)
```typescript
const { db } = getAdminInstances();
const usersRef = db.collection('users');
const snapshot = await usersRef.where('level', '>=', 5).get();
const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

## Node Version Requirement

**Node.js 24.x required** (specified in `package.json` engines field). Ensure local environment and Vercel use this version.
