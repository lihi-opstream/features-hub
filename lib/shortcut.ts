import type { ShortcutEpic, ShortcutStory } from '@/types';

const BASE_URL = 'https://api.app.shortcut.com/api/v3';

function headers() {
  return {
    'Content-Type': 'application/json',
    'Shortcut-Token': process.env.SHORTCUT_API_TOKEN ?? '',
  };
}

export async function searchEpics(query: string): Promise<ShortcutEpic[]> {
  const params = new URLSearchParams({ query, page_size: '8' });
  const res = await fetch(`${BASE_URL}/search/epics?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`Shortcut epics search failed: ${res.status}`);
  const data = await res.json();
  // API returns { data: [...], next: ... }
  const items: ShortcutEpic[] = (data.data ?? []).map((e: Record<string, unknown>) => ({
    id: e.id as number,
    name: e.name as string,
    description: (e.description as string) ?? '',
    state: (e.state as string) ?? '',
    app_url: (e.app_url as string) ?? '',
  }));
  return items;
}

export async function searchStories(query: string): Promise<ShortcutStory[]> {
  const params = new URLSearchParams({ query, page_size: '12' });
  const res = await fetch(`${BASE_URL}/search/stories?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`Shortcut stories search failed: ${res.status}`);
  const data = await res.json();
  const items: ShortcutStory[] = (data.data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as number,
    name: s.name as string,
    description: (s.description as string) ?? '',
    story_type: (s.story_type as string) ?? 'feature',
    epic_id: s.epic_id as number | undefined,
    app_url: (s.app_url as string) ?? '',
  }));
  return items;
}
