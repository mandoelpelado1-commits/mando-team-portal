export const metadata = {
  title: 'Privacy Policy - Mando El Pelado Team Portal',
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ink px-6 py-12 text-zinc-200">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl tracking-wide text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Mando El Pelado Team Portal — last updated {new Date().toISOString().slice(0, 10)}</p>

        <div className="mt-8 space-y-5 text-base leading-relaxed text-zinc-300">
          <p>
            This portal is a private, internal tool used by a small team to manage recording artist Mando El
            Pelado&apos;s career. It is not offered to the public, and this policy describes how it handles data
            for its authorized team members.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-white">Social platform connections</h2>
          <p>
            Each team member may connect their own social media accounts (including TikTok) directly to the
            portal. When connecting TikTok, the portal requests only the minimum access needed to identify the
            connected account (basic profile info) and to upload video content on that person&apos;s behalf as a
            draft for them to review and post. The portal does not request access to any other TikTok account&apos;s
            data, does not read private messages, and does not post automatically without the connected user
            placing content on the schedule themselves.
          </p>
          <p>
            Access tokens for connected accounts are encrypted at rest and are tied to the individual team
            member who connected them — they are never visible to or shared with other team members, including
            other admins.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-white">Other data</h2>
          <p>
            The portal stores account information for its team members (name, role, login credentials), and
            career-management data they enter (posts, contacts, bookings, budget, and similar). None of this
            data is sold or shared with third parties outside the tools the team explicitly connects (such as
            the social platforms above).
          </p>
          <p>
            A connected account can be disconnected at any time from the portal&apos;s Socials page, which revokes
            the portal&apos;s access to that account going forward.
          </p>
          <p>Questions about this policy should be directed to the portal administrator.</p>
        </div>
      </div>
    </div>
  );
}
