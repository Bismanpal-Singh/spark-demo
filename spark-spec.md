# Spark — Full Product & Technical Spec

---

## The Problem

Dating apps are broken in three specific ways:

1. **Matching is purely looks-based** — users make a decision in under a second based on photos alone. Personality, humor, and communication style never factor into initial selection.
2. **After matching, nothing happens** — the blank chat opens, someone sends "hey," and the conversation dies within two messages.
3. **There's no intentional path from match to actual date** — it's ambiguous, awkward to bring up, and one-sided when someone does.

---

## The Core Insight

Every step toward real connection requires both people to show up. Current apps make it completely one-sided — one person swipes, one person messages, one person suggests a date.

**Spark is built on one design principle: mutual effort at every stage.**

---

## The Feature

Spark is one feature with two moments:

### Moment 1 — The Spark
When two people mutually like each other, a shared question appears for both. Neither person can see the other's full profile yet — only partial information. Both must answer the question within 24 hours. When both answer, the spark lights up: full profiles unlock simultaneously, and chat opens with both answers pinned at the top as conversation starters.

### Moment 2 — The Date
Once chatting, either person can send a "Plan a Date" request. The other can accept or say "not yet." When both accept, a shared task unlocks — something personal and fun they complete before the date. It breaks first-date awkwardness before they even meet.

---

## Profile Lock System

### What They See Before Spark
- 1 photo (second photo in their stack — enough to feel real, not their best curated shot)
- First name only
- Age
- First 80 characters of bio, cut off mid-sentence
- No prompts, no extra photos, no distance

### What Unlocks After Spark
- All photos
- Full name
- Full bio
- All prompts and answers
- Distance
- Interests / tags

**Design principle:** The locked state should feel like anticipation, not a broken page. Blurred or greyed out sections, a small lock icon, copy that reads *"Answer the spark question to unlock their full profile."*

---

## User Flow

```
Browse partial profiles → Like / Pass

        ↓ mutual like

Spark prompt appears for both users
Same question — 24 hour window — both must answer

        ↓ both answer

SPARK LIGHTS UP 🔥
Full profiles unlock simultaneously
Chat opens — both answers pinned at top of chat

        ↓ conversation develops naturally

Either user taps "Plan a Date"
Other user sees a card — Accept / Not Yet

        ↓ both accept

Friction task unlocks
Both complete it — creates shared context before the date
Date details (time, place) agreed inside the app
```

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + Tailwind | Fast to build, React-based, easy deploy |
| Backend / DB | Supabase | Auth, Postgres, Realtime, Storage — all in one, free tier |
| Deployment | Vercel | Connect GitHub, live in 2 minutes |

**Build it mobile-first even though it's a webapp.** Narrow centered layout, large touch targets, feels like an app in a browser. Dating apps live on phones — the design should know that.

---

## Project Structure

```
/spark
  /app
    /page.tsx                  -- landing / auth
    /discover/page.tsx         -- browse partial profiles
    /matches/page.tsx          -- list of all matches with status
    /match/[id]/page.tsx       -- individual match view (spark or chat)
    /profile/page.tsx          -- edit your own profile
  /components
    /ProfileCard.tsx           -- partial profile card (pre-spark)
    /ProfileFull.tsx           -- full profile (post-spark)
    /SparkPrompt.tsx           -- question + answer input UI
    /SparkReveal.tsx           -- animation when spark lights up
    /Chat.tsx                  -- chat with pinned answers header
    /DateRequest.tsx           -- plan a date card UI
    /FrictionTask.tsx          -- task display and response UI
    /Timer.tsx                 -- 24hr countdown display
  /lib
    /supabase.ts               -- supabase client setup
    /questions.ts              -- hardcoded question bank + daily picker
    /tasks.ts                  -- hardcoded task bank + selection logic
  /types
    /index.ts                  -- all TypeScript interfaces
```

---

## Database Schema (Supabase / Postgres)

