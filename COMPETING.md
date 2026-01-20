# COMPETING.md

This document outlines how ZenyFit handles exercise tracking, XP calculations, and competition between users.

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Exercise Categories](#exercise-categories)
3. [XP Calculation Methodology](#xp-calculation-methodology)
4. [XP Values by Exercise](#xp-values-by-exercise)
5. [Leaderboard Structure](#leaderboard-structure)
6. [Time Tracking](#time-tracking)
7. [Challenges](#challenges)
8. [Open Questions](#open-questions)

---

## Core Philosophy

ZenyFit is built on these fundamental principles:

1. **Social Motivation** - "Others are working hard, I should too"
2. **Gamification** - XP makes fitness fun and trackable
3. **Competition** - Leaderboards and challenges push people beyond limits
4. **Fairness** - Challenges must feel fair so competition is meaningful
5. **Urgency** - Seeing others progress creates healthy pressure

---

## Exercise Categories

Exercises are grouped into three categories to enable fair comparison:

| Category | Exercises | Unit | Comparison Basis |
|----------|-----------|------|------------------|
| **Calisthenics** | Push-ups, pull-ups, dips, muscle-ups, australian pull-ups | Per rep | Biomechanical difficulty |
| **Team Sports** | Volleyball, basketball, soccer | Per minute | MET values / intensity |
| **Cardio** | Running, walking, swimming, sprinting | Per km or min | Energy expenditure |

### Why Categories?

- Comparing pull-ups to running is "apples to oranges"
- Within a category, exercises can be fairly balanced
- Users compete against others doing similar activities

---

## XP Calculation Methodology

### Approach: Pure Biomechanical Difficulty

XP is calculated based on scientific data, NOT on how many reps a "normal person" can do.

**Factors considered:**
1. **Body weight percentage** - How much of your body weight you're lifting
2. **EMG muscle activation** - Scientific studies on muscle recruitment (%MVIC)
3. **Range of motion** - Deeper ROM = more difficulty
4. **Mechanical advantage** - Pulling vs pushing, joint angles
5. **Assuming 80-95% proper form execution**

### What We Track vs Don't Track

| Factor | Include? | Reason |
|--------|----------|--------|
| Exercise type | **Yes** | Core of XP system |
| Exercise variation | **Yes** | Rewards progression (knee → standard → archer) |
| Weighted exercises (+kg) | **Yes** | Measurable, user knows the added weight |
| User body weight | **No** | Same relative effort for everyone (100% of YOUR weight) |
| Muscle/fat ratio | **No** | Users can't accurately measure, easy to game |
| Tempo/speed | **No** | Too hard to track accurately |

### Why Not Track Body Weight or Composition?

**The fairness argument:**
- 90kg person doing pull-ups = lifting 90kg (100% of their weight)
- 60kg person doing pull-ups = lifting 60kg (100% of their weight)
- Both are giving the same **relative effort**

**Volume naturally balances strength:**
- Stronger person does more reps → earns more XP through volume
- Weaker person does fewer reps → limited by capacity, not penalized per-rep
- No need to adjust XP per rep based on body composition

**Practical problems with body composition:**
- DEXA scans cost $100+, most users don't have access
- Body fat scales are inaccurate (±5-10%)
- Self-reporting is unreliable and gameable

### Scientific Sources

| Exercise | Body Weight % | Source |
|----------|---------------|--------|
| Push-ups | 64% | Suprak et al., Journal of Strength & Conditioning Research |
| Pull-ups | 100% | Same study |
| Dips | 90-100% | Estimated from literature |
| Australian pull-ups | 40-60% | Youdas et al. (2016) |

**MET Values (Metabolic Equivalent of Task):**
| Activity | MET Value | Source |
|----------|-----------|--------|
| Calisthenics (vigorous) | 8.0 | Compendium of Physical Activities |
| Running (8 km/h) | 8-9 | Compendium of Physical Activities |
| Walking (5 km/h) | 3.5-4.0 | Compendium of Physical Activities |
| Volleyball | 8.0 | Compendium of Physical Activities |

---

## XP Values by Exercise

### Calisthenics (Per Rep)

#### Base Exercises

| Exercise | XP | Multiplier vs Push-up | Reasoning |
|----------|-----|----------------------|-----------|
| Push-ups | 3 | 1.0x (baseline) | 64% body weight |
| Australian pull-ups | 2-3 | 0.7-1.0x | 40-60% body weight, easier angle |
| Dips | 5-6 | ~1.8x | 95% body weight, deeper ROM |
| Pull-ups | 5-6 | ~1.8-2x | 100% body weight, pulling harder than pushing |
| Muscle-ups | 10-12 | ~2x pull-up | Pull-up + transition + partial dip |

#### Push-up Variations

| Variation | Difficulty | XP | Reasoning |
|-----------|------------|-----|-----------|
| Knee push-ups | 0.5x | 1-2 | ~49% body weight |
| Incline push-ups | 0.7x | 2 | ~40-55% body weight |
| Standard push-ups | 1.0x | 3 | 64% body weight (baseline) |
| Decline push-ups | 1.2x | 4 | ~75% body weight |
| Diamond push-ups | 1.3x | 4 | Increased tricep demand |
| Archer push-ups | 1.5x | 5 | Asymmetric loading |
| One-arm push-ups | 2.0x | 6 | Near full body weight on one arm |

#### Pull-up Variations

| Variation | Difficulty | XP | Reasoning |
|-----------|------------|-----|-----------|
| Assisted pull-ups | 0.5x | 3 | Reduced load |
| Chin-ups | 0.95x | 5-6 | Slightly easier due to bicep advantage |
| Standard pull-ups | 1.0x | 5-6 | 100% body weight |
| Wide grip pull-ups | 1.1x | 6-7 | Reduced mechanical advantage |
| L-sit pull-ups | 1.3x | 7-8 | Added core demand |
| Weighted pull-ups | Varies | +1 XP per 5kg | Measurable added load |

#### Dip Variations

| Variation | Difficulty | XP | Reasoning |
|-----------|------------|-----|-----------|
| Bench dips | 0.5x | 3 | Feet on ground, reduced load |
| Parallel bar dips | 1.0x | 5-6 | Full body weight |
| Ring dips | 1.2x | 7 | Added instability |
| Weighted dips | Varies | +1 XP per 5kg | Measurable added load |

### Cardio (Per Unit)

| Exercise | XP | Unit | Reasoning |
|----------|-----|------|-----------|
| Walking | 15-20 | per km | ~0.5x running MET, 55 kcal/km |
| Running | 30-50 | per km | 8-9 MET, 70 kcal/km |
| Swimming | TBD | per km or min | Higher resistance than running |
| Sprinting | TBD | per 100m or min | Very high intensity, short duration |

### Team Sports (Per Minute)

| Exercise | XP | Unit | Reasoning |
|----------|-----|------|-----------|
| Volleyball | 2 | per min | 8.0 MET, intermittent with rest |
| Basketball | TBD | per min | Similar MET to volleyball |
| Soccer | TBD | per min | More continuous than volleyball |

---

## Leaderboard Structure

### Option A: Category-Based Only

| Leaderboard | Ranked By | Shows |
|-------------|-----------|-------|
| Calisthenics | XP | Total calisthenics XP |
| Team Sports | XP | Total team sports XP |
| Cardio | XP | Total cardio XP |

### Option B: Category + Global

| Leaderboard | Ranked By | Shows |
|-------------|-----------|-------|
| Calisthenics | XP | Total calisthenics XP |
| Team Sports | XP | Total team sports XP |
| Cardio | XP | Total cardio XP |
| Global | Time (active) | Total active time across all categories |
| Overall XP | XP | Total XP (with known category imbalance) |

### Option C: Multiple Global Metrics

| Leaderboard | Ranked By | Purpose |
|-------------|-----------|---------|
| Category leaderboards | XP | Fair comparison within category |
| Active Time | Minutes | Rewards dedication/volume |
| Workout Count | Sessions | Rewards consistency |
| Streak | Days | Rewards daily habit |

**Decision needed:** Which structure best fits the app philosophy?

---

## Time Tracking

### The Challenge

Different exercise types have fundamentally different time profiles:

| Category | Active Time | Total Session Time | Ratio |
|----------|-------------|-------------------|-------|
| Calisthenics | 5-10 min | 30-60 min | ~15-20% |
| Team Sports | 30-60 min | 60-120 min | ~50% |
| Cardio | 30-60 min | 30-60 min | ~100% |

### Calisthenics Time Tracking

**Proposed: Estimate from reps**

| Exercise | Seconds per rep | Example: 50 reps |
|----------|-----------------|------------------|
| Push-up | 2 sec | 100 sec (1.7 min) |
| Australian pull-up | 2 sec | 100 sec (1.7 min) |
| Pull-up | 3 sec | 150 sec (2.5 min) |
| Dip | 3 sec | 150 sec (2.5 min) |
| Muscle-up | 5 sec | 250 sec (4.2 min) |

**Open questions:**
- Are these seconds per rep accurate?
- What about tempo variations? (slow controlled vs explosive)
- What about isometric exercises? (planks, holds)

### Team Sports Time Tracking

**Proposed: User input with guidance**

| Session Type | Suggested Duration |
|--------------|-------------------|
| Quick practice | 45 min |
| Training session | 90 min |
| Match/Game | 60 min |
| Tournament day | 180 min |

**Open questions:**
- How does a user know their "active time"?
- Volleyball: lots of standing between points
- Basketball: free throws, timeouts, fouls
- Soccer: more continuous but still stoppages
- Should there be a daily cap to prevent abuse?

### Cardio Time Tracking

**Proposed: Automatic calculation or user input**

- Running/walking: Time = Distance / Pace (or user enters duration)
- Swimming: User enters duration or laps

**Open questions:**
- What about intervals? (sprint 30 sec, rest 60 sec)
- Walking breaks during a run - count as active time?

---

## Challenges

### Core Rules

1. **Single exercise type only** - A challenge is for ONE specific exercise (e.g., "Pull-up challenge", not "Workout challenge")
2. **Same metric for all participants** - Everyone competes on reps, distance, or time
3. **Fair start** - All participants start from zero for the challenge period

### Challenge Types by Category

| Category | Challenge Metric | Example |
|----------|------------------|---------|
| Calisthenics | Total reps | "Most pull-ups in 7 days" |
| Team Sports | Total minutes | "Most volleyball time in 7 days" |
| Cardio | Total distance or time | "Most km run in 7 days" |

---

## User Interface & Display (TODO)

This section outlines how XP calculations and data will be presented to users. **Status: Not yet decided**

### Logging Flow - How Users Enter Data

#### Calisthenics Input Flow
```
1. User selects: Exercise (e.g., Pull-ups)
2. User selects: Variation (Standard / Wide grip / L-sit / Weighted)
3. If weighted: User enters +kg
4. User enters: Reps
→ System calculates: XP + estimated active time
```

#### Team Sports Input Flow
```
1. User selects: Sport (e.g., Volleyball)
2. User selects: Session type (Quick practice / Training / Match)
   OR User enters: Minutes played
→ System calculates: XP
```

#### Cardio Input Flow
```
1. User selects: Activity (e.g., Running)
2. User enters: Distance (km) OR Duration (min)
→ System calculates: XP
```

### Post-Log Feedback Options

**Option A: Simple**
```
✓ 15 Pull-ups logged
+90 XP
```

**Option B: Detailed**
```
✓ 15 Pull-ups (Wide grip) logged
+105 XP (15 × 7 XP)
Active time: 45 sec
```

**Option C: Gamified**
```
🔥 15 Pull-ups logged!
+105 XP
Total today: 340 XP
You're #3 on the leaderboard!
```

**Decision needed:** Which feedback style fits the app philosophy?

### Leaderboard Display Options

**What to show:**
- XP only?
- Time only?
- Both XP and time?
- Exercise breakdown?

**Time periods:**
- Daily
- Weekly
- Monthly
- All-time

**Leaderboard types:**
- Global (all users)
- Category-specific (Calisthenics / Team Sports / Cardio)
- Friends only
- Challenge-specific

### Profile/Stats View

**Possible displays:**
- Total XP (all time)
- XP by category
- Active time (total / by category)
- Workout count
- Current streak
- Personal records (most reps, longest run, etc.)
- Progress charts over time

### Questions to Resolve

1. **Logging flow:** How many taps to log an exercise? Prioritize speed or detail?
2. **Variations:** Show all variations upfront, or hide behind "advanced" toggle?
3. **Post-log feedback:** Simple, detailed, or gamified?
4. **Leaderboard primary metric:** XP or time or both?
5. **Social features:** Show friends' recent activity? Real-time updates?

---

## Open Questions

### XP Balancing

1. Should XP be balanced across categories for total XP comparison, or stay "pure difficulty" within each category?
2. Are the current XP values (pull-ups 5-6, dips 5-6, push-ups 3) correctly balanced?
3. How to handle new exercises being added?

### Time Tracking

1. Is "active time" the right metric for global comparison?
2. How to fairly estimate calisthenics active time from reps?
3. How to handle team sports where active time is hard to measure?
4. Should rest time ever count?

### Leaderboards

1. Should there be a global leaderboard at all?
2. If yes, what metric? (Time, XP, workout count, streak?)
3. How to prevent gaming/cheating on time-based metrics?

### Future Exercises

Exercises to potentially add with XP values TBD:
- Squats
- Lunges
- Planks (isometric - time-based?)
- Burpees
- Box jumps
- Cycling
- Rowing
- Jump rope

---

## Version History

| Date | Changes |
|------|---------|
| 2026-01-20 | Initial document created based on XP methodology discussion |
| 2026-01-20 | Added "What We Track vs Don't Track" section - decided against body weight and muscle/fat ratio tracking |
| 2026-01-20 | Added exercise variations with XP values (push-up, pull-up, dip variations) |
| 2026-01-20 | Added "User Interface & Display" section (TODO) - logging flows, feedback options, leaderboard display |

---

## References

- Suprak et al., Journal of Strength & Conditioning Research - Push-up body weight study
- Youdas et al. (2016) - Inverted row EMG activation
- Compendium of Physical Activities (2024) - MET values
- PMC - Muscle Activity During Ring vs Bar Muscle-Up
- PubMed - Energy expenditure walking vs running
