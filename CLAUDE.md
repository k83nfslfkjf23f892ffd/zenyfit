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
npm run dev          # Start Next.js dev server on http://localhost:3001
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Deployment
**IMPORTANT**: When the user says "deploy", they mean **deploy to GitHub** (commit and push changes).
- This repository is connected to Vercel for automatic deployments
- Pushing to the `main` branch triggers automatic deployment to production
- DO NOT use `vercel` CLI commands unless explicitly requested

## Architecture Overview

### Project Structure
```
zenyfit/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   │   ├── api/          # API route handlers
│   │   └── [page]/       # Page components
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── admin/        # Admin panel components
│   │   ├── charts/       # Recharts data visualization
│   │   └── animations/   # Framer Motion animations
│   └── lib/              # Utilities, Firebase, auth context
├── shared/               # Shared Zod schemas and constants
├── public/               # Static assets, PWA icons, manifest
└── prompts/              # Design briefs and prompts
```

### Key Architectural Patterns

#### 1. Authentication Flow
- **Client**: Firebase Auth with email/password (emails are `username@zenyfit.local`)
- **Server**: Validates ID tokens via Firebase Admin SDK (`verifyAuthToken` in `src/lib/firebase-admin.ts`)
- **Context**: `AuthProvider` in `src/lib/auth-context.tsx` manages auth state
- **Pattern**: Client authenticates → Gets ID token → Sends `Authorization: Bearer <token>` header → Server verifies

#### 2. Data Integrity Model
**All writes to Firestore happen server-side only** (via API routes) to prevent cheating:
- XP calculations are server-controlled
- Challenge progress updates use Firestore transactions
- Firestore rules deny all client-side writes except avatar/username/theme on own profile

#### 3. API Architecture (Next.js App Router)
API routes are in `src/app/api/[route]/route.ts`:
- Export named functions: `GET`, `POST`, `PATCH`, `DELETE`
- Use `NextRequest` and `NextResponse` from `next/server`
- All routes implement rate limiting via `src/lib/rate-limit.ts`
- Protected routes verify auth token before processing

Example pattern:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const decodedToken = await verifyAuthToken(authHeader);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitResponse = rateLimitByUser(decodedToken, '/api/route', RATE_LIMITS.MODERATE);
  if (rateLimitResponse) return rateLimitResponse;

  const { db } = getAdminInstances();
  // ... handle request
}
```

#### 4. XP and Leveling System
**XP Rates** (defined in `shared/constants.ts`):
- Pull-ups: 15 XP/rep
- Push-ups: 3 XP/rep
- Dips: 12 XP/rep
- Running: 30 XP/km
- Custom exercises: 0 XP (tracking only)

**Level Calculation**:
- Levels 1-10: Fixed thresholds `[0, 500, 1500, 3000, 5000, 8000, 12000, 17000, 23000, 30000]`
- Level 11+: Additional 7000 XP per level

#### 5. Theme System
- 24 themes defined in `src/lib/themes.ts`
- Theme provider injects CSS variables dynamically
- Uses `next-themes` for dark/light mode support
- User theme preference stored in Firestore and localStorage

#### 6. Security Features
- **Rate Limiting**: All API endpoints protected (IP-based for public, user-based for authenticated)
- **Input Sanitization**: `src/lib/sanitize.ts` for XSS prevention
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc. in `next.config.js`
- **Firestore Rules**: Strict read/write permissions in `firestore.rules`

### Path Aliases (defined in `tsconfig.json`)
```typescript
"@/*"       → "src/*"
"@shared/*" → "shared/*"
```

## Environment Variables
**Required for server**:
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Entire JSON service account key as string
- `FIREBASE_API_KEY` - Firebase web API key
- `FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `FIREBASE_APP_ID` - Firebase app ID
- `MASTER_INVITE_CODE` - Bootstrap invite code for first users

## Database Schema (Firestore)

### Collections
1. **`users`**: User profiles (id, username, avatar, level, xp, totals, isAdmin, isBanned, theme, invitedBy, createdAt)
2. **`exercise_logs`**: Workout records (userId, type, amount, timestamp, xpEarned, synced, isCustom)
3. **`custom_exercises`**: User-defined exercises (userId, name, unit, quickActions, createdAt)
4. **`challenges`**: Competition events (title, description, type, goal, dates, participants, participantIds, isPublic, colors, createdBy)
5. **`challengeInvites`**: Pending invitations (challengeId, invitedUserId, invitedBy, status, timestamp)
6. **`inviteCodes`**: Registration codes (code as doc ID, createdBy, used, usedBy, createdAt, usedAt)
7. **`pushSubscriptions`**: Web push subscriptions (userId, endpoint, keys, createdAt)

## UI Components

### shadcn/ui
- Components in `src/components/ui/`
- Built on Radix UI primitives
- Styled with Tailwind CSS

### Toast Notifications
- Uses `sonner` library
- Import `toast` from `sonner` for notifications

### Charts
- Recharts components in `src/components/charts/`
- XPHistoryChart, WorkoutDistributionChart, WeeklyActivityChart, UserGrowthChart

### Animations
- Framer Motion components in `src/components/animations/`
- LevelUpCelebration, WorkoutCelebration, AchievementUnlock

## PWA Features
- Service worker at `public/sw.js`
- Manifest at `public/manifest.json`
- Custom icons in `public/icons/`
- Offline support with Firestore persistence
