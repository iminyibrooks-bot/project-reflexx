# Real-Time Engine Design — Reflex

Architecture, recommendation, and trade-off log for the real-time layer that pushes order status changes (assign / pick up / deliver) to the Retailer dashboard (Cess) and Dispatcher dashboard (Joyce) without a page refresh. Reconciled against what's actually live in this repo as of 2026-08-31, not the original planning doc.

## What's actually live (as of 2026-08-31)

- **Base URL:** `project-reflexx.vercel.app` (Express + Supabase, deployed on Vercel)
- **Order fields:** `order_id`, `customer_name`, `phone_number`, `delivery_address`, `order_details`, `status`, `assigned_rider_id`, `created_at`
- **Status flow:** `REQUESTED → ASSIGNED → PICKED_UP → DELIVERED`
- **Confirmed endpoints:** `GET /api/orders`, `POST /api/orders`
- **Building, not live yet:** `POST /api/orders/:order_id/scan`
- **Auth:** deliberately removed for this submission — every route above is open. This is a known, flagged gap, not something this design solves (see Open Items).

## Does this need a socket server?

**Won't hold up here:** plain Socket.io assumes one long-lived process holding room membership in memory. A Vercel serverless function is the opposite — a fresh, short-lived process per invocation, torn down after it responds, sharing no memory with the next one. A client that opens a socket to one invocation has no guarantee that another dispatcher's assignment event runs on that same instance; it can just as easily execute on an instance the retailer's browser was never connected to.

**What actually works: Supabase Realtime Broadcast.** Supabase is already our database, and its Realtime layer is a persistent, always-on service we don't have to run ourselves. Same room-per-order idea as the original Socket.io plan — a channel named `delivery:{order_id}` — just hosted somewhere that's actually alive between requests.

### Why one breaks and the other doesn't

**Socket.io direct on Vercel (breaks):** Rider's phone sends a status update → Vercel function (ephemeral, one invocation) receives it and would need to emit to the Dispatcher's dashboard — but the dashboard's connection, if it exists at all, is tied to a *different* invocation with no shared memory. The emit never reaches it. The function is torn down after it responds regardless.

**Supabase Realtime (what we're shipping):** Status change → Vercel API route validates and writes → `UPDATE orders.status` in Postgres, and in the same request, an explicit `broadcast` call to `delivery:{order_id}` → Supabase Realtime (a persistent service, not a Vercel function) pushes the event to every subscribed dashboard — Retailer (Cess) and Dispatcher (Joyce) both update live, no refresh.

The key difference isn't that the Vercel API route is somehow less ephemeral than a Socket.io handler — it's exactly as short-lived. It just never needs to *survive* past its own response, because it hands the actual waiting off to a service that's alive continuously.

## The working path, step by step

1. **Action.** Joyce assigns a rider, or a rider scans pickup or delivery.
2. **Write.** The Vercel API route validates the transition and updates `orders.status` in Postgres.
3. **Broadcast.** On a successful write, the same route calls `supabase.channel('delivery:{order_id}').send(...)` directly — explicit, not left to replication lag off the write.
4. **Push.** Any dashboard subscribed to that channel — Cess's, Joyce's — receives the event straight from Supabase Realtime and updates its local state. No refresh.
5. **Rider side.** A rider's device subscribes to its own assigned-order channel the same way, so a new assignment appears without polling.

## Fallback, if the channel wiring doesn't land in time

Poll `GET /api/orders` on an interval — every 5–10 seconds — instead of subscribing. It costs latency equal to the poll interval and adds read load for a benefit Realtime gives for free. Ship it as a degraded mode if the broadcast wiring runs out of runway before the deadline, not as a parallel design to maintain.

## Trade-off log

Three trade-offs, written in State → Context → Evidence so they hold up under cross-exam.

### 1. In-memory socket state vs. a shared store for multi-instance scaling

- **State:** We hold no in-memory socket state of our own. Supabase Realtime *is* the shared store, so the usual "Socket.io needs a Redis adapter to scale horizontally" problem never comes up.
- **Context:** Vercel functions share nothing between invocations; two concurrent requests can land on two processes with no common memory. Offloading the persistent connection to Supabase sidesteps that instead of engineering around it ourselves.
- **Evidence:** Vercel's Hobby-tier functions cap execution around 10 seconds — nowhere near long enough to hold a socket open. Realtime runs on infrastructure we already pay for as our database.
- **With more time:** if we ever need sub-second, non-DB-backed signals — live rider GPS, a "typing" indicator — reach for Realtime Presence, not a bespoke socket server.

### 2. PWA vs. native app for the rider-facing scan interface

- **State:** The rider scan flow ships as a PWA (mobile web), not a native iOS/Android app.
- **Context:** Riders need camera access, which mobile browsers already support well enough via `getUserMedia`/BarcodeDetector or a JS scanner library. A PWA ships behind a URL — critical for grassroots rollout, since riders are often on low-end Android phones where every install competes for storage and data.
- **Evidence:** No app-store review cycle to clear (native review commonly runs one to several days), no install step beyond "Add to Home Screen," one codebase instead of two.
- **With more time:** add a real service worker for offline queueing, so a scan made in a dead zone syncs once connectivity returns instead of failing silently.

### 3. Soft locking vs. strict DB-level locks for concurrent assignment

- **State:** Two dispatchers racing to assign the same order are resolved with optimistic UI plus a backend guard clause, not an explicit pessimistic lock.
- **Context:** At grassroots scale — a handful of dispatchers, not hundreds — the odds of two people racing the same order within milliseconds are low, and a conditional update already prevents the double-assignment outcome. Wrapping every assignment in an explicit transaction adds held-connection risk on short-lived serverless invocations for a race that's already rare and already handled.
- **Evidence:** The guard is one atomic statement: `UPDATE orders SET assigned_rider_id=$1, status='ASSIGNED' WHERE order_id=$2 AND status='REQUESTED'`. Postgres row-level atomicity guarantees only one of two racing requests gets `rowCount: 1`; the loser gets `0` and the API returns a 409 immediately.
- **With more time:** push that 409 back over the same broadcast channel as a clear toast for the dispatcher who lost the race, and add a short-lived optimistic "claim" other dispatchers see live, so fewer of them race the same order in the first place.

## Open items — flagged on purpose, not solved here

- Auth is off on every route. Fine for this submission; before any pilot handling a real customer's phone number and address, this closes first.
- The scan endpoint isn't live yet. This design assumes it broadcasts the same way `POST /api/orders` will, but that path hasn't been exercised end to end.
