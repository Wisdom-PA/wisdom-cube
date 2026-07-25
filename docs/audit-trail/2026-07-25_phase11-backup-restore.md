# 2026-07-25 — Phase 11 cube backup/restore

## Checklist

- [x] Expand backup Zod schemas (document, checksum, device catalog)
- [x] Repo helpers for clear/replace/upsert (config, devices, profiles, routines, logs list)
- [x] Implement BackupService (trigger, getPayload, restore, migrate, checksum)
- [x] Add `GET /backup/:backupId`; wire repos in `app.ts`
- [x] Expand `test/backup.test.ts` + `BackupService` unit tests
- [x] Update README, FE handoff, GettingStarted / Tickets (Wisdom docs)
- [x] Run lint / typecheck / test / build

## Files created/updated

- `src/schemas/backup.ts`, `src/services/backup-service.ts`, `src/routes/backup.ts`
- `src/repositories/*` (restore helpers), `src/app.ts`
- `test/backup.test.ts`, `test/services.test.ts`
- `README.md`, `ai/shared/05-features.md`, `docs/notes-for-fe/2026-07-25_backup-restore-payload.md`
- Wisdom: `GettingStarted.md`, `Tickets.md`

## Summary

Replaced BackupService stubs with an in-memory implementation that snapshots
repos into a versioned backup document, serves it for download, and restores
with dry-run / factory_reset / device_routine_recovery. Remote backup deferred.

## Side effects considered

- OpenAPI regenerated from Zod schemas via existing docs plugin
- App consumer needs new GET route (handoff note written)
- In-memory only — lost on process restart (expected for v1 software)

## Issues spotted

- No upload-from-app endpoint yet; restore uses cube-stored backups only
  (`putBackup` exists for future/tests)

## Deployment Checklist

- [ ] No new env vars
- [ ] Smoke: `POST /backup/trigger` → `GET /backup/:id` → dry-run restore
