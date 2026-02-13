# ZenyFit - Fitness Gamification PWA

A mobile-first Progressive Web App for fitness tracking with XP/leveling, challenges, and leaderboards.

[![Status](https://img.shields.io/badge/Status-Live-brightgreen)]()
[![Framework](https://img.shields.io/badge/Framework-Next.js_15-black)]()
[![Database](https://img.shields.io/badge/Database-Firebase-yellow)]()
[![Deployment](https://img.shields.io/badge/Deployment-Vercel-blue)]()

---

## Overview

ZenyFit is a gamified fitness tracking application that turns workouts into an RPG-like experience. Users earn XP for exercises, level up, compete in challenges, and climb leaderboards.

**Live at:** [zenyfit.vercel.app](https://zenyfit.vercel.app)

---

## Features

- **Workout Logging** - Track pull-ups, push-ups, dips, running, team sports, and more with quick-add buttons
- **Custom Exercises** - Create your own exercises with custom units and quick actions (tracking only, no XP)
- **XP & Leveling** - Earn XP for standard workouts and level up
- **6 Themes** - User-selectable color schemes with dark/light mode
- **Customizable Dashboard** - Reorder, hide, and show widgets via drag-and-drop
- **Challenges** - Create and join time-based fitness competitions
  - Public challenges anyone can join
  - Private challenges with invitation system
  - Invite users by username, accept/decline invitations
- **Leaderboards** - Global rankings with filters (XP, pull-ups, push-ups, dips, running)
- **Achievements** - Unlock 16+ milestones across workout, progress, challenge, and social categories
- **Offline Support** - PWA with offline workout queuing
- **Push Notifications** - Challenge invites, level-ups, milestones
- **Admin Panel** - User management, statistics, moderation, invite codes, system health
- **Invite-Only** - Registration via invite codes (users can generate up to 5 codes)

---

## Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components (Radix UI)
- Framer Motion (animations)
- Recharts (data visualization)

**Backend:**
- Next.js API Routes
- Firebase Firestore (database)
- Firebase Auth (authentication)
- Server-side XP calculations (anti-cheat)
- Two-layer caching (server in-memory + client localStorage) — see `ARCHITECTURE.md`

**Infrastructure:**
- Vercel (hosting + edge functions)
- PWA with Service Worker

---

## Project Structure

```
zenyfit/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   │   ├── api/          # API route handlers
│   │   └── [page]/       # Page components
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── widgets/      # Dashboard widgets (10 customizable)
│   │   ├── admin/        # Admin panel components
│   │   ├── charts/       # Recharts data visualization
│   │   └── animations/   # Framer Motion animations
│   └── lib/              # Utilities, Firebase, auth context
├── shared/               # Shared Zod schemas and constants
├── public/               # Static assets, PWA icons, manifest
└── prompts/              # Design briefs and prompts
```

---

## Development

### Prerequisites
- Node.js 18+
- Firebase project with Firestore + Auth enabled

### Installation
```bash
# Clone repository
git clone https://github.com/yourusername/zenyfit.git
cd zenyfit

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase credentials

# Run development server
npm run dev
# Opens at http://localhost:3001
```

### Scripts
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

---

## Environment Variables

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
FIREBASE_STORAGE_BUCKET=your-app.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123

# Application
MASTER_INVITE_CODE=BOOTSTRAP123
```

---

## XP System

**Standard Exercises:**
- Pull-ups: **6 XP/rep** (variations: 2-8 XP)
- Push-ups: **3 XP/rep** (variations: 2-6 XP)
- Dips: **6 XP/rep** (variations: 2-7 XP)
- Muscle-ups: **11 XP/rep**
- Running: **30 XP/km**

**Custom Exercises:** 0 XP (tracking only)

**Level Progression:**
- Levels 1-10: Fixed thresholds
- Level 11+: +7000 XP per level

---

## Security

- **Server-side XP** - All calculations done on server to prevent cheating
- **Rate Limiting** - API endpoints protected against abuse
- **Input Sanitization** - XSS prevention on all user input
- **Firestore Rules** - Client can only read, writes go through API
- **Invite-Only** - No public registration

---

## Deployment

This repository is connected to Vercel for automatic deployments. Pushing to the `main` branch triggers automatic deployment to production.

---

## License

MIT
