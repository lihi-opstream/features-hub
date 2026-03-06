export interface ShortcutEpic {
  id: number;
  name: string;
  description: string;
  state: string;
  app_url: string;
}

export interface ShortcutStory {
  id: number;
  name: string;
  description: string;
  story_type: string;
  epic_id?: number;
  app_url: string;
}

export interface ShortcutResult {
  epics: ShortcutEpic[];
  stories: ShortcutStory[];
  error?: string;
}

export interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
  project_name?: string;
}

export interface FigmaResult {
  files: FigmaFile[];
  error?: string;
}

export type ActionType =
  | 'update-userguide'
  | 'marketing-email'
  | 'onepager'
  | 'blog-post'
  | 'linkedin-post'
  | 'landing-page'
  | 'website-change';

export interface GuideChange {
  section: string;
  type: 'add' | 'modify' | 'remove';
  original?: string;
  suggested: string;
  reason: string;
}

export interface GenerateRequest {
  type: ActionType;
  featureName: string;
  epics: ShortcutEpic[];
  figmaFiles: FigmaFile[];
  customPrompt?: string;
}