```sql
-- Users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  display_name text,
  age int,
  bio text,
  one_liner text,
  city text,
  interests text[],
  created_at timestamptz default now()
);

-- Photos
create table photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  url text not null,
  position int not null,     -- 0 = primary, 1 = preview shown pre-spark, 2+ = locked
  created_at timestamptz default now()
);

-- Likes
create table likes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid references users(id),
  to_user uuid references users(id),
  created_at timestamptz default now(),
  unique(from_user, to_user)
);

-- Matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references users(id),
  user_b uuid references users(id),
  status text default 'pending',   -- pending | sparked | dating
  question_index int,              -- index into hardcoded questions array
  created_at timestamptz default now()
);

-- Spark Answers
create table spark_answers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id),
  user_id uuid references users(id),
  answer text not null,
  created_at timestamptz default now(),
  unique(match_id, user_id)
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id),
  sender_id uuid references users(id),
  content text not null,
  created_at timestamptz default now()
);

-- Date Requests
create table date_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id),
  requested_by uuid references users(id),
  status text default 'pending',   -- pending | accepted | not_yet
  created_at timestamptz default now()
);

-- Friction Tasks
create table friction_tasks (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id),
  task_key text not null,          -- key referencing hardcoded task bank
  user_a_response text,
  user_b_response text,
  status text default 'active',    -- active | complete
  created_at timestamptz default now()
);
```

### Realtime Subscriptions Needed
- `spark_answers` — detect when both users have answered to trigger spark reveal
- `matches` — status changes (pending → sparked → dating)
- `messages` — live chat
- `date_requests` — when other person responds to date request

### Row Level Security
- Users can read partial data on anyone
- Users can only read full profile data if a sparked match exists between them
- Users can only write their own data
- Matches, messages, answers, tasks readable only by the two participants

---

## Questions — Hardcoded Bank

### Philosophy
- Answerable in 2–3 sentences, not an essay
- Revealing of personality without being invasive
- Slightly unexpected — no pre-rehearsed answer possible
- Two answers to the same question should naturally spark conversation

### Daily Question System
Questions rotate by day. Use `dayIndex = daysSinceEpoch % questions.length` to pick today's question deterministically — no database needed, everyone on the app gets the same question that day.

This is intentional. It creates a shared cultural moment and means you genuinely cannot prepare your answer in advance.

### `lib/questions.ts`

