# KOL Wire Mesh MFG Ltd — website & dashboard

Production rebuild of kolmesh.com: a public catalogue with a request‑a‑quote flow, and a secured
admin dashboard where the team manages products, photos, hero slides, enquiries and settings.

```
kolmesh/
├─ apps/web   Next.js 15 · React 19 · Tailwind v4 · Montserrat  → Vercel
└─ apps/api   Fastify 5 · Drizzle ORM · PostgreSQL (Supabase)   → Render
```

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js App Router, server components, ISR (5 min) + on‑demand purge | Fast, SEO‑ready, product pages pre‑rendered |
| Styling | Tailwind v4 design tokens, self‑hosted variable Montserrat | No third‑party font requests, consistent type |
| API | Fastify + Zod validation on every input | Small, fast, strict |
| Database | Supabase Postgres via Drizzle (typed SQL, migrations) | Parameterised queries only |
| Images | Supabase Storage. Upload → `sharp` re‑encode → WebP (1600 px + 560 px thumb) | Compressed, safe, one place |
| Email | Resend (admin notification + customer acknowledgement) | Free tier, reliable |
| Anti‑spam | Cloudflare Turnstile (server‑verified) + honeypot + timing trap + rate limits | Layered, invisible to humans |

## Security model

- **Session**: Argon2id passwords · 15‑minute access JWT · 14‑day rotating refresh token (hashed in DB, reuse ⇒ whole family revoked) · cookies are `httpOnly` `Secure` `SameSite=Lax` and **first‑party** because Vercel proxies `/api/*` to Render.
- **2FA**: TOTP (Google/Microsoft Authenticator, Authy, 1Password). Secrets encrypted at rest (AES‑256‑GCM). Dashboard nags until it's on.
- **Brute force**: 8 login attempts / 15 min per IP, account lock after 5 failures, constant‑time verification.
- **CSRF**: custom `X-Requested-With` header required on every mutation + Origin allow‑list.
- **Headers**: strict CSP, HSTS preload, `X-Frame-Options: DENY`, no‑referrer on API, no `X-Powered-By`.
- **Uploads**: MIME + magic‑byte validation via `sharp`, 15 MB cap, re‑encoded (strips metadata and polyglot payloads), stored under random names.
- **Roles**: owner / admin / editor. Invite‑only — there is no public sign‑up endpoint.
- **Audit log**: every sign‑in attempt, token‑reuse detection, and content change with IP.
- **Edge guard**: Next middleware verifies the session JWT before any `/admin` page is served.
- **Privacy**: first‑party analytics only (daily‑rotating hashed visitor id, no cookies, no third parties).

## Local development

```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # fill DATABASE_URL + secrets
cp apps/web/.env.example apps/web/.env.local
pnpm api db:migrate && pnpm api db:seed      # schema + legacy catalogue
pnpm api admin:create -- --email you@kolmesh.com --name "Your Name" --password "ChooseSomethingLong1"
pnpm dev                                     # web :3000, api :8080
```

See **DEPLOY.md** for the step‑by‑step production plan and the image upload workflow.
