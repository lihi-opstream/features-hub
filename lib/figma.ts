import type { FigmaFile } from '@/types';

const BASE_URL = 'https://api.figma.com/v1';

function headers() {
  return { 'X-Figma-Token': process.env.FIGMA_API_TOKEN ?? '' };
}

interface FigmaProject {
  id: string;
  name: string;
}

interface FigmaFileEntry {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
}

async function getProjectFiles(projectId: string, projectName: string): Promise<FigmaFile[]> {
  const res = await fetch(`${BASE_URL}/projects/${projectId}/files`, { headers: headers() });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.files ?? []).map((f: FigmaFileEntry) => ({
    key: f.key,
    name: f.name,
    thumbnail_url: f.thumbnail_url,
    last_modified: f.last_modified,
    project_name: projectName,
  }));
}

export async function searchFigmaFiles(query: string): Promise<FigmaFile[]> {
  const projectId = process.env.FIGMA_PROJECT_ID;
  const teamId = process.env.FIGMA_TEAM_ID;

  let allFiles: FigmaFile[] = [];

  if (projectId) {
    allFiles = await getProjectFiles(projectId, 'Project');
  } else if (teamId) {
    const res = await fetch(`${BASE_URL}/teams/${teamId}/projects`, { headers: headers() });
    if (!res.ok) throw new Error(`Figma team projects fetch failed: ${res.status}`);
    const data = await res.json();
    const projects: FigmaProject[] = data.projects ?? [];

    // Fetch files for all projects in parallel (cap at 20 projects)
    const projectBatch = projects.slice(0, 20);
    const filesArrays = await Promise.all(
      projectBatch.map((p) => getProjectFiles(p.id, p.name))
    );
    allFiles = filesArrays.flat();
  }

  if (allFiles.length === 0) return [];

  const q = query.toLowerCase();
  const matching = allFiles.filter((f) => f.name.toLowerCase().includes(q));

  // If no exact name match, do a loose word-by-word match
  if (matching.length === 0) {
    const words = q.split(/\s+/).filter(Boolean);
    return allFiles
      .filter((f) => words.some((w) => f.name.toLowerCase().includes(w)))
      .slice(0, 8);
  }

  return matching.slice(0, 8);
}
