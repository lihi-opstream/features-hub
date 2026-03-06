import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const GUIDE_PATH = path.join(process.cwd(), 'data', 'userguide.md');

export async function GET() {
  try {
    const content = await fs.readFile(GUIDE_PATH, 'utf-8');
    return NextResponse.json({ content, exists: true });
  } catch {
    return NextResponse.json({ content: null, exists: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const text = await file.text();
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    await fs.writeFile(GUIDE_PATH, text, 'utf-8');

    return NextResponse.json({ success: true, size: text.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { content } = await req.json();
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    await fs.writeFile(GUIDE_PATH, content, 'utf-8');
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
