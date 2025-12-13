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
| `VITE_FIREBASE_API_KEY` | Firebase web API key | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID (server) | Yes |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Yes |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Yes |
| `MASTER_INVITE_CODE` | Master code for first signups | Yes |

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
│   ├── lib/               # Firebase Admin setup
│   ├── challenges.ts      # Challenge CRUD
│   ├── invite-codes.ts    # Invite code generation
│   ├── leaderboard.ts     # Rankings API
│   ├── leaderboard-trend.ts # Trend data API
│   ├── signup.ts          # User registration
│   ├── users.ts           # User profile
│   └── workouts.ts        # Exercise logging + deletion
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
| `/api/signup` | POST | Create new user with invite code |
| `/api/users` | GET | Get all users (limited fields) |
| `/api/users` | PUT | Update user profile (avatar, username) |
| `/api/workouts` | GET | Retrieve workout logs |
| `/api/workouts` | POST | Log a new workout |
| `/api/workouts` | DELETE | Delete/revert a workout |
| `/api/challenges` | GET | Get user's challenges |
| `/api/challenges` | POST | Create or join challenge |
| `/api/leaderboard` | GET | Global rankings by exercise type |
| `/api/leaderboard-trend` | GET | Top 10 users' 7-day trends |
| `/api/invite-codes` | GET/POST/DELETE | Invite code management |
| `/api/validate-invite-code` | POST | Validate invite code |
| `/api/invites` | GET/POST/DELETE | Challenge invitations |

## Recent Improvements

- ✅ **Revert Workout Feature** - Fully functional workout deletion with XP rollback
- ✅ **Shared Constants** - Single source of truth for XP rates and leveling system
- ✅ **Type Safety** - Removed all TypeScript `any` types, proper typing throughout
- ✅ **Code Cleanup** - Removed 24 unused UI components (-2,900 lines)
- ✅ **Bug Fixes** - Fixed critical bugs in challenges, notifications, and hooks
- ✅ **Performance** - Reduced bundle size significantly

## Contributing

This is a personal project, but feel free to fork and build your own version!

## License

MIT
