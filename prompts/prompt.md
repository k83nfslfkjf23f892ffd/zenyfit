# Fitness Gamification App - Build Spec

Build a mobile-first PWA fitness tracking app with XP/leveling, challenges, and leaderboards.

## Platform Requirements

**Framework:** Next.js (React framework with built-in API routes)
**Hosting:** Vercel
**Database:** Firebase Firestore
**Authentication:** Firebase Auth
**Avatar Generation:** DiceBear API (https://dicebear.com) for generated avatars + support custom uploads

**Technical Notes:**
- Use Next.js API routes for all backend functionality (auth, workouts, challenges, notifications, admin)
- Follow Next.js best practices for project structure and organization
- Only create standalone Vercel functions if needed for external webhooks or different programming languages

## Environment Variables

```
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_KEY          # Full JSON as string
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
MASTER_INVITE_CODE
WEB_PUSH_PUBLIC_KEY                   # VAPID public key for Web Push API
WEB_PUSH_PRIVATE_KEY                  # VAPID private key for Web Push API
WEB_PUSH_EMAIL                        # Contact email for push notifications
```

## Authentication & Security

**Auth Requirements:**
- Invite-code only registration (no public signup)
- Username-based login (convert to `username@app.local` email format)
- Secure authentication between client and serverless functions
- Password: minimum 7 characters
- Username: 3-12 characters (acts as display name)
  - Allow: letters, numbers, spaces, hyphens, periods
  - Sanitize: strip HTML and dangerous characters
  - **Cannot be changed after signup** - warn users during registration

**Security Model:**
- ALL database writes must happen server-side through API functions only
- XP calculations are server-controlled (never client-side)
- Users can update their avatar in settings/profile page
- Sanitize all user inputs to prevent XSS attacks

**Firestore Security Rules (plain English):**
- Users can read their own user profile document
- Users can read their own exercise logs
- Users can read challenges they're participating in OR public challenges
- Users can read custom exercises they own OR custom exercises in challenges they're invited to
- Users can read challenge invites addressed to them
- ALL writes (create, update, delete) are blocked on client-side - must go through API
- Leaderboard data is readable by all authenticated users
- Admin users can read additional data (controlled by API, not Firestore rules)

**Signup Form Validation (Real-time):**
- Check URL parameter `?invite=CODE` and auto-fill invite code field if present
- Show live validation feedback as user types:
  - Password: "Minimum 7 characters required" if less than 7 characters
  - Username: "Minimum 3 characters required" if less than 3 characters
  - Username: "Maximum 12 characters allowed" if more than 12 characters
  - Username: "Username cannot be changed later" warning visible on form
- Disable submit button until all validations pass
- Modern, user-friendly validation like popular apps (GitHub, Twitter, etc.)

## Core Features

### 1. Workout Logging
- Track 4 standard exercises: Pull-ups, Push-ups, Dips, Running (km)
- Support user-defined custom exercises (max 12 per user)
  - Custom exercises stored in Firestore per user
  - User can access their custom exercises from any device they login on
  - Custom exercises are private - only visible to other users when invited to a challenge using that exercise
  - Show warning when user tries to create more than 12
  - Disable "Add Custom Exercise" button when limit reached
- Quick-action buttons for common amounts
- Works offline: workouts queued locally, auto-sync when online
- Show visual indicator for online/offline status (icon or badge)
- Visual feedback when logging workouts

### 2. XP & Leveling System
XP earned per activity (standard exercises only):
- Pull-ups: 15 XP/rep
- Push-ups: 3 XP/rep
- Dips: 12 XP/rep
- Running: 30 XP/km
- **Custom exercises: 0 XP** (tracking only, no XP gain)

XP values balanced based on exercise difficulty and time investment (1 km ≈ 2 pull-ups in XP)

Level progression:
- Levels 1-10: Fixed XP thresholds [0, 500, 1500, 3000, 5000, 8000, 12000, 17000, 23000, 30000]
- Level 11+: Additional 7000 XP per level
- Display current level, XP, and progress to next level
- Celebrate level-ups with visual feedback
- Only standard exercises earn XP and count toward leveling and leaderboard

**XP Info Display:**
- Include an info button (ⓘ) on profile/stats page explaining XP system
- Show XP breakdown per exercise type
- Explain level progression formula
- Display "Why these values?" explanation (balanced for difficulty and time)

### 3. Challenges
- Create time-based competitive goals (e.g., "Do 500 push-ups in 7 days")
- Can be public or invite-only
- Real-time progress tracking for all participants
- Progress auto-updates when users log matching workouts
- Display active, completed, and discoverable challenges
- Show countdown timer and progress visualization
- Support for any exercise type (standard or custom)
  - Custom exercises are private by default
  - When invited to a challenge with a custom exercise, that exercise becomes visible to invited participants only

### 4. Leaderboard & Rankings
- Global leaderboard sorted by total XP from standard exercises only (pull-ups, push-ups, dips, running)
- Filter by specific exercise type (standard exercises only)
- Custom exercise XP does NOT count toward leaderboard
- Paginated results
- Activity trend visualization (top users' last 7 days)
- Requires authentication to view

### 5. Achievements System
- Unlock badges for milestones:
  - First workout logged
  - Reaching rep count goals
  - Completing challenges
  - Maintaining streaks
  - Reaching level milestones
- Show locked/unlocked states with progress
- Organize by categories

### 6. User Profile
- Avatar: generated via DiceBear API or custom upload (editable)
- Username: permanent, cannot be changed (set during signup)
- Display total statistics per exercise type
- Workout history timeline
- Exercise distribution visualization
- Current streak tracking
- Personal best records

### 7. Social Features
- All users visible on global leaderboard
- Any user can invite any other user to challenges
- Activity feed showing recent workouts
- No follow/unfollow system needed

### 8. Invite System
- Users can generate invite codes for friends (max 5 codes per user)
- Invite codes are 10 characters long
- Users can view their own generated codes and usage status (used/unused)
- Share button for each invite code that creates a shareable URL
  - URL format: `https://yourapp.com/signup?invite=CODE123456`
  - When clicked, opens signup page with invite code pre-filled in the form
- Master invite code for bootstrapping first user
- Show warning when user tries to generate more than 5 codes
- Disable "Generate Invite Code" button when limit reached
- **Admin-only**: Full invitation tree showing who invited whom across all users

### 9. PWA & Offline Support
- App must work offline
- Queue workouts locally in IndexedDB when offline (including custom exercises)
- Automatically sync queued workouts to Firestore when connection restored
- Cache necessary assets for offline use
- Custom exercises fetched from Firestore (cached offline with Firestore persistence)
- Show offline/online status indicator

### 10. Push Notifications
- **Implementation:** Create Next.js API route for sending push notifications
  - Use `web-push` npm package (mature, 1M+ weekly downloads)
  - Written in TypeScript (same as rest of app)
  - Triggered by other API endpoints when events occur (challenge invite, level-up, etc.)
- Request push notification permissions AFTER user completes account creation
- Don't ask during signup - wait until user is logged in
- Use native browser/OS push notifications (Web Push API with VAPID)
- Notification types:
  - Challenge invites received
  - Challenge ending soon (24 hours before deadline)
  - Someone joined your challenge
  - Level up achievements
  - New personal best
- Users can enable/disable notifications in settings
- Show permission status in settings (granted/denied/not asked)
- Store push subscriptions in Firestore (supports multiple devices per user)

### 11. Admin Panel
Access via `isAdmin` flag in user profile:
- First user who signs up with MASTER_INVITE_CODE automatically gets `isAdmin: true`
- OR manually set in Firestore console for first admin
- Admin route at `/admin` - only visible/accessible if user has `isAdmin: true`
- API endpoints verify `isAdmin` flag before returning admin data

**Admin Panel Features:**

**User Management:**
- View all users (searchable, filterable, sortable)
- Ban/unban users (prevents login when banned)
- Delete user accounts
- View detailed user info (join date, XP, workout history, level)
- See invite tree (who invited whom)
- Promote users to admin (add `isAdmin: true` flag)

**System Statistics:**
- Total users count
- Active users (last 7 days, last 30 days)
- Total workouts logged across platform
- Total XP earned platform-wide
- Top 10 users by XP
- Total challenges created
- Growth charts (user signups over time, workouts over time)

**Moderation:**
- View all challenges (public and private)
- Delete inappropriate challenge titles/descriptions
- View recent activity feed across all users
- Monitor custom exercises (check for inappropriate names)
- View flagged content (if reporting feature added later)

**Invite Code Management:**
- Generate bulk invite codes
- View all invite codes (used/unused status)
- See who created each code
- See who used each code
- Revoke unused codes
- Invite code usage statistics

**System Health:**
- Recent errors/failed API calls
- Offline sync queue status
- Database query performance metrics
- API endpoint usage stats

## Database Schema (Firestore)

**Collections needed:**
- `users` - User profiles with level, XP, total stats per exercise, isAdmin flag, isBanned flag, pushSubscription (Web Push API subscription object)
- `exercise_logs` - Individual workout entries (userId, exercise type, amount, timestamp)
- `custom_exercises` - User-defined exercises (userId, name, unit, buttons, max 12 per user)
- `challenges` - Challenge definitions with participants array and progress tracking
- `challengeInvites` - Pending challenge invitations
- `inviteCodes` - Registration codes (10 characters, max 5 per user, track createdBy, used status, usedBy, timestamps)
- `pushSubscriptions` - Web Push subscriptions (userId, subscription object, enabled status, createdAt) - allows multiple devices per user

Store participant progress within challenge documents for real-time updates.

## API Endpoints Required (Next.js API Routes)

Next.js API routes are located in `pages/api/` folder. Each file becomes an endpoint automatically:

**Core Endpoints:**
1. `/api/config` - Firebase config endpoint (public)
2. `/api/auth/signup` - User signup (auto-assign isAdmin if using MASTER_INVITE_CODE)
3. `/api/auth/signin` - User signin
4. `/api/users/[id]` - User profile management (avatar only, no username editing)
5. `/api/users/validate` - Username validation (check availability during signup)
6. `/api/invites/validate` - Invite code validation
7. `/api/invites/generate` - Invite code generation (max 5 per user, 10 characters)
8. `/api/invites` - List user's invite codes

**Workout & Exercise Endpoints:**
9. `/api/workouts` - Workout logging (POST) and history retrieval (GET)
10. `/api/exercises/custom` - Custom exercise management (CRUD, max 12 per user)

**Challenge Endpoints:**
11. `/api/challenges` - Challenge management (CRUD)
12. `/api/challenges/[id]/join` - Join public challenge
13. `/api/challenges/invites` - Challenge invitations (send/accept/decline)

**Leaderboard & Social:**
14. `/api/leaderboard` - Leaderboard rankings (global and filtered)
15. `/api/leaderboard/trend` - Activity trend data

**Admin Endpoints:**
16. `/api/admin/users` - User management (ban/unban, delete, promote)
17. `/api/admin/stats` - System statistics
18. `/api/admin/moderation` - Content moderation
19. `/api/admin/invites` - Bulk invite code management

**Notification Endpoints:**
20. `/api/notifications/send` - Send push notifications via Web Push API
21. `/api/notifications/subscribe` - Save user's push subscription to Firestore
22. `/api/notifications/unsubscribe` - Remove user's push subscription

**Note:** Next.js automatically bundles API routes together, so you can have many more endpoints without hitting Vercel's serverless function limits.

## UI/UX Requirements

**Design Approach:**
- Mobile-first design (optimized for phones)
- Bottom navigation bar
- Support dark mode
- Responsive layout
- Large touch-friendly buttons and controls

**User Experience:**
- Smooth animations and transitions
- Loading states for all async operations
- Empty states with helpful guidance
- Clear error messages with recovery options
- Offline status indicator
- Progress visualizations (bars, charts, graphs)
- Celebration effects for achievements and level-ups

**Customization:**
- Users can reorder home screen sections
- Users can show/hide widgets
- Users can create custom exercises

**Must be installable as PWA**

## Critical Technical Constraints

1. **XP calculations must happen server-side only** - never trust client calculations
   - Only standard exercises (pull-ups, push-ups, dips, running) earn XP
   - Custom exercises earn 0 XP (for tracking purposes only)
2. **Use Firestore transactions** for challenge progress updates to prevent race conditions
3. **Sanitize all user inputs** before storing to database (prevent XSS attacks)
4. **Queue offline workouts in IndexedDB**, sync automatically to Firestore when connection restored
5. **Custom exercises stored in Firestore** - max 12 per user, syncs across devices
6. **Client can only read own data** except for public content (leaderboard, public challenges)
   - Custom exercises visible only to owner and challenge participants who were invited
7. **All database writes** must go through Next.js API routes (server-side only)
8. **Challenge progress auto-updates** - when user logs workout, check active challenges and update matching ones
9. **Use Firebase Admin SDK** in Next.js API routes for database operations
10. **Firestore offline persistence enabled** - custom exercises and user data cached for offline access

## Additional Nice-to-Have Features

- Onboarding flow for first-time users
- Visual streak calendar
- Weekly goal setting
- Personal records highlighting
- Data export functionality (CSV download)
- Workout notes or comments
- Content reporting system (flag inappropriate challenges/usernames)

---

**Build as production-ready PWA using Next.js that works seamlessly offline, has strong security, proper error handling, and feels fast and responsive.**
