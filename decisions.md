# Spark MVP Decisions Log

## D-001: Profile Lock Enforcement (Demo vs Production)
- Date: 2026-04-28
- Status: Accepted (MVP)
- Decision:
  - For demo/MVP, locked vs unlocked profile visibility is enforced in UI state only.
  - Full backend authorization enforcement (RLS for partial/full profile reads) is deferred.
- Rationale:
  - Speeds up MVP delivery and keeps focus on Spark and Date flow.
  - Still demonstrates intended user experience clearly in demo.
- Risks:
  - UI-only gating is not secure and can be bypassed via direct API access.
- Future Change:
  - Add strict Supabase RLS policies so full profile fields are readable only when a valid sparked match exists between both users.

## D-002: Spark Timer Starts On First Open (Per User)
- Date: 2026-04-28
- Status: Accepted
- Decision:
  - The 24-hour timer is asynchronous per user and starts only when that user first opens the Spark prompt.
  - If a user does not submit before their own timer expires, their Spark side expires.
- Rationale:
  - Fairness: users should not lose a Spark they never saw.
  - Supports asynchronous engagement patterns.

## D-003: Fallback Grace Nudge For Non-Responder
- Date: 2026-04-28
- Status: Accepted
- Decision:
  - If one user answers and the other has not opened/responded, the non-responder receives a nudge:
    "Your match answered. If you're still interested, you have 24 hours to answer."
  - The nudge starts a final 24-hour grace window for the non-responder.
- Rationale:
  - Recovers potentially good matches that would otherwise die due to missed timing.
  - Maintains urgency without immediate hard loss.

## D-004: Match Pair Uniqueness
- Date: 2026-04-28
- Status: Accepted
- Decision:
  - Matches are unique per user pair regardless of direction (A-B and B-A are the same pair).
  - Store pairs in canonical order and enforce uniqueness at DB level.
- Rationale:
  - Prevents duplicate match rows, duplicate chats, and inconsistent Spark state.

## D-005: Date Request Model Direction
- Date: 2026-04-28
- Status: Accepted
- Decision:
  - Model date-request responses per participant (explicitly or via separate response records), rather than one ambiguous shared status.
- Rationale:
  - Avoids race conditions and unclear "both accepted" logic.
  - Makes transitions to friction task unlock deterministic.

## D-006: Local Mock Backend for Match State (File-backed)
- Date: 2026-04-28
- Status: Accepted (MVP)
- Decision:
  - Use a minimal file-backed JSON “DB” for persisted match state during the take-home demo instead of Supabase.
  - Implement local API endpoints on the Vite dev server:
    - `GET /api/me/matches` returns categorized matches.
    - `POST /api/me/matches/:id/reply-spark` updates a match from `waiting_for_my_spark` to `sparked`.
    - `POST /api/me/reset` resets the local DB for fast demos.
  - Update `MatchesView` to fetch from the API and re-render UI based on real state transitions.
- Rationale:
  - Keeps scope small while still demonstrating clean engineering (data boundary + API layer + persistence).
  - Enables a credible “spark pending -> sparked” lifecycle without auth/real DB setup.
- Risks:
  - File-backed storage is not concurrency-safe (acceptable for a demo).
  - No authorization/RLS (intentionally deferred for assignment scope).
