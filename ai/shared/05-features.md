# What this service does

On-device Wisdom cube: voice pipeline, local LLM/intent, smart-home control, and
the LAN API the mobile companion talks to. Product plan and tickets live in the
Wisdom docs workspace (`Plan.md`, `Tickets.md`, `GettingStarted.md`).

This clone is a **TypeScript Fastify** API-gateway scaffold from the company
skeleton (route → service → repository). The long-term on-device runtime remains
**Java** (strict OOP); migrate when the Java stack is ready. Keep the OpenAPI /
HTTP contract aligned with the app either way.

## Feature map

- api gateway — health, metrics, docs — `src/app.ts`, `src/routes/`
- cube contract — status, config, devices, profiles, routines, logs, chat, internet — `src/routes/`
- backup/restore — in-memory versioned backup, checksums, dry-run + restore modes — `src/services/backup-service.ts`, `src/routes/backup.ts`
- _(pending)_ voice / device / privacy — on-device pipelines — TBD
