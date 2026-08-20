# Text (SMS) notifications setup

Every team member can save a phone number under **Settings → Your phone number**.
Once Twilio is connected, whoever hasn't posted gets a text when someone adds a
new Idea to the Ideas board.

Until Twilio is connected, phone numbers still save fine — texts are just
silently skipped (`lib/sms.ts` checks `isSmsConfigured()` before sending
anything, the same pattern email notifications already use).

## 1. Create a Twilio account

1. Go to [twilio.com/try-twilio](https://www.twilio.com/try-twilio) and sign up.
2. Verify your email and phone number.
3. On the [Console Dashboard](https://console.twilio.com), copy:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click "show" to reveal it)

## 2. Get a Twilio phone number

1. In the Console, go to **Phone Numbers → Manage → Buy a number**.
2. Pick a number with **SMS** capability (a U.S. number is fine even for
   texting international team members, but check Twilio's pricing per
   destination country first — Ecuador and Dominican Republic both work,
   costs vary).
3. Trial accounts get a small free credit and can only text phone numbers
   you've manually verified in the Console under **Phone Numbers → Verified
   Caller IDs** — upgrade to a paid account (add a card) to text any number
   without that restriction.

## 3. Add the credentials to Vercel

Add these three environment variables to the project (Production):

| Variable | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | The Account SID from step 1 |
| `TWILIO_AUTH_TOKEN` | The Auth Token from step 1 |
| `TWILIO_FROM_NUMBER` | The number you bought, in `+1XXXXXXXXXX` format |

```bash
vercel env add TWILIO_ACCOUNT_SID production
vercel env add TWILIO_AUTH_TOKEN production
vercel env add TWILIO_FROM_NUMBER production
```

Then redeploy (`vercel deploy --prod`) so the new environment variables take
effect.

## What triggers a text today

Only new posts to the **Ideas** board (`app/api/ideas/route.ts`), matching
what already sends an email. To add more triggers (e.g. Mando Avispate
goals, new Contacts, Shows updates), call `smsTeam(excludeUserId, message)`
from `lib/sms.ts` at the point where that action happens — same pattern as
`notifyTeam` (email) and `pushToTeam` (browser push), which already fire
alongside it in a few places.
