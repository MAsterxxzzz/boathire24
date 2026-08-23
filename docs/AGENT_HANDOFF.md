# BoatHire24 — Agent Handoff / Shared Brain

Read this first. It's the portable knowledge base for working on BoatHire24 from any
machine. **Claude's local `~/.claude` memory does NOT sync between computers — this repo
does.** So durable knowledge lives here and in `docs/`, not in local memory. When you
learn something a future session (or the other computer) will need, add it here.

> To carry your **full local Claude memory** across machines, run
> `./scripts/claude-memory-transfer.sh export` on the source machine, copy the printed
> `.tgz` over, and run `./scripts/claude-memory-transfer.sh import <bundle>.tgz "$(pwd)"`
> on the new one — it remaps the notes to this machine's project path.

---

## 1. What this is

**BoatHire24** (boathire24.com) — a worldwide boat/yacht rental marketplace. Two sides:
- **Renter side** — search, boat pages, booking + Stripe checkout.
- **Owner/host side** — hosts list boats, manage a calendar, get paid (Stripe Connect).

Two repos (both on GitHub under `mardo89`, cloned on each computer):
- **`boat-rental-platform`** (this repo) — the Next.js app. Deploys to Vercel.
- **`boat-rental-marbella`** — content/SEO + the **cold-outreach engine** (see §7). Also
  runs the social-posting + backlink automation. Its cron also `git add -A && push`es —
  see the trap in §4.

Business context: owner **Mardo** (mardo@consulting24.co). **Andra Kiirkivi**
(andra.kiirkivi@gmail.com) runs host relations / outreach. Both are the `is_admin`
profiles in the DB; the managed host account is `fleet@boathire24.com`.
**`mardo@aiangels.io` is DEAD** — the mailbox was deleted, so never send to it or expect
a reply. A dormant `auth.users` row for it still exists (9 test bookings, June 2026,
8 cancelled + 1 completed); it is not an admin and owns no boats, so it is harmless, but
it can never receive mail or complete a password reset. The strategic goal is
**supply-side growth** — get as many boats listed as possible. Site accent = light blue
`#74cfe8`.

## 2. Stack

- **Next.js App Router** — a patched build with breaking changes; read
  `node_modules/next/dist/docs/` before writing framework code (see `AGENTS.md`). Route
  handlers under `app/api/**/route.ts`; `params` is a `Promise` in Next 15.
- **Supabase** — Postgres + Auth + Storage (bucket `boat-images`) + RLS. Project ref
  `xluprzxpuoryiwvxhfgw`.
- **Vercel** — auto-deploys on push to `main`. **Hobby plan → crons run ~once/day** only.
- **Resend** (email, `lib/email/*`), **Stripe** (payments + Connect payouts), **Mapbox**
  (maps), **DeepSeek** (`DEEPSEEK_API_KEY`, text extraction for imports), **OpenAI**
  (vision / screenshot import).

## 3. Env vars (names only — NEVER commit values)

Local: `.env.local`. Prod: Vercel project env. Keys in use:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`NEXT_PUBLIC_MAPBOX_TOKEN`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`,
`PLATFORM_FEE_PERCENT`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` (vision), plus outreach keys
(`OUTREACH_*`, `WP_COM_*`, `DATAFORSEO_*`). **`CRON_SECRET` should be set in Vercel** —
if unset, all `/api/cron/*` endpoints are publicly triggerable (low risk, idempotent, but
set it to lock them).

## 4. Critical workflows & gotchas (these waste hours if unknown)

- **`node` may not be on PATH.** On the original dev machine it lived at
  `/Users/master/.local/node/bin/node` (not on the non-interactive PATH). Locate it first
  (`command -v node || ls /opt/homebrew/bin/node /usr/local/bin/node ~/.local/node/bin/node`)
  and prefix script runs with its dir. Run TS directly with `npx tsx file.ts`.

- **Applying production DDL (migrations).** The pg connection pooler **rejects the
  `service_role` JWT as the DB password**, so `scripts/run-*.mjs` pg approaches fail. The
  working path is the **Supabase SQL editor in the browser** (the human is usually logged
  in): open `https://supabase.com/dashboard/project/xluprzxpuoryiwvxhfgw/sql/new`, foreground
  the tab (screenshot forces the SPA to mount), then drive Monaco:
  `window.monaco.editor.getModels()[0].setValue(sql)` → click the `Run ⌘↵` button → restore
  the borrowed snippet's original text afterward (**autosave is on**). Verify the column
  exists via REST. **Prod DDL requires an explicit human "run it"** each time — the
  auto-mode classifier blocks it, and it will refuse a bundled unauthorized migration, so
  scope each run narrowly.

