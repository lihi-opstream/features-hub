import { NextRequest, NextResponse } from 'next/server';
import { searchEpics } from '@/lib/shortcut';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json({ epics: [] });

  if (!process.env.SHORTCUT_API_TOKEN) {
    return NextResponse.json(
      { epics: [], error: 'SHORTCUT_API_TOKEN is not configured in .env.local' },
      { status: 200 }
    );
  }

  try {
    const epics = await searchEpics(q);
    return NextResponse.json({ epics });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ epics: [], error: message }, { status: 200 });
  }
}
