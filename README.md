# ZenyFit - Social Fitness Tracker

A social fitness tracking Progressive Web App (PWA) that enables users to log bodyweight exercises, compete in challenges with friends, and track their progress through gamification.

## Features

- **Workout Logging** - Track pull-ups, push-ups, dips, running, and custom exercises
- **Challenges** - Create and join fitness challenges with friends
- **Leaderboards** - Compete with others on global and challenge-specific rankings
- **Gamification** - Earn XP, level up, and unlock milestones
- **Social** - Invite-only community with user-generated invite codes
- **PWA** - Install on any device for a native app experience

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **UI Components:** Radix UI, shadcn/ui
- **Backend:** Vercel Serverless Functions
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Hosting:** Vercel (frontend + API)

## Deployment

This project is deployed entirely on Vercel:

| Component | What's Deployed |
|-----------|-----------------|
| **Frontend** | Built static files (`dist/public/`) |
| **API** | Serverless functions (`api/` folder) |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Required Environment Variables (Vercel)

| Variable | Description |
|----------|-------------|
| `FIREBASE_API_KEY` | Firebase Web API Key |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Full JSON of service account key |
| `MASTER_INVITE_CODE` | Initial signup code |

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
zenyfit-app/
├── api/                    # Vercel serverless functions
│   ├── lib/                # Shared utilities (Firebase Admin)
│   ├── challenges/         # Challenge endpoints
│   ├── challenge-invites/  # Invite management
│   └── *.ts                # Individual API endpoints
├── client/                 # React frontend source
│   ├── public/             # Static assets
│   └── src/                # React source code
├── shared/                 # Shared types and utilities
├── attached_assets/        # Images and media
├── dist/                   # Build output (generated)
│   └── public/             # Vercel deployment folder
├── vercel.json             # Vercel configuration
├── vite.config.ts          # Vite build config
├── package.json            # Dependencies and scripts
└── firestore.rules         # Firestore security rules
```

## License

Private - All rights reserved
