# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**Current Phase:** Fresh start - Design phase
**Started:** December 27, 2025

This is a **clean slate rebuild** of the ZenyFit fitness tracking PWA. The project currently contains only specifications - no code has been implemented yet.

## Previous Versions

Old code is preserved as Git tags (not branches):
- `v1.0-old-app` - Most recent backup before rebuild
- `v0.9-old-version` - Older version

**To view old code:**
```bash
git checkout v1.0-old-app
git checkout main  # return to current
```

## Build Specifications

All project requirements are documented in the `prompts/` folder:

### **`prompts/prompt.md`** - Complete Functional Specification
Contains the full technical requirements:
- Platform: Next.js + Vercel + Firebase Firestore
- Authentication: Firebase Auth (invite-code only, username-based)
- Security model (all writes server-side, XP calculations server-controlled)
- 11 core features (workout logging, XP/leveling, challenges, leaderboard, etc.)
- Database schema (Firestore collections)
- API endpoints (Next.js API routes)
- Critical technical constraints

**Key Architecture Decisions:**
- Use Next.js API routes for ALL backend (not standalone Vercel functions)
- Usernames are permanent (3-12 chars, act as display names)
- Custom exercises: max 12 per user, stored in Firestore, earn 0 XP
- XP system: Pull-ups (15 XP), Push-ups (3 XP), Dips (12 XP), Running (30 XP/km)
- Offline support: Queue workouts in IndexedDB, auto-sync when online

### **`prompts/design-brief.md`** - Complete UI/UX Specification
Contains all design requirements:
- 9 main pages (signup, login, dashboard, leaderboard, challenges, profile, settings, admin)
- Components/modals (workout logger, create challenge, celebrations, etc.)
- Design system (colors, typography, spacing, animations)
- User flows (signup, log workout, create challenge, join challenge)
- Mobile-first design approach (320px-428px optimized)
- PWA requirements (offline support, installable)

## Tech Stack

- **Framework:** Next.js (React)
- **Hosting:** Vercel
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Styling:** Tailwind CSS + shadcn/ui
- **PWA:** Service worker + IndexedDB for offline
- **Push Notifications:** Web Push API (web-push npm package)

## Environment Variables

Required for Firebase and push notifications:
```
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_KEY          # Full JSON as string
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
MASTER_INVITE_CODE
WEB_PUSH_PUBLIC_KEY
WEB_PUSH_PRIVATE_KEY
WEB_PUSH_EMAIL
```

## Security Model

**Critical constraints:**
- ALL database writes MUST go through Next.js API routes (never client-side)
- XP calculations MUST happen server-side only
- Sanitize all user inputs (prevent XSS)
- Firestore security rules deny client writes, allow specific reads
- Username format: `username@app.local` (internal Firebase Auth format)

## Core Features Overview

1. **Workout Logging** - Track pull-ups, push-ups, dips, running + 12 custom exercises per user
2. **XP & Leveling** - Gamification system with level progression
3. **Challenges** - Time-based competitive goals (public or invite-only)
4. **Leaderboard** - Global rankings by total XP or exercise type
5. **Achievements** - Badges for milestones
6. **User Profiles** - Stats, workout history, personal bests
7. **Social Features** - Challenge invitations, activity feed
8. **Invite System** - Generate 5 invite codes (10 chars), shareable URLs
9. **PWA & Offline** - Queue workouts offline, auto-sync
10. **Push Notifications** - Web Push API, requested after signup
11. **Admin Panel** - User management, stats, moderation, system health

## Database Schema (Firestore)

**Collections:**
- `users` - Profiles (level, XP, stats, isAdmin, isBanned, pushSubscription)
- `exercise_logs` - Workout entries (userId, type, amount, timestamp)
- `custom_exercises` - User-defined exercises (max 12 per user)
- `challenges` - Challenge definitions with participants array
- `challengeInvites` - Pending invitations
- `inviteCodes` - Registration codes (10 chars, max 5 per user)
- `pushSubscriptions` - Web Push subscriptions (supports multiple devices)

## Development Workflow

Since this is a fresh start with no code yet:

**Step 1: Design First (Current Phase)**
- Create mockups/wireframes based on `prompts/design-brief.md`
- Design all 9 pages + components
- Choose colors, fonts, spacing

**Step 2: Implementation (Future)**
- Initialize Next.js project
- Set up Firebase
- Build pages step-by-step
- Implement features incrementally

**Branch Strategy:**
- `main` - Production branch (deploys to Vercel)
- `dev` - Development branch (creates Vercel preview URLs)
- Feature branches - Merge to `dev`, then to `main`

## Important Notes

- This is a **rebuild from scratch** - do not reference old code without checking tags
- Specifications in `prompts/` folder are the source of truth
- Follow Next.js best practices for project structure
- Mobile-first design (320px-428px optimized)
- PWA must work offline (critical requirement)
- Username is permanent after signup (warn users during registration)
