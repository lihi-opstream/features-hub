import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { content, featureName, type } = await req.json();

    const outputDir = path.join(process.cwd(), 'output');
    await fs.mkdir(outputDir, { recursive: true });

    const slug = featureName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const ext = type === 'landing-page' ? 'html' : 'md';
    const filename = `${slug}-${type}-${timestamp}.${ext}`;
    const filePath = path.join(outputDir, filename);

    await fs.writeFile(filePath, content, 'utf-8');

    return NextResponse.json({ success: true, filename, path: `output/${filename}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