```typescript
export const sparkQuestions: string[] = [

  // Revealing without being heavy
  "What's something you were completely wrong about a few years ago?",
  "What's a hill you'll die on that most people would find ridiculous?",
  "What's the most spontaneous thing you've done in the last year?",
  "What's something you do differently from how most people do it?",
  "What's a skill you have that would genuinely surprise people?",
  "What's the last thing you got unreasonably excited about?",
  "What's something you've changed your mind about recently?",
  "What do you think you're better at than you actually are?",
  "What's a completely irrational thing you believe or do?",
  "What's something you used to be embarrassed about but aren't anymore?",

  // How they spend time
  "What does a perfect Sunday look like for you — be specific?",
  "What's a place in your city you'd take someone who's never been there?",
  "What are you in the middle of right now — book, show, project, phase of life?",
  "What's something you've been meaning to do for months but haven't?",
  "What's the last thing you did for the first time?",
  "How do you actually feel about mornings?",
  "What would you do with a completely free Tuesday — no obligations?",
  "What's a hobby or interest you've picked up and then abandoned?",
  "What's something you do alone that you actually love?",
  "What's your relationship with cooking?",

  // Character and humor
  "What's the most creative excuse you've ever used?",
  "What's a totally unhinged opinion you have about food?",
  "If your friends described you in three words, what would they say — and would you agree?",
  "What's something you find genuinely funny that you can never fully explain?",
  "What's a movie, show, or book you'll defend forever even though people hate it?",
  "What's the worst advice you've ever actually followed?",
  "What's a compliment you've received that you still think about?",
  "What's something you do that makes you feel like a kid again?",
  "What would your enemies say about you?",
  "What's a weird thing that makes you immediately like someone?",

  // Light ambition and curiosity
  "What's something you're quietly working on that no one really knows about?",
  "What's a skill you genuinely wish you had?",
  "What's the last thing you fell down a rabbit hole researching?",
  "What's something you want to get really good at in the next few years?",
  "What's the most interesting thing you've learned this month?",
  "If you could spend a year getting good at one thing with no obligations, what would it be?",
  "What's a place you want to go and what specifically do you want to do there?",
  "What's something you've built, made, or created that you're proud of?",
  "What do you think about on long drives or walks?",
  "What's a question you think about more than most people probably do?",

  // Social and relational
  "What's something that takes most people a while to figure out about you?",
  "What kind of energy do you bring to a group?",
  "How do you actually feel about big social events?",
  "What's the dynamic with your closest friend — how did you meet, what do you do?",
  "What's something a friend did recently that made you appreciate them?",
  "Are you someone people call when something goes wrong or when something goes right?",
  "What do you need to recharge after a social week?",
  "What's something you're weirdly loyal to — brand, team, place, anything?",
  "How do you feel about being early vs on time vs fashionably late?",
  "What's something small you do that you think says a lot about who you are?",
];

export function getTodaysQuestion(): string {
  const epoch = new Date('2024-01-01').getTime();
  const now = new Date().getTime();
  const dayIndex = Math.floor((now - epoch) / (1000 * 60 * 60 * 24));
  return sparkQuestions[dayIndex % sparkQuestions.length];
}

export function getQuestionByIndex(index: number): string {
  return sparkQuestions[index % sparkQuestions.length];
}

export function getTodaysQuestionIndex(): number {
  const epoch = new Date('2024-01-01').getTime();
  const now = new Date().getTime();
  return Math.floor((now - epoch) / (1000 * 60 * 60 * 24)) % sparkQuestions.length;
}
```

---

## Friction Date Tasks — Hardcoded Bank

### Philosophy
Tasks must be **reactive to each other** — they require knowing something about the other person so they cannot be pre-built or copy-pasted. One person reveals, the other responds. The task creates something to talk about on the actual date.

### Selection Logic

```typescript
// lib/tasks.ts

export function selectTask(userA: User, userB: User): Task {
  const sharedInterests = userA.interests?.filter(i =>
    userB.interests?.includes(i)
  ) ?? [];

  const sameCity = userA.city && userB.city && userA.city === userB.city;

  if (sharedInterests.length > 0) {
    return getInterestTask(sharedInterests[0], userA, userB);
  }

  if (sameCity) {
    return getCityTask(userA.city!, userA, userB);
  }

  return getUniversalTask(userA, userB);
}
```

### Universal Tasks (fallback — works for any pair)

**Task: The Pitch**
- Person A: Describe your ideal first date in exactly 10 words.
- Person B: Now plan that date for real — one specific place, one specific time, one thing you'd bring.

**Task: The Prediction**
- Person A: Make three predictions about {nameB} based only on what you know so far. Favorite food, morning or night person, one secret hobby — whatever feels right.
- Person B: React to each one — right, wrong, or "how did you know."

**Task: The Trade**
- Both: Recommend one thing to the other — a song, a place, a show, a food, anything — with one sentence explaining why they specifically would like it.
- Both: Respond with whether you'll actually try it and why or why not.

**Task: The Defense**
- Both: Name one place, food, or experience the other person has to try before the date.
- Both: Either agree to try it or defend why you won't.

**Task: The Constraint Date**
- Together: Plan a 2-hour date. Rules — no restaurants as the main event, no movies, budget under $20 each.
- Task is complete when both agree on a plan. That plan becomes the date.

### Interest-Based Tasks (when shared interest detected)

**Task: The Ranking**
- Both independently list top 3 within the shared interest (top 3 cuisines, cities visited, albums, trails — whatever fits).
- Share lists. Discuss the overlap and the disagreements on the date.

