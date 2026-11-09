# Deployment plan — kolmesh.com

Total time: about 45 minutes. Do the steps in order; each one gives you a value the next one needs.
Keep a scratch note open and paste values into it as you go.

---

## 0. Push the code to GitHub

1. Create a **private** repository, e.g. `kolmesh`.
2. From this folder: `git init && git add . && git commit -m "KOL Wire Mesh rebuild" && git remote add origin <repo-url> && git push -u origin main`

---

## 1. Supabase — database and image storage (10 min)

1. supabase.com → **New project**. Region: *West EU (Ireland)* or *Frankfurt*. Save the database password.
2. **Project Settings → Database → Connection string → "Transaction" pooler (port 6543)**.
   Copy the URI and replace `[YOUR-PASSWORD]`. → this is `DATABASE_URL`.
3. **Project Settings → API**: copy **Project URL** (`SUPABASE_URL`) and the **service_role** key (`SUPABASE_SERVICE_ROLE_KEY`). Never put the service key in the frontend.
4. **Storage → New bucket**: name `media`, tick **Public bucket**. Leave everything else default.

---

## 2. Cloudflare Turnstile — spam protection (3 min, free)

1. dash.cloudflare.com → **Turnstile → Add site**. Domain: `kolmesh.com` (also add your `*.vercel.app` preview domain). Widget mode: **Managed**.
2. Copy **Site key** (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, frontend) and **Secret key** (`TURNSTILE_SECRET_KEY`, backend).

---

## 3. Resend — email notifications (5 min, free)

1. resend.com → **Domains → Add** `kolmesh.com` and add the DNS records it shows (SPF/DKIM). Until verified you can send from `onboarding@resend.dev` for testing.
2. **API Keys → Create** → `RESEND_API_KEY`.
3. `MAIL_FROM` = `KOL Wire Mesh <noreply@kolmesh.com>` · `MAIL_TO` = `servicemanager@kolmesh.com`.

---

## 4. Generate secrets (1 min)

Run three times and keep the outputs: `openssl rand -base64 48`
→ `JWT_SECRET`, `COOKIE_SECRET`, `REVALIDATE_SECRET`.

---

## 5. Render — the API (8 min)

1. render.com → **New → Blueprint** → connect the GitHub repo. Render reads `render.yaml` and creates **kolmesh-api**.
   (Or **New → Web Service** manually: Runtime *Node*, Build `corepack enable && corepack prepare pnpm@9.12.0 --activate && pnpm install --frozen-lockfile --filter @kolmesh/api && pnpm --filter @kolmesh/api build && pnpm --filter @kolmesh/api db:migrate`, Start `pnpm --filter @kolmesh/api start`, Health check `/health`.)
2. **Environment** → add:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `TRUST_PROXY` | `true` |
   | `DATABASE_URL` | from step 1 |
   | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |
   | `SUPABASE_BUCKET` | `media` |
   | `JWT_SECRET` / `COOKIE_SECRET` / `REVALIDATE_SECRET` | from step 4 |
   | `TURNSTILE_SECRET_KEY` | from step 2 |
   | `RESEND_API_KEY` / `MAIL_FROM` / `MAIL_TO` | from step 3 |
   | `ALLOWED_ORIGINS` | `https://kolmesh.com,https://www.kolmesh.com` (add the Vercel URL after step 6) |
   | `WEB_URL` | `https://kolmesh.com` |

3. Deploy. The build runs migrations automatically. Note the service URL, e.g. `https://kolmesh-api.onrender.com`. Open `/health` — you should see `{"ok":true}`.
4. **Seed the catalogue and create the owner account** — Render → the service → **Shell** tab:
   ```bash
   pnpm --filter @kolmesh/api db:seed
   pnpm --filter @kolmesh/api admin:create -- --email you@kolmesh.com --name "Your Name" --password "A-long-password-with-Numb3rs"
   ```
   (Free‑tier Render has no shell: run the same two commands from your laptop with `DATABASE_URL` and `JWT_SECRET` set in `apps/api/.env`.)

