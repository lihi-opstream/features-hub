import { NextResponse } from 'next/server';

const GDOC_ID = '1YM_4b6Yt3U1DfeZo5YQey-TW4Avn67fsVNEiJsAOuMc';
const GDOC_EXPORT_URL = `https://docs.google.com/document/d/${GDOC_ID}/export?format=txt`;

export async function GET() {
  try {
    const res = await fetch(GDOC_EXPORT_URL);
    if (!res.ok) throw new Error('Failed to fetch from Google Drive');
    const content = await res.text();
    return NextResponse.json({ content, exists: true });
  } catch {
    return NextResponse.json({ content: null, exists: false });
  }
}
