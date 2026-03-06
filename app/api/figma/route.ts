import { NextRequest, NextResponse } from 'next/server';
import { searchFigmaFiles } from '@/lib/figma';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json({ files: [] });

  if (!process.env.FIGMA_API_TOKEN) {
    return NextResponse.json(
      { files: [], error: 'FIGMA_API_TOKEN is not configured in .env.local' },
      { status: 200 }
    );
  }

  if (!process.env.FIGMA_TEAM_ID && !process.env.FIGMA_PROJECT_ID) {
    return NextResponse.json(
      { files: [], error: 'Set FIGMA_TEAM_ID or FIGMA_PROJECT_ID in .env.local to enable Figma search' },
      { status: 200 }
    );
  }

  try {
    const files = await searchFigmaFiles(q);
    return NextResponse.json({ files });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ files: [], error: message }, { status: 200 });
  }
}
