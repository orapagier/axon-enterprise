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