**Task: The Debate**
- Person A: Propose one specific option within the shared interest as the date activity (specific trail, specific restaurant genre, specific type of show).
- Person B: Agree and add one detail, or counter-propose and defend it.

### City-Based Tasks (when same city detected)

**Task: The Hidden Gem**
- Each person shares one thing about the city they love that isn't on any tourist list. A street, a coffee shop, a viewpoint, a time of day somewhere.
- Together: Pick one as the date starting point.

**Task: The Local Challenge**
- Person A: Name a spot in the city the other person has probably never been to.
- Person B: Name a spot back.
- Together: Decide which one becomes the date location.

---

## Key UI Moments — Build These Well

### 1. The Spark Reveal
This is the emotional core of the entire product. Do not just reload the page.

Trigger a deliberate sequence:
- Small flame animation (CSS only, no library needed)
- Profile pieces reveal one by one with staggered fade-in
- Copy: *"Your spark lit up"*
- Smooth transition into chat view
- Both answers visible as a pinned header in the chat

Spend disproportionate time on this one moment. It will be the clip that stands out in your video.

### 2. The Locked Profile State
Should feel like **anticipation**, not a broken or incomplete page.

- Preview photo visible, remaining photos blurred or shown as placeholder silhouettes
- Bio cuts off mid-sentence with a fade
- Small lock icon on hidden sections
- Copy: *"Answer the spark question to unlock their full profile"*

### 3. The Date Request Card
Should feel like a moment, not a notification.

- Full-width card inside chat
- Copy: *"[Name] wants to take this further"*
- Two clear buttons: Accept / Not Yet
- Not Yet is important — less brutal than decline, more honest than ignoring

### 4. Empty States
Every empty state should feel intentional:

| State | Copy |
|---|---|
| No matches yet | *"Your sparks are coming"* |
| Waiting for other person to answer | *"Waiting for their spark..."* + timer |
| 24hrs passed, one person didn't answer | *"This spark faded — some do"* |
| Chat before date request | Normal chat, "Plan a Date" button subtle in header |

---

## What NOT to Build For This Submission

Keep scope tight. The following are out of scope and should only appear as mockup screens if at all:

- Push notifications
- Photo upload (use placeholder photos / seeded data)
- Matching algorithm / preference filters (just show all users)
- Post-date check-in / rating
- Profile editing beyond basic setup

The goal is one complete, polished flow — not a full app.

---

## Demo Flow For The Video

Build and demo live:
1. Partial profile card — explain what's locked and why
2. Mutual like triggers spark prompt
3. Answer as User A — show waiting state with timer
4. Switch to User B — answer the question
5. Spark reveal animation — this is your hero moment
6. Chat opens with both answers pinned at top
7. Date request card sent and accepted
8. Friction task unlocks and displays

Show as designed mockup screens:
- Task completion UI
- Date confirmed state

---

## What To Say In The Video

**Opening (30 seconds):**
> "The average user gets dozens of matches and goes on almost no dates. The bottleneck isn't matching — it's that nothing meaningful happens after. Spark is built on one idea: every step toward real connection should require both people to show up."

**Closing (45 seconds):**
> "I scoped this to the Spark prompt and Date flow for this submission. The next thing I'd build is the post-date moment — a simple private check-in that closes the loop and tells us what actually worked, not just what got swiped. I'd also instrument how many matches make it from spark to date request, because that conversion rate is the single most important signal for whether this feature is doing its job."

---

## Hardcoding vs Database — Why Hardcoding Is Right For Now

Questions and tasks are hardcoded as arrays in `/lib/questions.ts` and `/lib/tasks.ts`.

This is intentional for this submission:
- Zero additional infra — no CMS, no admin panel, no seeding scripts
- Identical user experience to a database-driven system
- In production, the right move is a lightweight CMS so non-technical team members can manage the question bank without a deploy

Mention this in the video. It signals you know the tradeoff and made a deliberate call — not that you didn't think about it.
