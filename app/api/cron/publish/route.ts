import { NextRequest, NextResponse } from 'next/server';
import { getPostsDueForPublish, updatePostStatus, getSocialAccountsForUser } from '@/lib/db';

// Vercel Cron (or any scheduler) hits this on an interval, e.g. every 5 minutes:
//   { "crons": [{ "path": "/api/cron/publish", "schedule": "*/5 * * * *" }] } in vercel.json
// Protect it with CRON_SECRET so it can't be triggered by anyone else.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const due = await getPostsDueForPublish(new Date().toISOString());
  const results = [];

  for (const post of due) {
    const [account] = (await getSocialAccountsForUser(post.user_id)).filter((a) => a.platform === post.platform);
    if (!account) {
      await updatePostStatus(post.id, 'failed', `No connected ${post.platform} account for this user.`);
      results.push({ id: post.id, status: 'failed', reason: 'not_connected' });
      continue;
    }

    // TODO: each platform's actual publish call goes here, using account.access_token.
    // Instagram/Facebook: POST to Graph API /{ig-user-id}/media then /media_publish - needs Meta app review
    // (instagram_content_publish permission) before this will work for real accounts.
    // TikTok: POST /v2/post/publish/video/init/ - needs TikTok Content Posting API approval.
    // YouTube: videos.insert via googleapis - works once the OAuth app is out of testing mode.
    // X: POST /2/tweets - works once the developer app has write access approved.
    await updatePostStatus(post.id, 'failed', `Publishing to ${post.platform} is not implemented yet (pending platform API approval).`);
    results.push({ id: post.id, status: 'failed', reason: 'publish_not_implemented' });
  }

  return NextResponse.json({ checked: due.length, results });
}
