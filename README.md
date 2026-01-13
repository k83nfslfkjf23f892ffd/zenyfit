# ZenyFit - Fitness Gamification PWA

A mobile-first Progressive Web App for fitness tracking with XP/leveling, challenges, and leaderboards.

[![Status](https://img.shields.io/badge/Status-Rebuilding-orange)]()
[![Framework](https://img.shields.io/badge/Framework-Next.js-black)]()
[![Database](https://img.shields.io/badge/Database-Firebase-yellow)]()

---

## 🚧 Current Status: **Rebuilding from Scratch**

**What's happening:**
- Previous Vite-based codebase has been **deleted**
- Starting fresh with **Next.js** architecture
- Currently in **design finalization** phase
- All design work in `design-mockups/` directory

**Next steps:**
1. ✅ Design exploration (Current)
2. ⏳ Phase 1: Project setup with Next.js
3. ⏳ Build authentication & core features
4. ⏳ Implement 24 themes from design mockups
5. ⏳ Deploy to production

See **[BUILD_PLAN.md](./BUILD_PLAN.md)** for complete rebuild roadmap.

---

## 📁 Repository Structure

```
zenyfit/
│
├── 📄 README.md                  # Project overview (you are here)
├── 📄 CLAUDE.md                  # Instructions for Claude Code AI
├── 📄 BUILD_PLAN.md              # Complete rebuild plan (~102 steps)
│
├── 📁 design-mockups/            # 🎨 Design exploration (Active)
│   ├── index.html                # Main navigation hub
│   ├── comparison-hub.html       # Compare designs side-by-side
│   ├── theme-prototype.html      # 24 theme prototypes
│   ├── final-themes.html         # Saved theme combinations
│   │
│   ├── playgrounds/              # Interactive design tools
│   │   ├── ultimate-playground.html
│   │   └── experimental-playground.html
│   │
│   ├── app-inspired/             # Complete app designs (4 variants)
│   │   ├── timepage-calendar-style-v2.html
│   │   ├── timepage-calendar-style.html
│   │   ├── book-tracker-style.html
│   │   └── retro-music-style.html
│   │
│   ├── showcases/                # Theme showcases
│   ├── assets/                   # Images & resources
│   ├── pages/                    # Individual theme pages
│   ├── docs/                     # Documentation
│   └── old-designs/              # Archived designs
│
├── 📁 prompts/                   # Build specifications
│   ├── prompt.md                 # Technical build spec
│   └── design-brief.md           # Design requirements
│
└── 🗑️ [Source Code - Deleted]   # Will be rebuilt with Next.js
    ├── pages/                    # (Future) Next.js pages
    ├── components/               # (Future) React components
    ├── lib/                      # (Future) Utilities
    └── api/                      # (Future) Next.js API routes
```

---

## 🎨 Design Resources

### Quick Access to Design Tools

| Tool | Purpose | File |
|------|---------|------|
| **Main Hub** | Navigation center | `design-mockups/index.html` |
| **Theme Prototype** | 24 theme variations | `design-mockups/theme-prototype.html` |
| **Comparison Hub** | Side-by-side comparison | `design-mockups/comparison-hub.html` |
| **Ultimate Playground** | All themes + layouts | `design-mockups/playgrounds/ultimate-playground.html` |
| **Final Themes** | Saved combinations | `design-mockups/final-themes.html` |

### Design Stats
- **24** Color themes (to be implemented)
- **6** Layout variants (design exploration)
- **4** Complete app-inspired designs
- **3** Interactive playgrounds
- **100%** Customizable with live preview

---

## 🛠️ Tech Stack (Future Implementation)

**Frontend:**
- Next.js 14+ (React framework)
- TypeScript
- Tailwind CSS
- Radix UI / shadcn/ui components

**Backend:**
- Next.js API Routes
- Firebase Firestore (database)
- Firebase Auth (authentication)
- Firebase Storage (avatars)

**Features:**
- PWA with offline support (Service Worker + IndexedDB)
- Web Push API notifications (VAPID)
- DiceBear API (generated avatars)

**Hosting:**
- Vercel (frontend + API routes)

---

## ✨ Planned Features

### Core Features
- **Workout Logging** - Track pull-ups, push-ups, dips, running + custom exercises
- **XP & Leveling** - Earn XP, level up, unlock achievements
- **Challenges** - Create/join time-based fitness competitions
- **Leaderboards** - Global rankings with filters and trends
- **Social** - Invite-only community with challenge invites

### Advanced Features
- **24 Themes** - User-selectable color schemes
- **Custom Exercises** - Create personalized workout types (max 12 per user)
- **Offline Support** - Queue workouts when offline, auto-sync
- **Push Notifications** - Challenge invites, level-ups, milestones
- **Admin Panel** - User management, statistics, moderation
- **PWA** - Installable on any device

---

## 🔐 Environment Variables (Future Setup)

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

# Push Notifications (Web Push API)
WEB_PUSH_PUBLIC_KEY=your-vapid-public-key
WEB_PUSH_PRIVATE_KEY=your-vapid-private-key
WEB_PUSH_EMAIL=your-email@example.com
```

---

## 🚀 Quick Start (After Rebuild)

### Prerequisites
- Node.js 18+
- Firebase project with Firestore + Auth enabled
- Vercel account (for deployment)

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
```

### Deployment
```bash
# Deploy to Vercel
vercel

# Or connect GitHub repo for automatic deployments
```

---

## 📊 XP System (Planned)

**Standard Exercises (earn XP):**
- Pull-ups: **15 XP/rep**
- Push-ups: **3 XP/rep**
- Dips: **12 XP/rep**
- Running: **30 XP/km**

**Custom Exercises:** **0 XP** (tracking only)

**Level Progression:**
- Levels 1-10: Fixed thresholds `[0, 500, 1500, 3000, 5000, 8000, 12000, 17000, 23000, 30000]`
- Level 11+: Additional **7000 XP per level**

---

## 🔒 Security Model

**Authentication:**
- Invite-code only registration (no public signup)
- Username → email conversion (`username@zenyfit.local`)
- Firebase Auth with secure token verification

**Data Integrity:**
- **ALL database writes server-side only** (Next.js API routes)
- **XP calculations never client-side** (prevents cheating)
- Custom exercises earn 0 XP (tracking only)
- Firestore security rules: client can only read, never write

**Input Sanitization:**
- Strip HTML and dangerous characters
- Validate lengths (username 3-12, password 7+)
- Rate limiting on API endpoints

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Project overview, structure, quick start (this file) |
| **CLAUDE.md** | Instructions for Claude Code AI assistance |
| **BUILD_PLAN.md** | Complete step-by-step rebuild plan (~102 steps, 24 phases) |
| **prompts/prompt.md** | Technical build specification |
| **prompts/design-brief.md** | Design requirements and UI/UX guidelines |

---

## 🎯 For Developers

### Viewing Design Mockups
```bash
cd design-mockups
open index.html
```

### Starting Development (After Setup)
```bash
npm run dev
# Opens at http://localhost:3000
```

### Building for Production
```bash
npm run build
npm run start
```

---

## 📖 Database Schema (Planned)

**Firestore Collections:**

1. **`users`** - User profiles (XP, level, stats, isAdmin, isBanned, theme)
2. **`exercise_logs`** - Workout entries (userId, type, amount, timestamp)
3. **`custom_exercises`** - User-defined exercises (max 12 per user)
4. **`challenges`** - Challenge definitions + participant progress
5. **`challengeInvites`** - Pending challenge invitations
6. **`inviteCodes`** - Registration codes (10 chars, max 5 per user)
7. **`pushSubscriptions`** - Web Push subscriptions (multi-device)

---

## 🤝 Contributing

This is currently a personal rebuild project. Once the new Next.js version is live, contributions may be welcome!

---

## 📝 License

MIT

---

## 📞 Support

For questions about the codebase or rebuild process, see:
- **[BUILD_PLAN.md](./BUILD_PLAN.md)** - Complete rebuild roadmap
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code instructions

---

**Last Updated:** 2026-01-11
**Current Phase:** Design Finalization → Phase 1 Setup
