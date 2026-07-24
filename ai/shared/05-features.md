# What this service does

On-device Wisdom cube: voice pipeline, local LLM/intent, smart-home control, and
the LAN API the mobile companion talks to. Product plan and tickets live in the
Wisdom docs workspace (`Plan.md`, `Tickets.md`, `GettingStarted.md`).

This clone is a **TypeScript Fastify** API-gateway scaffold from the company
skeleton (route → service → repository). The long-term on-device runtime remains
**Java** (strict OOP); migrate when the Java stack is ready. Keep the OpenAPI /
HTTP contract aligned with the app either way.

## Feature map

- api gateway — health, metrics, docs, items sample CRUD — `src/app.ts`, `src/routes/`
- _(pending)_ cube contract — status, devices, profiles, routines, logs, backup — TBD
- _(pending)_ voice / device / privacy — on-device services — TBD
