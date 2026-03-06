import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildContentPrompt, buildGuideUpdatePrompt } from '@/lib/prompts';
import type { ActionType, GenerateRequest, GuideChange } from '@/types';

// Allow up to 5 minutes for AI generation (respected by Vercel/Amplify Web Compute)
export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// HTML content types generate large documents — use buffered (non-streaming) calls
// to avoid Lambda timeout / buffering issues on Amplify SSR
const HTML_TYPES: ActionType[] = ['marketing-email', 'onepager', 'blog-post', 'landing-page'];

export async function POST(req: NextRequest) {
  const body: GenerateRequest = await req.json();
  const { type, featureName, epics, figmaFiles, customPrompt, guideExcerpt } = body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
  }

  // User guide update: non-streaming, returns structured JSON
  if (type === 'update-userguide') {
    let currentGuide = '';
    try {
      const gdocRes = await fetch(
        `https://docs.google.com/document/d/1YM_4b6Yt3U1DfeZo5YQey-TW4Avn67fsVNEiJsAOuMc/export?format=txt`
      );
      if (gdocRes.ok) currentGuide = await gdocRes.text();
    } catch {
      currentGuide = '(User guide unavailable)';
    }

    const prompt = buildGuideUpdatePrompt(featureName, epics, figmaFiles, currentGuide, customPrompt, guideExcerpt);

    let message;
    try {
      message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Claude API error: ${msg}` }, { status: 500 });
    }

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';

    let changes: GuideChange[] = [];
    try {
      const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      changes = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Failed to parse guide suggestions', raw: text }, { status: 500 });
    }

    return NextResponse.json({ changes });
  }

  const prompt = buildContentPrompt(type, featureName, epics, figmaFiles, customPrompt, guideExcerpt);

  // HTML types: single buffered response (avoids Amplify streaming issues)
  if (HTML_TYPES.includes(type)) {
    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        messages: [{ role: 'user', content: prompt }],
      });
      const content = message.content[0].type === 'text' ? message.content[0].text : '';
      if (!content.trim()) {
        return NextResponse.json({ error: 'Claude returned empty content — please try again' }, { status: 500 });
      }
      return NextResponse.json({ content });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Claude API error: ${msg}` }, { status: 500 });
    }
  }

  // Text types (linkedin-post, website-change): streaming for live preview
  let stream;
  try {
    stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Claude API error: ${msg}` }, { status: 500 });
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(new TextEncoder().encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
