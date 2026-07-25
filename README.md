# wisdom-cube

Wisdom on-device cube API gateway scaffold. Generated from the company skeleton
(**ts-backend**, deploy: none). Long-term on-device runtime target is **Java**;
this Fastify service is the contract-first LAN API shell for development.

Product docs: sibling **Wisdom** workspace (`Plan.md`, `Tickets.md`,
`GettingStarted.md`).

## API surface (software)

- Status, config, devices, profiles, routines CRUD, logs, backup stubs
- **Phase 9**: routine run/history, internet session consent, permission-aware
  chat with **mock cloud LLM** (default; **no Claude/API key required**), log
  retention rotate (7 days)

## Develop

```sh
pnpm install
cp .env.example .env   # if needed
pnpm run dev           # http://localhost:3000  (/health, /docs, /metrics)
```

Quality gates: `pnpm run lint | format:check | typecheck | test | build`
(coverage ≥90%).

## AI config

Edit `ai/shared/` (not generated `AGENTS.md`), then `pnpm run ai:sync`.

## Branch protection (one-time)

```sh
gh api repos/Wisdom-PA/wisdom-cube/rulesets --method POST --input .github/rulesets/main.json
gh api repos/Wisdom-PA/wisdom-cube/rulesets --method POST --input .github/rulesets/staging.json
```
