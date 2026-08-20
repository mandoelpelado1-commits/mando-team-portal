import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enforceAiLimit } from '@/lib/rateLimit';
import { organizeContactsFromText, organizeContactsFromPdf, isDuplicateContact } from '@/lib/contactImport';
import { getAllContacts } from '@/lib/db';

const MAX_BYTES = 8 * 1024 * 1024; // text/PDF contact lists, not media — keep well under Vercel's body cap
const TEXT_TYPES = new Set(['text/csv', 'text/plain', 'text/vcard', 'application/json']);
const TEXT_EXTENSIONS = /\.(csv|txt|vcf|json)$/i;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number(session.user.id);

  const limited = await enforceAiLimit(userId, 'contacts-import', 10);
  if (limited) return limited;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI contact import.' },
      { status: 501 }
    );
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is 8MB.` }, { status: 413 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'The file is empty.' }, { status: 400 });
  }

  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isText = TEXT_TYPES.has(file.type) || TEXT_EXTENSIONS.test(file.name) || file.type.startsWith('text/');

  if (!isPdf && !isText) {
    return NextResponse.json(
      { error: `Unsupported file type. Use CSV, TXT, VCF, JSON, or PDF. (Excel: save/export as CSV first.)` },
      { status: 415 }
    );
  }

  try {
    const contacts = isPdf
      ? await organizeContactsFromPdf(Buffer.from(await file.arrayBuffer()).toString('base64'))
      : await organizeContactsFromText(await file.text());

    if (contacts.length === 0) {
      return NextResponse.json({ error: "Couldn't find any contacts in that file." }, { status: 422 });
    }

    const existing = await getAllContacts();
    const withDuplicateFlag = contacts.map((c) => ({ ...c, isDuplicate: isDuplicateContact(existing, c) }));

    return NextResponse.json({ contacts: withDuplicateFlag });
  } catch (err: any) {
    return NextResponse.json({ error: `Import failed: ${err.message}` }, { status: 502 });
  }
}
