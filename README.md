# ZenyFit - Social Fitness Tracker

A mobile-first PWA fitness tracking app where users can log workouts, compete with friends, and track their progress.

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
git clone <your-repo-url>
cd zenyfit-APP
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
zenyfit-APP/
├── api/                    # Vercel serverless functions
│   ├── lib/               # Firebase Admin setup
│   ├── challenges.ts      # Challenge CRUD
│   ├── invite-codes.ts    # Invite code generation
│   ├── leaderboard.ts     # Rankings API
│   ├── leaderboard-trend.ts # Trend data API
│   ├── signup.ts          # User registration
│   ├── users.ts           # User profile
│   └── workouts.ts        # Exercise logging
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
├── shared/                # Shared types
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── vercel.json           # Vercel config
└── firestore.rules       # Database security
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
| `/api/signup` | POST | Create new user |
| `/api/users` | GET | Get user profile |
| `/api/workouts` | GET/POST | Log and retrieve workouts |
| `/api/challenges` | GET/POST | Challenge management |
| `/api/leaderboard` | GET | Global rankings |
| `/api/leaderboard-trend` | GET | Top 10 average trends |
| `/api/invite-codes` | GET/POST/DELETE | Invite code management |

## License

MIT
