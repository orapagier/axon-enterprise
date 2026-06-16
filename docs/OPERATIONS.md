# Operations — FreshHub backend

Phase H hardening: database backups and scheduled-job observability.

## PostgreSQL backups

`apps/backend/scripts/pg-backup.sh` dumps the app database to a timestamped,
compressed, custom-format file (`pg_dump -Fc`) and prunes old backups.

| Env var | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | from `apps/backend/.env` | connection string to dump |
| `PG_BACKUP_DIR` | `~/freshhub-backups` | where dumps are written |
| `PG_BACKUP_KEEP_DAYS` | `14` | retention window; older dumps pruned |

Run manually:

```bash
cd apps/backend && ./scripts/pg-backup.sh
```

### Schedule (cron)

Nightly at 01:30 (server time), before the app's own nightly ticks (02:00–03:00):

```cron
30 1 * * * cd /home/ramlej/MFH/freshhub/apps/backend && ./scripts/pg-backup.sh >> ~/freshhub-backups/backup.log 2>&1
```

Verify it's installed: `crontab -l`. The job appends to `backup.log`, so check
the tail of that file after the first scheduled run.

### Restore

`pg-restore.sh` restores a dump. It is **destructive** (`--clean` drops existing
objects first), so rehearse against a scratch database before touching prod:

```bash
cd apps/backend && ./scripts/pg-restore.sh ~/freshhub-backups/freshhub-YYYYMMDD-HHMMSS.dump
```

A restore is only proven when it has actually been replayed into an empty DB at
least once — schedule a quarterly restore drill into a throwaway database.

### Off-box copies

Dumps on the same host do not survive disk loss. Sync `PG_BACKUP_DIR` to object
storage (e.g. `rclone copy ~/freshhub-backups remote:freshhub-backups`) after
the dump, or add that line to the cron entry.

## Scheduled-job observability

Every cron job is wrapped by `runJob()` (`apps/backend/src/lib/job-observability.ts`),
which emits a consistent log line per run:

```
[job:<name>] started
[job:<name>] finished in <ms>ms        # success
[job:<name>] FAILED after <ms>ms: ...  # error (then re-thrown)
```

Wrapped jobs (all in `apps/backend/src/jobs/`):

| Job | Schedule | Purpose |
|---|---|---|
| `clean-order-tick` | `0 2 * * *` | buyer strike recovery |
| `membership-expiry-tick` | `30 2 * * *` | membership grace → downgrade + reminders |
| `dispute-sla-tick` | `15 2 * * *` | dispute reminders + SLA escalation |
| `rider-unremitted-tick` | `0 3 * * *` | suspend riders over their unremitted COD limit/age |
| `producer-confirm-tick` | `*/10 * * * *` | producer order confirmation: re-nudge → escalate → auto-cancel (see below) |
| `lock-dispatch-batches` | (see job) | lock batches at cutoff |
| `dispatch-batches-in-transit` | (see job) | mark batches in-transit + notify |
| `expire-pickup-windows` | (see job) | close pickup windows / flag no-shows |

To watch jobs in the running app, filter the backend logs for `[job:`. A
`FAILED` line is the signal to page on; the wrapper re-throws so the scheduler
still records the failure.

Run any job on demand:

```bash
cd apps/backend && npx medusa exec ./src/jobs/<job>.ts
```

## COD shortfall & remittance aging

- Each `cod_collected` / `rider_remitted` ledger row records the **expected**
  amount alongside the actual, so collected/remitted-below-expected is captured
  at write time (see `confirmDelivery` and the `cod-remitted` route).
- `GET /admin/cod-remittance-aging` (and the **COD Reconcile** admin page)
  report rider-held unremitted cash bucketed by age (0–1d / 1–3d / 3–7d / 7d+)
  plus any shortfalls. Pure logic lives in `apps/backend/src/lib/cod-aging.ts`.
- The same `unremittedByRider` rule drives `rider-unremitted-tick`, so the
  suspension job and the report can't disagree on what's outstanding.

## Producer order confirmation

Direct-to-consumer orders (where a producer is the seller) must be confirmed by
that producer before they sit idle. Unlike the nightly ticks, `producer-confirm-tick`
runs **every 10 minutes** (`*/10 * * * *`) — it's the only sub-hourly job.

Lifecycle (one step per tick; pure state machine in
`apps/backend/src/lib/producer-confirm.ts`, persisted on `order.metadata.producer_confirm[sellerId]`):

1. **Nudge** — on order placement and re-nudged every ~10 min while `awaiting`.
   Confirm window: **Standard / Free = 1 h, Special = 10 min**.
2. **Escalate** — at the deadline the order moves to `escalated`, opening a
   **1-hour admin window**, and the hub/admin is notified (Telegram **and**
   `ADMIN_NOTIFY_EMAIL`). The producer can still grab it during this window, but
   a late confirm records a strike.
3. **Auto-cancel** — if the admin takes no action before the window lapses, the
   order is cancelled as a safety net so it never sits idle.

Admin acts on escalations from the **Producer Orders** admin page
(`/admin/producer-orders`): **Take** (the hub sources + delivers the items) or
**Cancel**. Producers see their run list at storefront `/account/producer/orders`
(Confirm / Decline / Dispute strike).

**Cancellation is per item, regardless of how many sellers are on the order.**
Only the unconfirmed producer's line items are removed (via a Medusa order edit
that sets them to quantity 0, releasing their inventory and recomputing the COD
total); everything from other sellers/hub stays. A full order cancel happens only
when removing those items would leave the order empty.

Producer non-fulfilment **strikes** live on the producer's customer metadata
(`producer_confirm_strikes` + `producer_confirm_strike_log`, disputable) — the
buyer strike system (`buyer_account_status` prepay-locks) does not model producers.

### Config

| Env var | Meaning |
|---|---|
| `ADMIN_NOTIFY_EMAIL` | recipient of the escalation email; optional — if unset, escalations still fire via Telegram |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ADMIN_CHAT_ID` | admin escalation + queue pings (see `lib/notify-admin.ts`) |

All notifications are best-effort; a Telegram/email hiccup never blocks the
lifecycle. Env changes require a backend restart (env is read at boot).

### Verification

```bash
cd apps/backend && npx medusa exec ./src/migration-scripts/verify-producer-confirm.ts
```

Drives the real tick + store helpers against throwaway data (16 checks: escalate,
auto-cancel, per-item removal keeping other sellers' lines, strike + dispute) and
cleans up after itself. Note: `notifyAdmin "fetch failed"` warnings are expected
when running inside a sandbox with no outbound network to Telegram — not a code
fault.