> Free tier note: Render free services sleep after 15 minutes idle and take ~30 s to wake. The public site stays fast because Vercel caches pages; only the first form submit / dashboard load after a quiet period will feel slow. The **Starter** plan ($7/mo) removes this.

---

## 6. Vercel — the website (5 min)

1. vercel.com → **Add New → Project** → import the repo.
2. **Root Directory**: `apps/web`. Framework: Next.js (auto). Leave build settings default — Vercel detects the pnpm workspace.
3. **Environment Variables**:

   | Key | Value |
   |---|---|
   | `API_URL` | `https://kolmesh-api.onrender.com` (step 5, no trailing slash) |
   | `NEXT_PUBLIC_SITE_URL` | `https://kolmesh.com` |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | from step 2 |
   | `JWT_SECRET` | **same value** as the API |
   | `REVALIDATE_SECRET` | **same value** as the API |

4. Deploy. Then **Settings → Domains** → add `kolmesh.com` and `www.kolmesh.com`, update DNS as shown.
5. Go back to Render and add the Vercel preview URL (e.g. `https://kolmesh.vercel.app`) to `ALLOWED_ORIGINS`.

---

## 7. First sign‑in (3 min)

1. Open `https://kolmesh.com/admin/login`, sign in with the owner account.
2. **Settings → Two‑factor authentication → Set up 2FA**, scan with your authenticator app, enter the code. Do this before anything else.
3. **Settings → Contact details** — confirm phone, WhatsApp, address, hours.
4. **Team → Invite** anyone else who needs access (they get a temporary password by email and must enable 2FA).

---

## 8. Uploading the product photos (the plan you asked for)

You do **not** need freeimage.host. Photos are uploaded straight from the dashboard, compressed to WebP automatically and stored in your Supabase bucket. Nothing to copy or paste.

**Prepare (once):** open `WireMeshMfg-main/client/public/images/05` from the old project. That is the folder with all the product photos.

**For each product — about 1 minute each, 40 products ≈ 40 min:**

1. Dashboard → **Products** → click the product (e.g. *Flat Welded Mesh (Galvanized)*).
2. In **Photos**, drag the 3–6 photos for that product from the folder onto the drop zone (or click *browse* and multi‑select). The old file names tell you which belong together (`GLNEWPVC*.jpg`, `nf*.jpg`, `CN*.jpg` …). The mapping of old file names to products is in `apps/api/src/db/seed-data.json` under each product's `images`.
3. Drag thumbnails to reorder; the first one is the **cover** shown on cards.
4. Tidy the **Specifications** lines, tick **Featured** for your best sellers, **Save changes**.

**Then:**

- **Categories** → *Edit* each of the six → add one landscape cover photo (the old `GLNEWPVC-768x768.jpg`, `CN2-600x600.jpg`, `wb1-768x768.jpg`, `waawa2-600x600.jpg`, `Artboard-1.png`, `V28.jpg` were the previous choices).
- **Hero slides** → *New slide* ×3 → wide factory / product shots, a headline and a button link such as `/products?category=wire-mesh`.
- Visit the live site: the homepage updates within a minute (the API tells Vercel to purge the cache after every save).

**If you still prefer an external host** (e.g. freeimage.host): upload there, copy the *direct image link* (`https://iili.io/….jpg`), and in the dashboard click **"Paste an image link instead"**. Both methods can be mixed.

---

## Day‑to‑day

- **New enquiry** → email to `MAIL_TO` + customer gets an acknowledgement with a reference `KOL-2026-00001`. Open it in **Enquiries**, set the status (*New → In progress → Quoted → Won/Lost*), keep internal notes, reply with the Email/WhatsApp buttons.
- **Hide a product** without deleting it: toggle *Visible on website*.
- **Audit log** shows every sign‑in attempt and change — check it if anything looks odd.
- **Lost phone / 2FA**: the owner can suspend an account in **Team**; a new account can be created with `admin:create` from the server shell.

## Checks after go‑live

- `https://kolmesh.com/sitemap.xml` lists every product.
- securityheaders.com → grade A/A+.
- Submit a test quote from a phone; confirm both emails arrive.
- Try signing in with a wrong password 6 times — the account locks for 15 minutes (expected).