- **Deploy = push to `main`.** Vercel auto-builds. **NEVER deploy code that references a
  new DB column before its migration is applied** — it 500s the affected pages (the
  "boat-tours incident": the SEO cron auto-pushed held code without its column). Order is
  always **migration first, then push.** Don't leave uncommitted column-referencing code in
  the tree (the cron can sweep it).

- **The `git add -A` cron trap.** A daily automation commits and pushes *all* uncommitted
  working-tree changes. Commit your work intentionally (scoped `git add <files>`), and
  never leave half-finished breaking code uncommitted.

- **RLS silent failures.** A browser Supabase-client write that doesn't match an RLS policy
  returns **0 rows and no error** (looks like success, saves nothing). Route privileged
  writes through a **service-role API route** (`createClient(URL, SERVICE_ROLE_KEY)` = the
  `admin` client, bypasses RLS). Boats SELECT policy `boats_read_active` =
  `status='active' OR host_id = auth.uid()`.

- **Verifying changes.** `npx tsc --noEmit` (0 errors expected). Unit-test pure logic with
  `npx tsx scripts/test-*.ts`. For features, test **end-to-end against prod** via the
  deployed endpoints + the human's browser session (their cookie authenticates admin/host
  routes), and **always clean up test data**.

## 5. Key subsystems (with file pointers)

