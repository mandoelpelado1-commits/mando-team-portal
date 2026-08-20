# Mando El Pelado — Team Portal

Internal team portal for managing the career of recording artist **Mando El Pelado**.
Built for a three-person team split across Ecuador, the Dominican Republic and New York.

Live: https://mando-team-portal.vercel.app

---

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind
- **NextAuth** credentials auth, roles: `admin` / `manager` / `artist`
- **Neon Postgres** (via Vercel marketplace)
- **Vercel Blob** for post media
- Deployed on **Vercel**

## Features

| Section | What it does |
|---|---|
| Overview | AI-written daily brief from real portal state |
| AI Post Generator | Captions + hashtags + timing, with photo/video upload and link |
| Weekly Schedule | Place drafts on a calendar; cron publisher (pending platform approvals) |
| My Socials | Per-user OAuth to Instagram, TikTok, Facebook, YouTube, X — see [`docs/social-connections.md`](docs/social-connections.md) for the setup runbook (TikTok especially) |
| Email Blast | AI writes an email, pushed to Wix as a draft |
| Website Analytics | Wix site traffic and sales |
| Google Ads Budget | Shared account, two-person approval on budget changes |
| Ideas | Team idea board with per-member acknowledgment |
| Digital Platforms | 19 streaming/video/royalty services with claim tracking |
| Merch Store | Printify pop-up shop sales |
| Career Milestones | 17 industry milestones with AI step/budget guides |
| Mando Avispate | Personal goals for Mando, separate from team/company work |
| Text notifications | Optional per-user phone number, texts on new Ideas posts — see [`docs/sms-notifications.md`](docs/sms-notifications.md) for the Twilio setup runbook |

Interface is fully bilingual (Spanish / English), switchable per device.

---

## Setup

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in values.

Create your team roster — this file is **gitignored on purpose**, since committing
usernames to a public repo would publish valid logins for the portal:

```bash
cp scripts/team.example.json scripts/team.json
# then edit scripts/team.json with the real names/roles
```

Then:

```bash
npm run migrate   # create schema + seed reference data
npm run seed      # create team accounts (prints temp passwords once)
npm run dev
```

### Scripts

| Command | Purpose |
|---|---|
| `npm run migrate` | Apply schema, seed milestones and platforms. Idempotent. |
| `npm run seed` | Create team accounts with temporary passwords. Skips existing users. |
| `npm run reset-passwords [username]` | Rotate passwords and re-arm the forced change. |

---

## Security notes

- **Never commit `.env.local`.** It holds live database credentials and tokens. `.gitignore` covers it.
- Every user is **forced to change their temporary password** before reaching the dashboard. This is enforced server-side against the database, not the session token.
- Each team member's **social credentials and tokens are private to their own account** and stored encrypted (AES-256-GCM). Google Ads is the one deliberately shared resource.
- Budget changes require **a second team member's approval**; nobody can approve their own proposal.

## Known limitations

- **Social publishing is not implemented.** Every platform requires app review first. See the TODOs in `app/api/cron/publish/route.ts`.
- **Crons run daily only** — a Vercel Hobby plan restriction. Sub-daily scheduling needs Pro.
- **Media uploads cap at ~45MB** (Vercel request body limit). Use the link field for full music videos.
- Several services have **no public API** — Spotify for Artists, Apple Music for Artists, and all PROs. Those are tracked by status and link rather than connected.
