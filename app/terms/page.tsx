export const metadata = {
  title: 'Terms of Service - Mando El Pelado Team Portal',
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ink px-6 py-12 text-zinc-200">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl tracking-wide text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-zinc-500">Mando El Pelado Team Portal — last updated {new Date().toISOString().slice(0, 10)}</p>

        <div className="mt-8 space-y-5 text-base leading-relaxed text-zinc-300">
          <p>
            This portal is a private, internal tool built for the team managing recording artist Mando El
            Pelado&apos;s career. It is not a public product or service, and access is limited to authorized
            team members only.
          </p>
          <p>
            By logging in, each team member agrees to use the portal only for its intended purpose:
            coordinating social media content, campaigns, bookings, contacts, and related career management
            tasks for Mando El Pelado.
          </p>
          <p>
            Where the portal connects to a team member&apos;s own third-party accounts (such as social media
            platforms), that connection is authorized directly by the account owner through that platform&apos;s
            own login and consent screen. Credentials and tokens for those connections are stored encrypted and
            are never shared between team members.
          </p>
          <p>
            The team may update these terms as the portal evolves. Questions about these terms should be
            directed to the portal administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