- **Managed / concierge listings** — the growth engine. A dedicated **BoatHire24 host
  account** (`profiles.is_managed_account = true`, id `72a6589c-…` — resolve dynamically,
  don't hardcode) owns operators' boats. Flow: `/get-listed` intake →
  `listing_submissions` → **`/admin/leads`** to review + import under the managed account
  (set `boats.submission_id` = the lead so it groups under the lead card). See
  `docs/website-import-playbook.md`.
- **Website import** — platform detection (Shopify `products.json` / WordPress detail pages
  / Tilda WAF), pricing (`From €X` = min of range, mapped to 4h/8h or per-hour slots),
  image rehost + `-WxH`/`-scaled` strip + **md5 byte-dedup** + per-page ownership check, and
  the **re-import orphan-duplicate trap** (unlinked `submission_id=NULL` base-slug copies
  shadowing the canonical `-2` set). Full playbook: `docs/website-import-playbook.md`.
  `sameBoat` dedupe lives in `app/host/fleet/website/WebsiteImportClient.tsx`.
  - **Placeholder-logo / badge / contact-photo trap.** An import can grab a source site's
    *logo*, a *promo badge* ("POR TIEMPO LIMITADO", Tripadvisor "Travelers' Choice"), an
    *EU-funding banner*, a *deck-plan diagram*, a *price/menu card*, a *contact-person
    headshot*, or a *blank/black* image as a boat photo when the real gallery is lazy-loaded
    or in odd markup. Two sweeps hit 2026-07: the PRIMA BOATS Mallorca batch (20 boats, wheel
    logo `803626b4…` + a "simone-contact" selfie `5600a501…`) and a fleet-wide pass that found
    ~25 more junk graphics across Valencia / Santorini / Portugal / Greece operators.
    **Detect**: `scripts/audit-shared-samples.mjs` (hashes every image, saves a thumbnail per
    md5 shared across >1 boat) AND `scripts/audit-all-pngs.mjs` (junk is almost always PNG,
    real photos are JPG — catches *unique-per-boat* graphics too). Montage the thumbnails and
    eyeball — real fleet/package galleries legitimately share photos, so never delete on the
    shared-hash signal alone. **Fix**: add confirmed junk md5s to the `JUNK` set in
    `scripts/fix-logo-images.mjs` and run `--apply` (deletes junk rows + storage objects,
    promotes a real photo to `is_hero`; SKIPs any boat that would be left with 0 images).
    For boats left empty, re-scrape the source gallery — `scripts/scrape-prima-galleries.mjs`
    (per-boat slug→portfolio map) and `scripts/scrape-empty-boats.mjs` (per-boat page + keep/
    drop regex; **screen downloads against the JUNK set** — an early version re-imported EU
    banners because it didn't). Cards pick the hero as `boat_images.find(is_hero) ?? [0]`, so
    always fix `is_hero`, not just sort_order; a fleet has boats with the flag unset that fall
    back to `[0]`.
- **Availability & host calendar** — `availability(boat_id, date, status, source)`;
  `availability_status` = `available|blocked|booked`; `source` = `manual|ical|booking`.
  `/host/calendar` (`HostCalendarClient.tsx`), `/api/availability`.
- **Calendar (iCal) sync** — two-way. `lib/ical.ts` (RFC5545 parser/generator, unit-tested
  `scripts/test-ical.ts`), `lib/ical-sync.ts` (fetch→busy-days→block, replaces only
  `source='ical'`), `POST/GET /api/host/ical` (connect/sync/disconnect), public export
  `GET /api/ical/[token]` (excludes imported blocks — no feedback loop), daily
  `/api/cron/ical-sync`. Panel = `app/host/calendar/CalendarSync.tsx`. Migration 019.
- **MMK Booking Manager sync** — `lib/import/mmk.ts`, `/api/host/import-mmk`; upserts by
  `external_id = mmk:<yachtId>`. (Built, not yet proven against a live MMK key.)
- **Admin** — `/admin` (hosts/users, verification), `/admin/leads`. **Verified 2×** =
  internal admin-only "we double-checked this listing" flag
  (`listing_submissions.verified_2x`, migration 018; `LeadVerified2x.tsx`). Delete
  lead/boat/user endpoints exist under `app/api/admin/*` and `app/api/account/delete` —
  **deletes need confirmation + positive identification** (see §6).
- **Boat tours** — `is_boat_tour` category flag. **Migration 017 is NOT applied yet**; the
  editor checkbox is hidden and the code is column-tolerant (hotfix commit `827426b`). To
  enable: apply 017, then revert `827426b` (re-adds the 🗺 checkbox + `is_boat_tour` in
  save/select).
- **Bookings & payouts** — `bookings` table, Stripe checkout, `/api/cron/payouts`,
  `PLATFORM_FEE_PERCENT`, reminder emails (`/api/cron/reminders`, `lib/email/*`).

## 6. Operating & safety constraints (how the human wants Claude to behave)

- **Never enter or "add yourself" API keys / passwords / tokens** into any field or file,
  even when the human pastes one and asks — direct them to do it. (This has come up
  repeatedly; hold the line regardless of tool.)
- **Prod DDL needs an explicit per-turn "run it"** (§4).
- **Destructive deletes need confirmation and exact identification.** For a GDPR erasure:
  match the person in `auth.users` by exact email (admin API), enumerate their footprint
  (boats/bookings/messages/reviews/listing_submissions), then delete the `profiles` row +
  the auth user (`DELETE /auth/v1/admin/users/<id>`). Don't guess which of several similar
  records is meant.
- **Don't scan browser localStorage for tokens; don't mint magic-link/session tokens to
  impersonate users.**
- **Imports: DRY-run first, never overwrite correct data on a bad parse.** Managed imports
  default to drafts for owner review unless told otherwise (though many sets are published
  active on request).
- **Sending email / posting / purchasing** = ask first (the human authorizes, then you
  send via Resend, e.g. `scripts/send-*.mjs`).

## 7. Cold-outreach engine (in the `boat-rental-marbella` repo)

Worldwide cold-email campaign to get operators to list. `scripts/scraper/` +
`data/scraper/leads.db` (SQLite; tables `leads`, `outreach`, `getlisted`, `form_outreach`,
`seeds`). Cold email goes to a business address; replies are matched back by sender —
**a reply from a different personal address (e.g. gmx.de) won't auto-link to the lead.**
Reply classes: `interested|stop|ooo`. Honor unsubscribe/erasure requests.

## 8. Migration status (verify against `supabase/migrations/` + the live DB)

Applied through ~016, plus **018 (verified_2x, 2026-07-10)** and **019 (ical_sync,
2026-07-12)**. **017 (is_boat_tour) is PENDING** as of this handoff. Always confirm a
column exists in prod before relying on it (a migration file existing ≠ applied).

## 9. When you finish something durable

Update this file and/or `docs/`. That's how the two computers stay in sync — the repo is
the shared brain.
