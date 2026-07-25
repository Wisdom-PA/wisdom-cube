# Backup / restore payload download (Phase 11)

Date: 2026-07-25

## Summary

Cube now generates a real in-memory backup and exposes download + restore.
Remote cloud backup remains deferred.

## Endpoints

### `POST /backup/trigger` (auth)

Builds a full backup and returns status:

```json
{
  "available": true,
  "lastBackupAt": "2026-07-25T17:00:00.000Z",
  "lastBackupId": "uuid"
}
```

### `GET /backup/:backupId` (auth) — **new**

Returns the full backup document for the app to store:

```json
{
  "manifest": {
    "backupId": "uuid",
    "schemaVersion": "1.0",
    "createdAt": "…",
    "cubeId": "…",
    "backupType": "full",
    "checksum": "sha256-hex"
  },
  "profiles": [],
  "routines": [],
  "settings": { "cubeId": "…", "defaultPrivacyMode": "paranoid", "…": "…" },
  "memories": [],
  "devices": [{ "deviceId": "…", "displayName": "…", "room": null, "tags": [], "capabilities": ["on_off"] }],
  "logs_intents": [],
  "logs_actions": [],
  "logs_internet_calls": []
}
```

Errors: `401`, `404` if id unknown.

### `POST /backup/restore` (auth)

Body:

```json
{ "backupId": "uuid", "mode": "factory_reset" | "device_routine_recovery", "dryRun": false }
```

- `dryRun: true` → success + message describing what would change (no writes)
- `factory_reset` → replace profiles, routines, settings, devices from backup
- `device_routine_recovery` → upsert/merge devices + routines only

Errors: `400` checksum mismatch / unsupported schema major; `404` unknown id.

## Validation notes

- Device catalog omits runtime fields (`reachable`, `state`); restore sets `reachable: false`, `state: {}`.
- Checksum is SHA-256 of canonical JSON of the body sections (everything except `manifest`).
- Schema major version must be `1` (e.g. `1.0`).
