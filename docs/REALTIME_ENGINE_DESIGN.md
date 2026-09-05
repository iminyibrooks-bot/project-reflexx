# Real-Time Engine Design — Reflex

*Supersedes the 2026-08-31 version of this document, which assumed a Vercel serverless deployment. The backend has since moved to Render — a persistent, long-running server — which changes the real-time recommendation below.*

Architecture, recommendation, and trade-off log for the real-time layer that pushes order status changes (assign / pick up / deliver) to the Retailer dashboard and Dispatcher dashboard without a page refresh.

## What's actually live (as of 2026-09-05)

- **Backend:** Express + Supabase, deployed on Render — a persistent server process, not serverless
- **Base URL:** `project-reflexx-backend.onrender.com`
- **Order fields:** `order_id`, `customer_name`, `phone_number`, `delivery_address`, `order_details`, `status`, `assigned_rider_id`, `created_at`
- **Status flow:** `REQUESTED → ASSIGNED → PICKED_UP → DELIVERED`
- **Confirmed endpoints:** `GET /api/orders`, `POST /api/orders`, `POST /api/orders/:order_id/scan`
- **Auth:** deliberately off on every route for this submission — flagged as a known gap, not something this doc solves (see Open Items)

## Recommendation: Socket.io, room-per-order — not Supabase Realtime

The previous version of this doc ruled out Socket.io because the backend ran on Vercel serverless functions, where each invocation is a fresh, memory-isolated process — no stable place for a socket connection to live. That constraint is gone. Render runs the Express server as one continuously-alive process, which is exactly what Socket.io needs: a long-lived process that can hold room membership (`delivery:{order_id}`) in memory and emit to it directly.

Given that, plain Socket.io is the better fit here, for three concrete reasons:

1. **Less new infrastructure.** The server already exists and already handles the write. Attaching Socket.io to it is a few lines; wiring Supabase Realtime Broadcast would mean standing up and learning a second pub/sub system alongside Supabase-as-DB, for no benefit this deployment actually needs.
2. **No cross-instance problem to solve.** This runs as a single Render service with no autoscaling configured. In-memory room state can't split across instances that don't exist.
3. **One fewer hop.** The same request handler that validates and writes the status change can emit to the room immediately, instead of making a second call out to an external broadcast service.

**The honest cost:** this ties the real-time layer's availability to the Express server's own uptime. A Render redeploy — or an idle spin-down on lower tiers — drops every open socket. Socket.io's client auto-reconnects, but a status change that lands in that exact gap needs a catch-up read, which isn't built yet (see Open Items). Supabase Realtime wouldn't have this specific failure mode, since it runs as a separately-hosted service independent of this backend's lifecycle. If the team needs to scale past one Render instance later, this trade-off is revisited head-on in Trade-off 1 below — not quietly assumed away.

## The working path, step by step

1. **Action.** Dispatcher assigns a rider, or a rider hits `POST /api/orders/:order_id/scan` for pickup or delivery.
2. **Write.** The Express route validates the transition and updates `orders.status` (and `assigned_rider_id`, where relevant) in Supabase Postgres.
3. **Broadcast.** In the same request, after a successful write, the handler calls `io.to('delivery:' + order_id).emit('status_changed', { order_id, status })` directly — same process, no external hop.
4. **Push.** The Retailer dashboard (joined to its own order's room) and the Dispatcher dashboard (joined to the rooms for every order it's tracking) receive the event and update local state. No refresh.
5. **Rider side.** A rider's device joins its own assigned-order room the same way, so a new assignment shows up live.

## Fallback, if the socket wiring doesn't land in time

Poll `GET /api/orders` on an interval — every 5–10 seconds — instead of connecting a socket. It costs latency equal to the poll interval and adds read load for a benefit the socket layer gives for free. Ship it as a degraded mode if the Socket.io wiring runs out of runway, not as a parallel design to maintain.

## Trade-off log

Three trade-offs, in State → Context → Evidence → With more time, written to hold up under cross-exam.

### 1. Concurrency/scaling approach for the real-time layer

- **State:** Socket.io attached directly to the single Render Express process, with in-memory room membership and no external pub/sub broker.
- **Context:** This deployment runs one Render instance with no autoscaling configured, so in-memory rooms stay consistent by construction — there's no second instance for room state to disagree with. That's what makes skipping Supabase Realtime reasonable right now, not a default choice.
- **Evidence:** Confirmed single Render service on the current plan; `io.sockets.adapter.rooms` reflects true membership because it's the same in-memory `Map` for every connected client — verified against a two-tab local test where both tabs joined `delivery:ORD-146` and both received the same emit.
- **With more time:** Before scaling to multiple Render instances, add `@socket.io/redis-adapter` (or move the broadcast step to Supabase Realtime instead) — don't scale horizontally first and discover rooms have silently split.

### 2. PWA vs. native app for the rider-facing scan interface

- **State:** The rider scan flow ships as a PWA (mobile web), not a native iOS/Android app.
- **Context:** Riders need camera access, which mobile browsers already support well enough via `getUserMedia`/BarcodeDetector or a JS scanner library. A PWA ships behind a URL — critical for grassroots rollout, since riders are often on low-end Android phones where every install competes for storage and data.
- **Evidence:** No app-store review cycle to clear (native review commonly runs one to several days), no install step beyond "Add to Home Screen," one codebase instead of two.
- **With more time:** Add a real service worker for offline queueing, so a scan made in a dead zone syncs once connectivity returns instead of failing silently.

### 3. Soft locking vs. strict DB-level locks for concurrent assignment

- **State:** Two dispatchers racing to assign the same order are resolved with optimistic UI plus a backend guard clause, not an explicit pessimistic lock.
- **Context:** At grassroots scale — a handful of dispatchers, not hundreds — the odds of two people racing the same order within milliseconds are low, and a conditional update already prevents the double-assignment outcome without the added complexity of holding a transaction open on every assignment.
- **Evidence:** The guard is one atomic statement: `UPDATE orders SET assigned_rider_id=$1, status='ASSIGNED' WHERE order_id=$2 AND status='REQUESTED'`. Postgres row-level atomicity guarantees only one of two racing requests gets `rowCount: 1`; the loser gets `0` and the API returns a 409 immediately.
- **With more time:** Push that 409 back over the same `delivery:{order_id}` room as a clear toast for the dispatcher who lost the race, and add a short-lived optimistic "claim" other dispatchers see live, so fewer of them race the same order in the first place.

## Open items — flagged on purpose, not solved here

- Auth is off on every route. Fine for this submission; before any pilot handling a real customer's phone number and address, this closes first.
- **Reconnection gap:** if the Render service restarts (a deploy, or idle spin-down on lower tiers), connected dashboards drop their sockets. Socket.io's client auto-reconnects, but a status change that happens in that exact window needs a catch-up mechanism — e.g., re-fetching `GET /api/orders` once on reconnect — which isn't implemented yet.
