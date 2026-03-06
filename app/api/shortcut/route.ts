import { NextRequest, NextResponse } from 'next/server';
import { searchEpics, searchStories } from '@/lib/shortcut';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json({ epics: [], stories: [] });

  if (!process.env.SHORTCUT_API_TOKEN) {
    return NextResponse.json(
      { epics: [], stories: [], error: 'SHORTCUT_API_TOKEN is not configured in .env.local' },
      { status: 200 }
    );
  }

  try {
    const [epics, stories] = await Promise.all([searchEpics(q), searchStories(q)]);
    return NextResponse.json({ epics, stories });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ epics: [], stories: [], error: message }, { status: 200 });
  }
}
