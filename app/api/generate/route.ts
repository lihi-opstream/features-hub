import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildContentPrompt, buildGuideUpdatePrompt } from '@/lib/prompts';
import type { GenerateRequest, GuideChange } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const body: GenerateRequest = await req.json();
  const { type, featureName, epics, stories, figmaFiles } = body;

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

    const prompt = buildGuideUpdatePrompt(featureName, epics, stories, figmaFiles, currentGuide);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';

    let changes: GuideChange[] = [];
    try {
      // Strip potential markdown fences
      const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      changes = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Failed to parse guide suggestions', raw: text }, { status: 500 });
    }

    return NextResponse.json({ changes });
  }

  // All other types: streaming text response
  const prompt = buildContentPrompt(type, featureName, epics, stories, figmaFiles);

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

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
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
