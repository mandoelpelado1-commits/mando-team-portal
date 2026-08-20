# Connecting a social platform — setup runbook

Each team member connects their **own** developer app per platform (Dashboard → My Socials).
Credentials and tokens are private per account — nobody else on the team can see them, only
whether that platform shows "Connected."

## The general workflow

1. Register a developer app on the platform's own developer portal (links are on the Socials
   page, under each platform card).
2. Copy that app's **Client ID** and **Client secret** into the Socials page → "Add app
   credentials" → Save.
3. Register the exact **Redirect URI** shown on the Socials page (under "Register this redirect
   URI") in the platform's own app settings. It must match byte-for-byte — no trailing slash
   differences, no http vs https mismatch.
4. Click **Connect** on the Socials page. You'll be sent to the platform's own login/consent
   screen, then redirected back.
5. If step 4 fails, the error is almost always something missing on the *platform's* app
   config — not a portal bug — except where noted below.

The redirect URI for each platform is built from `APP_BASE_URL` in `lib/oauth.ts`
(`redirectUri()`), always `{APP_BASE_URL}/api/social/callback/{platform}`.

---

## TikTok — the detailed one

TikTok is by far the fussiest of the five. A new TikTok app has **nothing configured** — no
products, no scopes, no redirect URI — even after you have a Client Key and Secret. If
"Connect TikTok" fails with **"Something went wrong... client_key"**, work through this list in
order. This is exactly what blocked the first real connection attempt (Aug 2026) — every one of
these was actually missing.

1. **Add products.** In the TikTok Developer Portal → your app → **Products** → "+ Add
   products" → add **Login Kit** (required for any login at all) and **Content Posting API**
   (required for `video.upload`, i.e. posting drafts). Content Posting API's "Add" button stays
   greyed out until Login Kit is added first.
   - Adding Login Kit sometimes auto-bundles **Share Kit** and **Webhooks** too. Share Kit is
     harmless to leave. **Remove Webhooks** — it adds a required Callback URL field we don't
     have a value for, which then blocks saving.

2. **Set the redirect URI.** Under Login Kit → Redirect URI → check the **Web** platform
   checkbox → this reveals a required "Web/Desktop URL" (use the portal's own URL,
   `https://mando-team-portal.vercel.app`) → then add the exact callback URL,
   `https://mando-team-portal.vercel.app/api/social/callback/tiktok`, under the Web tab.

3. **Scopes are automatic.** Once Login Kit + Content Posting API are added, `user.info.basic`
   and `video.upload` appear under Scopes on their own — no separate toggle needed.
   `video.publish` is **not a real TikTok scope** — it was in our code by mistake (see below)
   and doesn't exist anywhere in TikTok's scope picker.

4. **Production apps require full App Review before ANY outside user can log in** — App icon
   (1024×1024, JPEG/PNG, ≤5MB), Category, Description, Terms of Service URL, Privacy Policy
   URL, a demo video, and a written explanation, then "Submit for review" and wait for TikTok's
   approval. That's a real, multi-day process.

5. **Use Sandbox to test before review.** Sandbox tab → "Create Sandbox" → this is a
   **completely separate environment with its own Client Key and Client Secret**, distinct from
   Production's. Configure products/redirect URI the same way as steps 1–2, but inside the
   Sandbox tab. Then Sandbox settings → Target Users → "Add account" → log in as the TikTok
   account that needs to test the connection. Only accounts added here can authorize against
   the Sandbox app before it's reviewed.
   - **Critical:** once you create a Sandbox, the portal's stored Client Key/Secret for TikTok
     must be switched to the **Sandbox's** values, not Production's — they're different
     credentials. Editing the Sandbox doesn't touch Production at all, and vice versa.
   - Sandbox also still needs App icon / Category / Description / Terms / Privacy URLs filled in
     (lighter requirement than Production's — no demo video, no "Submit for review" needed) before
     "Apply changes" will save.

6. **Read the actual error, not just the summary page.** TikTok's authorize redirect carries the
   real reason as query params even when the on-screen message is the generic "Something went
   wrong" — check the URL for `error=` and `error_type=`. `error_type=client_key` covers *any*
   app-config problem (missing product, missing scope, wrong environment), not literally just a
   wrong key.

### Code-level bugs already fixed (don't reintroduce)

- `lib/oauth.ts`, TikTok's `buildAuthorizeUrl`: scope list must be
  `user.info.basic,video.upload` — **not** `video.publish`, which isn't a real scope and made
  every authorize request fail with `unauthorized_client`.
- `lib/oauth.ts`, TikTok's `exchangeCodeForToken`: the token endpoint
  (`POST https://open.tiktokapis.com/v2/oauth/token/`) requires a `Cache-Control: no-cache`
  header alongside `Content-Type: application/x-www-form-urlencoded`, or TikTok can return a 200
  with an `{error: ...}` body instead of a real token. The code checks `data.access_token` is
  actually present (not just `res.ok`) before trusting the response — don't remove that check,
  it's what turns a silent crash (`encrypt(undefined)`) into a readable error message.

---

## Instagram / Facebook (Meta)

Both use the same Meta developer app (`developers.facebook.com/apps`). Standard OAuth — no
sandbox/production split like TikTok. Redirect URI must be added under the app's Facebook Login
product settings.

## YouTube (Google)

Google Cloud Console (`console.cloud.google.com/apis/credentials`) → OAuth 2.0 Client ID → Web
application → add the redirect URI under "Authorized redirect URIs." Standard OAuth, no
sandbox concept — but a new OAuth consent screen in "Testing" status only allows logins from
accounts explicitly added as test users, same idea as TikTok's Target Users.

## X

`developer.x.com/en/portal/dashboard` → app → User authentication settings → OAuth 2.0 → add
the callback URL there. Standard OAuth.

---

Related: see `.env.example` for the platform-agnostic env vars (Google Places, Microsoft/Outlook,
Google Calendar, VAPID push keys) that are shared across the whole team rather than per-user.
