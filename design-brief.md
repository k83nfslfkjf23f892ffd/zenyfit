# Fitness Gamification App - Design Brief

Design a mobile-first PWA fitness tracking app with XP/leveling, challenges, and leaderboards.

## Design Principles

**Mobile-First:**
- Optimized for phones (320px - 428px width)
- Touch-friendly controls (minimum 44px tap targets)
- Thumb-zone optimized layouts
- Bottom navigation for primary actions

**Visual Design:**
- Clean, modern interface
- Gamification elements (XP bars, level badges, achievement cards)
- Data visualization (progress bars, charts, graphs)
- Celebration animations (level-ups, achievements)
- Support both light and dark mode

**User Experience:**
- Smooth animations and transitions
- Immediate visual feedback for all actions
- Loading states for async operations
- Empty states with helpful guidance
- Clear error messages with recovery options
- Offline status indicator (always visible)
- Progressive disclosure (don't overwhelm users)

## Core User Flows

### 1. First-Time User Journey
```
Receive invite link → Click link (code pre-filled) → Signup page →
Choose username (3-12 chars, permanent warning) → Set password (7+ chars) →
Create account → Welcome/Dashboard → Quick tutorial (optional)
```

### 2. Logging Workout
```
Dashboard → Tap exercise type → Enter amount (or use quick buttons) →
Submit → Success animation + XP gained → Level up celebration (if leveled)
```

### 3. Creating Challenge
```
Challenges tab → Create Challenge button → Fill form (title, exercise, goal, duration) →
Set privacy (public/invite-only) → Invite users (if private) → Create →
View challenge detail → Share with friends
```

### 4. Joining Challenge
```
Browse challenges OR receive invite → View challenge details →
Join button → Confirmation → Challenge added to "My Challenges"
```

## Pages & Screens

### PUBLIC (Unauthenticated)

#### 1. Signup Page
**URL:** `/signup?invite=CODE123`

**Elements:**
- App logo/branding
- Invite code field (auto-filled from URL param)
- Username field
  - Real-time validation messages
  - "Minimum 3 characters required"
  - "Maximum 12 characters allowed"
  - Warning: "Username cannot be changed later" (always visible)
- Password field
  - Real-time validation: "Minimum 7 characters required"
- Submit button (disabled until validation passes)
- Link to login page

**Validation Display:**
- Modern, inline validation (like GitHub, Twitter)
- Green checkmark when field is valid
- Red error text when field is invalid
- Warning icon for permanent username notice

#### 2. Login Page
**URL:** `/login`

**Elements:**
- App logo/branding
- Username field
- Password field
- Login button
- "Need an account?" message (no public signup, explain invite-only)
- Error messages for invalid credentials

---

### MAIN APP (Authenticated)

#### 3. Dashboard / Home
**URL:** `/` or `/dashboard`

**Primary Content:**
- **User Header:**
  - Avatar (generated or custom)
  - Username
  - Level badge
  - Current XP progress bar to next level
  - Tap to view full profile

- **Workout Logger (Primary Action):**
  - Exercise selector (tabs or dropdown)
    - Pull-ups, Push-ups, Dips, Running, Custom exercises
  - Amount input field (large, easy to type)
  - Quick-action buttons (e.g., +5, +10, +25, +50)
  - Submit button (large, prominent)
  - Show XP earned preview before submitting

- **Recent Activity Feed:**
  - Your recent workouts (last 5-10)
  - Show: exercise type, amount, XP earned, time ago
  - Offline badge on workouts not yet synced

- **Quick Stats Cards:**
  - Today's total XP
  - Current streak (days)
  - Active challenges count

- **Offline Indicator:**
  - Persistent badge (top or bottom)
  - Shows "Offline" or "Online"
  - Visual icon (WiFi crossed out / checked)

**Bottom Navigation:**
- Home (active)
- Leaderboard
- Challenges
- Profile

#### 4. Leaderboard Page
**URL:** `/leaderboard`

**Elements:**
- **Filter Tabs:**
  - All XP (default)
  - Pull-ups
  - Push-ups
  - Dips
  - Running

- **Leaderboard List:**
  - Rank number (1, 2, 3, ...)
  - Avatar
  - Username
  - Level badge
  - Score (XP or exercise-specific total)
  - Highlight current user's row
  - Paginated (load more on scroll)

- **Activity Trend Chart:**
  - Line/bar chart showing top users' activity (last 7 days)
  - Average daily workouts or XP

**Bottom Navigation:**
- Home
- Leaderboard (active)
- Challenges
- Profile

#### 5. Challenges Page
**URL:** `/challenges`

**Tabs:**
- **My Challenges** (default)
- **Discover** (public challenges)

**My Challenges Tab:**
- List of challenges user joined
- Each card shows:
  - Challenge title
  - Exercise type icon
  - Goal (e.g., "500 push-ups in 7 days")
  - Your progress bar (e.g., 200/500)
  - Time remaining (countdown)
  - Participant count
  - Tap to view details

**Discover Tab:**
- List of public challenges (joinable)
- Same card design as above
- "Join" button on each card
- Empty state: "No public challenges yet. Create one!"

**Floating Action Button:**
- "+ Create Challenge" (bottom right)

**Bottom Navigation:**
- Home
- Leaderboard
- Challenges (active)
- Profile

#### 6. Challenge Detail Page
**URL:** `/challenges/[id]`

**Elements:**
- **Header:**
  - Challenge title
  - Description
  - Exercise type
  - Goal
  - Time remaining (countdown timer)
  - Public/Private badge
  - Creator name

- **Progress Visualization:**
  - Large progress circle or bar
  - Overall completion percentage

- **Participants List:**
  - Ranked by progress
  - Avatar, username, progress bar, percentage
  - Highlight current user

- **Actions:**
  - "Invite Friends" button (if creator or private challenge)
  - "Leave Challenge" button
  - "Share" button

**Back Button:**
- Return to Challenges page

#### 7. Profile Page
**URL:** `/profile` or `/profile/[userId]`

**Own Profile:**
- **Header:**
  - Large avatar (tap to edit)
  - Username (permanent, not editable)
  - Level badge
  - XP and progress bar

- **Stats Overview:**
  - Total workouts logged
  - Current streak
  - Total XP
  - Personal bests per exercise

- **Exercise Breakdown:**
  - Visual chart (pie or bar)
  - Total per exercise type
  - XP earned per exercise type

- **Workout History:**
  - Timeline/list of recent workouts
  - Filter by exercise type
  - Scrollable, paginated

- **Achievements Section:**
  - Grid of badge icons
  - Locked (grayed out) vs unlocked (colored)
  - Tap for details and progress

- **XP Info Button (ⓘ):**
  - Tap to open modal explaining:
    - XP per exercise type
    - Level progression formula
    - "Why these values?" explanation

- **Settings Button:**
  - Tap to open Settings page

**Other User's Profile:**
- Same as above, but:
  - No edit avatar option
  - No settings button
  - "Challenge" button to invite them to a challenge

#### 8. Settings Page
**URL:** `/settings`

**Sections:**

**Account:**
- Avatar (tap to change)
  - Choose generated avatar (DiceBear)
  - Upload custom image
- Username (display only, grayed out, "Cannot be changed")

**Custom Exercises:**
- List of user's custom exercises (max 12)
- Add new custom exercise button (disabled if limit reached)
- Edit/delete existing custom exercises
- Warning when trying to add 13th exercise

**Notifications:**
- Push notification toggle (On/Off)
- Permission status: "Granted" / "Denied" / "Not asked"
- Notification types checkboxes:
  - Challenge invites
  - Challenge ending soon
  - Someone joined your challenge
  - Level ups
  - New personal bests

**Invites:**
- My invite codes (list of 5 max)
  - Code string
  - Usage status (Used/Unused)
  - Share button (creates URL: `app.com/signup?invite=CODE`)
- "Generate Invite Code" button (disabled if 5 already created)
- Warning when trying to create 6th code

**App Settings:**
- Dark mode toggle
- Offline sync status

**Account Actions:**
- Logout button

#### 9. Admin Dashboard
**URL:** `/admin`

**Access:** Only visible if user has `isAdmin: true`

**Navigation Tabs:**
- Users
- Statistics
- Moderation
- Invites
- System Health

**Users Tab:**
- Search bar
- Filter/sort options
- User list table:
  - Avatar, username, level, XP, join date, status (active/banned)
  - Actions: View details, Ban/Unban, Delete, Promote to admin
- User detail view:
  - Full profile info
  - Workout history
  - Invite tree (who they invited)

**Statistics Tab:**
- Overview cards:
  - Total users
  - Active users (7 days, 30 days)
  - Total workouts
  - Total XP
  - Total challenges
- Growth charts:
  - User signups over time (line chart)
  - Workouts over time (line chart)
  - Top 10 users by XP (bar chart)

**Moderation Tab:**
- All challenges list (public + private)
- All custom exercises list
- Recent activity feed (all users)
- Flagged content (if reporting exists)
- Delete buttons for inappropriate content

**Invites Tab:**
- Generate bulk invite codes (input number, generate button)
- All invite codes table:
  - Code, created by, used by, status, created date, used date
  - Actions: Revoke (if unused)
- Invite tree visualization
- Usage statistics

**System Health Tab:**
- Recent errors/failed API calls
- Offline sync queue status
- Database performance metrics
- API endpoint usage stats

---

## Components & Modals

### Workout Logger Component
**Used on:** Dashboard

**Elements:**
- Exercise selector (tabs or dropdown)
- Amount input (number)
- Quick-action buttons (+5, +10, +25, +50)
- Submit button
- XP preview text
- Loading state while submitting
- Success animation when logged

### Create Challenge Modal
**Triggered by:** "Create Challenge" button

**Form Fields:**
- Title (text input, max 100 chars)
- Description (textarea, max 500 chars, optional)
- Exercise type (dropdown: standard + user's custom exercises)
- Goal amount (number)
- Duration (date range picker or days input)
- Privacy (radio buttons: Public / Invite-only)
- If invite-only: User selector (search/select multiple users)

**Actions:**
- Cancel button
- Create button

### Custom Exercise Creator Modal
**Triggered by:** "Add Custom Exercise" in Settings

**Form Fields:**
- Exercise name (text input)
- Unit (text input, e.g., "reps", "km", "minutes")
- Quick action values (4 number inputs for button amounts)

**Validation:**
- Show warning if user has 12 exercises
- Disable submit if limit reached

**Actions:**
- Cancel button
- Save button

### Achievement Celebration Overlay
**Triggered by:** Level up or unlocking achievement

**Elements:**
- Full-screen overlay (semi-transparent background)
- Large badge/level icon
- Congratulatory text ("Level Up! You're now Level 5")
- XP gained
- Confetti or sparkle animation
- "Continue" button

### Invite Users Modal
**Triggered by:** "Invite Friends" on challenge detail

**Elements:**
- Search bar (filter users)
- User list (checkbox selection)
- Selected count
- Send invites button

### XP Info Modal
**Triggered by:** Info button (ⓘ) on profile

**Content:**
- "How XP Works" heading
- XP values per exercise:
  - Pull-ups: 15 XP/rep
  - Push-ups: 3 XP/rep
  - Dips: 12 XP/rep
  - Running: 30 XP/km
  - Custom exercises: 0 XP (tracking only)
- Level progression explanation:
  - Levels 1-10: Fixed thresholds
  - Level 11+: +7000 XP per level
- "Why these values?"
  - Balanced based on exercise difficulty and time investment
- Close button

### Offline Indicator Badge
**Always visible**

**States:**
- Online: Green WiFi icon or "Online" text
- Offline: Red WiFi-off icon or "Offline" text
- Syncing: Yellow icon with spinner, "Syncing..."

**Position:** Top bar or bottom (above navigation)

### Avatar Picker Modal
**Triggered by:** Tap avatar in profile or settings

**Options:**
- Tab 1: Generated Avatars (DiceBear)
  - Grid of avatar styles
  - Tap to select
- Tab 2: Upload Custom
  - File picker
  - Crop/resize tool
  - Max 200KB warning

**Actions:**
- Cancel button
- Save button

---

## Design System Guidelines

### Colors

**Primary:**
- Use vibrant, energetic colors (e.g., electric blue, neon green, orange)
- Gamification feel (like fitness games, not corporate apps)

**Semantic:**
- Success: Green (workouts logged, challenges completed)
- Warning: Orange/Yellow (offline mode, limits reached)
- Error: Red (validation errors, failed actions)
- Info: Blue (tips, XP explanations)

**Themes:**
- Light mode: White/light gray backgrounds, dark text
- Dark mode: Dark gray/black backgrounds, light text
- Support system preference detection

### Typography

**Hierarchy:**
- Headings: Bold, larger (24px - 32px)
- Body: Regular, readable (16px - 18px)
- Captions: Smaller, secondary info (12px - 14px)
- Numbers/Stats: Monospace or bold (for XP, levels, counts)

**Readability:**
- Line height 1.5 - 1.6
- Comfortable line length (mobile-optimized)

### Spacing

**Touch Targets:**
- Minimum 44px x 44px for buttons
- Generous padding around interactive elements

**Layout:**
- Consistent padding/margin (8px, 16px, 24px, 32px grid)
- Card-based layouts with spacing between cards
- Bottom navigation padding for thumb zone

### Iconography

**Icon Style:**
- Outlined or filled (consistent throughout)
- Exercise icons (dumbbell, running shoe, etc.)
- Navigation icons (home, trophy, flag, user)
- Status icons (checkmark, error, info, offline)

**Exercise Type Icons:**
- Pull-ups: Bar icon
- Push-ups: Hands icon
- Dips: Parallel bars icon
- Running: Running shoe icon
- Custom: Star or custom icon

### Animations

**Micro-interactions:**
- Button press (scale down slightly)
- Form submission (loading spinner)
- Success states (checkmark animation)

**Celebrations:**
- Level up: Confetti, badge zoom-in
- Achievement unlocked: Badge slide-in, glow effect
- Workout logged: Pulse effect, XP counter

**Transitions:**
- Page changes: Slide or fade (300ms)
- Modal open/close: Scale + fade (200ms)
- List updates: Fade in/out (150ms)

### Data Visualization

**Progress Bars:**
- Clear start/end markers
- Show percentage or fraction (e.g., "200/500")
- Color gradient or solid fill
- Smooth animation when updating

**Charts:**
- Leaderboard trends: Line or bar chart
- Exercise distribution: Pie or donut chart
- Growth charts (admin): Line charts with grid

**XP Progress:**
- Horizontal bar with level markers
- Circular progress (alternative)
- Animated fill on XP gain

---

## Responsive Behavior

### Mobile (Primary Target)
- 320px - 428px width
- Single column layouts
- Bottom navigation (sticky)
- Full-width buttons
- Large touch targets
- Stacked cards

### Tablet (Optional)
- 768px - 1024px width
- Two-column layouts where appropriate
- Side navigation (optional)
- Larger charts and visualizations

### Desktop (Optional)
- 1024px+ width
- Multi-column layouts
- Sidebar navigation
- Max content width (1200px centered)

---

## Accessibility

**Contrast:**
- WCAG AA minimum (4.5:1 for text)
- Test both light and dark modes

**Interactive Elements:**
- Clear focus states (keyboard navigation)
- Tap targets at least 44px

**Screen Readers:**
- Semantic HTML
- ARIA labels where needed
- Alt text for icons and images

**Color Blindness:**
- Don't rely solely on color for information
- Use icons + text for status indicators

---

## Empty States

**No Workouts Yet:**
- Illustration or icon
- "Start your fitness journey!"
- "Log your first workout to earn XP" button

**No Challenges:**
- "No active challenges"
- "Browse public challenges or create your own"
- Call-to-action buttons

**No Users (search/filter):**
- "No users found"
- "Try a different search term"

**No Custom Exercises:**
- "Create your first custom exercise"
- Explanation of what custom exercises are

---

## Loading States

**Page Loading:**
- Skeleton screens (gray placeholders)
- Spinner for initial load

**Action Loading:**
- Button shows spinner + "Loading..."
- Disable button during action

**Data Fetching:**
- Shimmer effect on cards/lists
- Preserve layout (no content shift)

---

## Error States

**Form Validation:**
- Inline error messages (red text)
- Icon + text for clarity
- Show on blur or submit

**Network Errors:**
- Toast notification (bottom or top)
- "Failed to save. Try again."
- Retry button

**Offline Mode:**
- Banner: "You're offline. Changes will sync when online."
- Queue indicator showing pending workouts

---

## Key Interactions

**Workout Logging:**
1. User selects exercise
2. Enters amount (or taps quick button)
3. Taps submit
4. Loading spinner on button
5. Success animation + XP gained notification
6. If level up → celebration overlay
7. Workout appears in recent activity

**Creating Challenge:**
1. Tap "Create Challenge"
2. Modal opens
3. Fill form fields
4. Tap "Create"
5. Loading state
6. Success → redirect to challenge detail
7. Toast: "Challenge created!"

**Joining Challenge:**
1. Browse or receive invite
2. Tap challenge card
3. View details
4. Tap "Join"
5. Confirmation modal
6. Success → challenge added to "My Challenges"
7. Toast: "You joined the challenge!"

---

## Notes for Designers

- Design for **thumb zones** (bottom 2/3 of screen)
- Use **cards** for grouping related content
- **Gamify everything** - badges, XP bars, level indicators
- Keep **navigation simple** - max 4-5 bottom tabs
- Show **real-time feedback** - no silent failures
- **Celebrate wins** - level ups, achievements, PRs
- Make **offline mode obvious** - always show status
- Use **progressive disclosure** - don't show everything at once
- **Primary actions** should be obvious and large
- Test designs in **both light and dark mode**

---

**This is a gamified fitness app - make it fun, energetic, and motivating! Think Duolingo meets Strava.**
