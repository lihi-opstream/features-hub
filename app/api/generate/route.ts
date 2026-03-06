import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';
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
      currentGuide = await fs.readFile(
        path.join(process.cwd(), 'data', 'userguide.md'),
        'utf-8'
      );
    } catch {
      currentGuide = '(No user guide uploaded yet)';
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
