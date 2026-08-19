import { isWixConfigured } from './wix';

export { isWixConfigured as isWixEmailConfigured };

export interface EmailDraft {
  subject: string;
  preheader: string;
  greeting: string;
  paragraphs: string[];
  signOff: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildMjml(draft: EmailDraft): string {
  const textBlocks = [draft.greeting, ...draft.paragraphs, draft.signOff]
    .filter(Boolean)
    .map(
      (p) =>
        `<mj-text font-size="16px" line-height="1.6" color="#18181b" padding-bottom="16px">${escapeXml(p)}</mj-text>`
    )
    .join('');

  return `<mjml><mj-body background-color="#f4f4f5"><mj-section background-color="#0b0b0f" padding="24px"><mj-column><mj-text align="center" color="#ffffff" font-size="20px" font-weight="700" letter-spacing="1px">MANDO EL PELADO</mj-text></mj-column></mj-section><mj-section background-color="#ffffff" padding="32px"><mj-column>${textBlocks}</mj-column></mj-section></mj-body></mjml>`;
}

export interface CreatedCampaign {
  campaignId: string;
  title: string;
  status: string;
}

export async function createEmailCampaignDraft(draft: EmailDraft): Promise<CreatedCampaign> {
  const composerDataJson = JSON.stringify({ mjml: buildMjml(draft) });

  const res = await fetch('https://www.wixapis.com/email-marketing/v1/campaigns', {
    method: 'POST',
    headers: {
      Authorization: process.env.WIX_API_KEY || '',
      'wix-site-id': process.env.WIX_SITE_ID || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      composer: { composerDataJson },
      campaignEditorType: { value: 'MJML' },
      emailSubject: draft.subject,
      emailPreheader: draft.preheader,
    }),
  });

  if (!res.ok) throw new Error(`Wix email campaign creation failed: ${await res.text()}`);
  const data = await res.json();
  return {
    campaignId: data.campaign.campaignId,
    title: data.campaign.title,
    status: data.campaign.visibilityStatus,
  };
}

export function wixEmailMarketingDashboardUrl(): string {
  return `https://manage.wix.com/dashboard/${process.env.WIX_SITE_ID || ''}/email-marketing`;
}
