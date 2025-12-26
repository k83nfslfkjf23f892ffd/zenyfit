# ZenyFit - Social Fitness Tracker

A mobile-first Progressive Web App (PWA) for fitness tracking where users can log workouts, compete with friends in challenges, earn XP, level up, and track their progress.

[![GitHub](https://img.shields.io/badge/GitHub-zenyfit-blue)](https://github.com/k83nfslfkjf23f892ffd/zenyfit)

## Features

- **Workout Logging** - Track pull-ups, push-ups, dips, running, and custom exercises
- **Challenges** - Create and join fitness challenges with friends
- **Leaderboards** - Compete with others on global and challenge-specific rankings
- **Gamification** - Earn XP, level up, and unlock milestones
- **Social** - Invite-only community with user-generated invite codes
- **PWA** - Install on any device for a native app experience
- **Offline Support** - Service worker for offline functionality

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **UI Components:** Radix UI, shadcn/ui, Recharts
- **Backend:** Vercel Serverless Functions
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Hosting:** Vercel (frontend + API)

## Quick Start for Vercel Deployment

### 1. Prerequisites

- A Firebase project with Firestore and Authentication enabled
- A Vercel account

### 2. Clone and Install

```bash
git clone https://github.com/k83nfslfkjf23f892ffd/zenyfit.git
cd zenyfit
npm install
```

### 3. Set Up Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Email/Password authentication
3. Create a Firestore database
4. Generate a service account key (Project Settings > Service Accounts > Generate New Private Key)

### 4. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Firebase credentials:

```bash
cp .env.example .env.local
```

### 5. Deploy to Vercel

```bash
npx vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

### 6. Set Environment Variables in Vercel

Go to your Vercel project settings and add all environment variables from `.env.example`.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FIREBASE_PROJECT_ID` | Firebase project ID (server) | Yes |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Entire service account JSON key | Yes |
| `FIREBASE_API_KEY` | Firebase web API key (client) | Yes |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain (client) | Yes |
| `FIREBASE_STORAGE_BUCKET` | Firebase storage bucket (client) | Yes |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID (client) | Yes |
| `FIREBASE_APP_ID` | Firebase app ID (client) | Yes |
| `MASTER_INVITE_CODE` | Master code for first signups | Yes |
| `ADMIN_USER_IDS` | Comma-separated Firebase UIDs with admin access | No |

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

## Project Structure

```
zenyfit/
├── api/                    # Vercel serverless functions
│   ├── achievements.ts    # Achievement tracking
│   ├── admin.ts           # Admin dashboard (stats, user management)
│   ├── challenges.ts      # Challenge CRUD
│   ├── config.ts          # Firebase client config
│   ├── invites.ts         # Invite codes & challenge invitations
│   ├── leaderboard.ts     # Rankings & trend data
│   ├── social.ts          # Follow/unfollow, user search, feed
│   ├── users.ts           # User registration, profile updates
│   └── workouts.ts        # Exercise logging & deletion
├── lib/                   # Firebase Admin SDK setup (root level)
│   ├── firebase-admin.ts  # Admin initialization & auth verification
│   ├── cors.ts            # CORS middleware
│   └── rate-limit.ts      # In-memory rate limiting
├── client/
│   ├── public/
│   │   ├── manifest.json  # PWA manifest
│   │   ├── sw.js          # Service worker
│   │   └── favicon.png    # App icon
│   └── src/
│       ├── components/    # React components
│       ├── hooks/         # Custom hooks
│       ├── lib/           # Utilities
│       └── pages/         # Page components
├── shared/                # Shared code (client + server)
│   ├── schema.ts          # Zod validation schemas
│   └── constants.ts       # XP rates, level thresholds
├── .gitignore            # Git ignore rules
├── vercel.json           # Vercel config
├── firestore.rules       # Database security rules
├── CLAUDE.md             # Claude Code documentation
└── README.md             # This file
```

## Security Best Practices

- Never commit `.env` files with real credentials
- Store Firebase private keys in Vercel environment variables
- Change the master invite code after initial setup
- Deploy `firestore.rules` to Firebase for database security:
  ```bash
  firebase deploy --only firestore:rules
  ```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config` | GET | Get Firebase client configuration |
| `/api/users` | GET | Get all users OR validate username |
| `/api/users` | POST | User signup OR validate invite code |
| `/api/users` | PUT | Update user profile (avatar, username, milestones) |
| `/api/workouts` | GET | Retrieve workout logs (pagination support) |
| `/api/workouts` | POST | Log a new workout |
| `/api/workouts` | DELETE | Delete/revert a workout |
| `/api/achievements` | GET | Get user achievements with progress |
| `/api/challenges` | GET | Get user's challenges |
| `/api/challenges` | POST | Create, join, or invite to challenge |
| `/api/challenges` | PATCH | Update challenge |
| `/api/challenges` | DELETE | Delete challenge |
| `/api/leaderboard` | GET | Global rankings (with pagination and trend data) |
| `/api/invites` | GET/POST/DELETE | Invite code and challenge invitation management |
| `/api/social` | GET/POST | User search, follow/unfollow, followers, feed |
| `/api/admin` | GET/POST | Admin-only platform management (requires admin role) |

## Recent Improvements

- ✅ **Revert Workout Feature** - Fully functional workout deletion with XP rollback
- ✅ **Shared Constants** - Single source of truth for XP rates and leveling system
- ✅ **Type Safety** - Removed all TypeScript `any` types, proper typing throughout
- ✅ **Code Cleanup** - Removed 24 unused UI components (-2,900 lines)
- ✅ **Bug Fixes** - Fixed critical bugs in challenges, notifications, and hooks
- ✅ **Performance** - Reduced bundle size significantly
- ✅ **Challenge Invites** - Complete accept/reject workflow with notifications
- ✅ **Leaderboard Trends** - Fixed data consistency by migrating to `exercise_logs` collection
- ✅ **Persistent Achievements** - Milestones now saved to Firestore with unlock timestamps
- ✅ **Avatar Cropping** - Full image upload with auto-crop, resize, and circular clipping
- ✅ **Offline Authentication** - Firebase config and user profile cached for offline startup
- ✅ **Firestore Persistence** - IndexedDB persistence for offline data access

## Contributing

This is a personal project, but feel free to fork and build your own version!

## License

MIT
