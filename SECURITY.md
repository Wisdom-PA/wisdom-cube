# Security Policy

## Reporting a vulnerability

Report suspected vulnerabilities privately to the platform team — do **not** open
a public issue. Include reproduction steps and impact. You should receive an
acknowledgement within one working day.

## Baseline guarantees in repos generated from this skeleton

- Secrets never live in code: env is schema-validated (Zod / Pydantic Settings)
  and provided via the deploy environment; `.env` files are git-ignored.
- Backends ship an explicit authN/authZ boundary, an error envelope that never
  leaks internals or stack traces, and (Phase 5.5) rate-limit / timeout /
  body-size defaults plus secret scanning (gitleaks) in hooks and CI.
- Dependencies are updated via Dependabot (daily, cooldown-windowed) and
  vulnerability-scanned in CI.
