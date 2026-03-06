import type { ShortcutEpic, ShortcutStory, FigmaFile, ActionType } from '@/types';

const SITE_URL = 'www.opstream.ai';

function buildContext(
  featureName: string,
  epics: ShortcutEpic[],
  stories: ShortcutStory[],
  figmaFiles: FigmaFile[]
): string {
  const epicLines = epics.length
    ? epics.map((e) => `- Epic: "${e.name}" — ${e.description || 'No description'}`).join('\n')
    : '- No epics found';

  const storyLines = stories.length
    ? stories
        .slice(0, 10)
        .map((s) => `- [${s.story_type}] "${s.name}" — ${s.description || 'No description'}`)
        .join('\n')
    : '- No stories found';

  const figmaLines = figmaFiles.length
    ? figmaFiles.map((f) => `- "${f.name}"${f.project_name ? ` (${f.project_name})` : ''}`).join('\n')
    : '- No Figma files found';

  return `Feature Name: ${featureName}

Product Context (from Shortcut):
${epicLines}

Stories:
${storyLines}

Design Files (from Figma):
${figmaLines}

Site: ${SITE_URL}`;
}

export function buildGuideUpdatePrompt(
  featureName: string,
  epics: ShortcutEpic[],
  stories: ShortcutStory[],
  figmaFiles: FigmaFile[],
  currentGuide: string
): string {
  const ctx = buildContext(featureName, epics, stories, figmaFiles);
  return `You are a technical writer helping to update the user guide for OpStream (${SITE_URL}).

${ctx}

Current User Guide:
---
${currentGuide}
---

Analyze the user guide and the feature information above. Suggest specific, actionable additions or modifications to document this new feature.

Respond with a JSON array (no markdown fences, just raw JSON). Each item must have:
- "section": the section title to add to or modify (or "New Section: <name>" for new content)
- "type": "add" | "modify"
- "original": the exact existing text being replaced (only for type "modify")
- "suggested": the complete new or replacement text
- "reason": brief explanation of why this change is needed

Return 3–7 focused changes. Ensure "suggested" is complete, ready-to-use markdown text.`;
}

export function buildContentPrompt(
  type: Exclude<ActionType, 'update-userguide'>,
  featureName: string,
  epics: ShortcutEpic[],
  stories: ShortcutStory[],
  figmaFiles: FigmaFile[]
): string {
  const ctx = buildContext(featureName, epics, stories, figmaFiles);
  const baseInstruction = `You are a professional content writer for OpStream (${SITE_URL}), a SaaS platform.\n\n${ctx}\n\n`;

  switch (type) {
    case 'marketing-email':
      return (
        baseInstruction +
        `Write a polished marketing email announcing the "${featureName}" feature to existing users.

Structure:
Subject: [compelling subject line on its own line starting with "Subject: "]

Then the email body in markdown:
- Opening hook (1-2 sentences)
- What the feature does and why it matters (2-3 sentences)
- Key benefits (3-4 bullet points)
- Call to action linking to ${SITE_URL}
- Professional sign-off from the OpStream Team

Keep the tone warm, professional, and benefit-focused.`
      );

    case 'onepager':
      return (
        baseInstruction +
        `Create a professional one-pager for the "${featureName}" feature suitable for sales and marketing.

Include:
# [Feature Name]
## The Problem
## The Solution
## Key Benefits (3-4 bullets)
## How It Works (brief, 3 steps max)
## Who It's For
## Get Started
[CTA with ${SITE_URL}]

Keep it concise, punchy, and persuasive. Use markdown formatting.`
      );

    case 'blog-post':
      return (
        baseInstruction +
        `Write an engaging blog post announcing the "${featureName}" feature for the OpStream blog.

Structure:
# [Compelling title]
[Publication context]

## Introduction (hook + problem statement, 2-3 paragraphs)
## [Feature section with what it does]
## Key Use Cases (2-3 real scenarios)
## How to Get Started
## Conclusion (CTA to ${SITE_URL})

Write in a conversational yet professional tone. Target audience: product managers and team leads. ~600-800 words.`
      );

    case 'linkedin-post':
      return (
        baseInstruction +
        `Write a LinkedIn post announcing the "${featureName}" feature for OpStream.

Requirements:
- Max 2,200 characters
- Start with a hook (no "I'm excited to announce" clichés)
- 2-3 short paragraphs
- 3-5 relevant hashtags at the end
- Include ${SITE_URL}
- Professional but conversational tone
- Focus on the problem it solves and the value delivered`
      );

    case 'landing-page':
      return (
        baseInstruction +
        `Create the content and HTML structure for a landing page for the "${featureName}" feature.

Provide a complete HTML page with inline Tailwind CSS classes (use CDN). Include:
- Hero section: headline, subheadline, primary CTA button
- Problem section: the pain point this solves
- Feature highlights: 3 key benefits with icons (use emoji)
- How it works: 3-step process
- Social proof placeholder section
- Final CTA section
- Footer with ${SITE_URL}

Use a clean, modern design with indigo/purple color scheme. Make it production-ready.`
      );

    case 'website-change':
      return (
        baseInstruction +
        `Suggest specific changes to make to the ${SITE_URL} website to feature the "${featureName}" capability.

For each suggested change provide:
1. **Page/Section**: Which page and section to update
2. **Current state**: What's likely there now (or "New section" if adding)
3. **Proposed change**: Exact copy and content to add/replace
4. **Priority**: High / Medium / Low
5. **Rationale**: Why this change drives conversions or improves clarity

Cover: homepage hero, features page, navigation, and any new landing page needs. Be specific and actionable.`
      );

    default:
      return baseInstruction + `Write comprehensive content about the "${featureName}" feature.`;
  }
}
