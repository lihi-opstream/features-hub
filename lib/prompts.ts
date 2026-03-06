import type { ShortcutEpic, FigmaFile, ActionType } from '@/types';

const SITE_URL = 'www.opstream.ai';

// Opstream brand CSS — embedded in all HTML-generating prompts
const OPSTREAM_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; line-height: 1.6; color: #4a4a4a; background: #fff; }
a { color: #59a985; text-decoration: none; }
.container { max-width: 960px; margin: 0 auto; padding: 0 48px; }
nav { background: #fff; border-bottom: 1px solid #E8EAED; padding: 16px 0; position: sticky; top: 0; z-index: 100; }
.nav-inner { display: flex; align-items: center; gap: 16px; }
.nav-badge { background: #F2FDFB; color: #59a985; border: 1px solid #59a985; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600; }
h1 { font-size: 40px; font-weight: 800; color: #171C33; line-height: 1.15; letter-spacing: -0.5px; }
h2 { font-size: 28px; font-weight: 700; color: #171C33; line-height: 1.3; margin-bottom: 16px; }
h3 { font-size: 18px; font-weight: 600; color: #171C33; margin-bottom: 8px; }
p { margin-bottom: 16px; }
ul, ol { padding-left: 20px; margin-bottom: 16px; }
li { margin-bottom: 8px; }
.section-label { font-size: 12px; font-weight: 600; color: #59a985; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
section { padding: 64px 0; }
.alt-bg { background: #FAFBFC; }
.btn { display: inline-block; background: #59a985; color: #fff !important; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none !important; }
.btn:hover { opacity: 0.9; }
.btn-outline { display: inline-block; background: transparent; border: 2px solid #59a985; color: #59a985 !important; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none !important; }
.card { background: #F4F5F7; border-radius: 12px; padding: 28px; }
.card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.hero { padding: 80px 0; }
.hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
.hero-label { font-size: 13px; font-weight: 600; color: #59a985; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
.lead { font-size: 17px; color: #4a4a4a; margin-bottom: 32px; line-height: 1.6; }
.stats-block { background: #171C33; color: #fff; padding: 64px 0; }
.stats-block h2 { color: #fff; text-align: center; margin-bottom: 8px; }
.stats-subtitle { color: #9BA0AB; text-align: center; margin-bottom: 48px; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; text-align: center; }
.stat-number { font-size: 48px; font-weight: 800; color: #59a985; line-height: 1; margin-bottom: 8px; }
.stat-label { color: #9BA0AB; font-size: 14px; }
.steps { display: grid; gap: 32px; }
.step { display: grid; grid-template-columns: 56px 1fr; gap: 20px; align-items: start; }
.step-num { width: 56px; height: 56px; background: #F2FDFB; border: 2px solid #59a985; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: #59a985; flex-shrink: 0; }
footer { background: #171C33; color: #9BA0AB; padding: 40px 0; }
.footer-inner { display: flex; justify-content: space-between; align-items: center; }
footer a { color: #9BA0AB; }
.cta-box { background: #F2FDFB; border: 1px solid #59a985; border-radius: 16px; padding: 56px; text-align: center; }
.cta-box h2 { margin-bottom: 16px; }
.cta-box p { color: #4a4a4a; margin-bottom: 28px; }
.browser-mock { background: #F4F5F7; border-radius: 12px; overflow: hidden; border: 1px solid #E8EAED; }
.browser-bar { background: #E8EAED; padding: 10px 16px; display: flex; align-items: center; gap: 6px; }
.browser-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.browser-content { padding: 20px; font-size: 13px; }
@media (max-width: 768px) {
  .container { padding: 0 24px; }
  .hero-grid, .card-grid, .stats-grid { grid-template-columns: 1fr; }
  h1 { font-size: 28px; }
}`;

// Logo SVG — returns inline SVG with a unique gradient ID to avoid conflicts when used multiple times per page
function logoSvg(gradId: string, width = 130, height = 33): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 220 56" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="56" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1AA9DB"/><stop offset="100%" stop-color="#2FBC88"/></linearGradient></defs><rect width="56" height="56" rx="13" fill="url(#${gradId})"/><circle cx="28" cy="28" r="15" stroke="white" stroke-width="2" fill="none"/><line x1="28" y1="28" x2="28" y2="13" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="28" x2="41" y2="35.5" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="28" x2="15" y2="35.5" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="28" cy="28" r="2.8" fill="white"/><circle cx="28" cy="13" r="3.2" fill="white"/><circle cx="41" cy="35.5" r="3.2" fill="white"/><circle cx="15" cy="35.5" r="3.2" fill="white"/><text x="70" y="40" font-family="Inter,sans-serif" font-weight="700" font-size="30" letter-spacing="-0.4" fill="#171C33">opstream</text></svg>`;
}

function buildContext(
  featureName: string,
  epics: ShortcutEpic[],
  figmaFiles: FigmaFile[],
  guideExcerpt?: string
): string {
  const epicLines = epics.length
    ? epics.map((e) => `- Epic: "${e.name}" — ${e.description || 'No description'}`).join('\n')
    : '- No epics found';

  const figmaLines = figmaFiles.length
    ? figmaFiles.map((f) => `- "${f.name}"${f.project_name ? ` (${f.project_name})` : ''}`).join('\n')
    : '- No Figma files found';

  const guideSection = guideExcerpt
    ? `\nUser Guide (relevant excerpt):\n---\n${guideExcerpt}\n---`
    : '';

  return `Feature Name: ${featureName}

Product Context (from Shortcut):
${epicLines}

Design Files (from Figma):
${figmaLines}
${guideSection}
Site: ${SITE_URL}`;
}

export function buildGuideUpdatePrompt(
  featureName: string,
  epics: ShortcutEpic[],
  figmaFiles: FigmaFile[],
  currentGuide: string,
  customPrompt?: string,
  guideExcerpt?: string
): string {
  const ctx = buildContext(featureName, epics, figmaFiles, guideExcerpt);
  return `You are a technical writer helping to update the user guide for OpStream (${SITE_URL}).

${ctx}

Current User Guide:
---
${currentGuide}
---

Analyze the user guide and the feature information above. Suggest specific, actionable additions or modifications to document this new feature.
${customPrompt ? `\nAdditional instructions: ${customPrompt}\n` : ''}
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
  figmaFiles: FigmaFile[],
  customPrompt?: string,
  guideExcerpt?: string
): string {
  const ctx = buildContext(featureName, epics, figmaFiles, guideExcerpt);
  const customNote = customPrompt ? `\n\nAdditional instructions: ${customPrompt}` : '';
  const base = `You are a professional content creator for OpStream (${SITE_URL}), a product operations SaaS platform. Use the feature context below to generate specific, accurate, compelling content.\n\n${ctx}\n\n`;

  switch (type) {
    case 'marketing-email':
      return (
        base +
        `Generate a complete HTML marketing email announcing the "${featureName}" feature to existing OpStream users.
Output ONLY valid HTML — no markdown fences, no commentary before or after.

Use this exact template — fill in every [bracketed placeholder] with specific, benefit-driven content:

<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>[Subject: compelling subject line about ${featureName}]</title>
<style>
  body { margin: 0; padding: 0; background: #F4F5F7; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #E8EAED; }
  .header { background: #171C33; padding: 24px 40px; display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 32px; height: 32px; background: linear-gradient(180deg, #1AA9DB 0%, #2FBC88 100%); border-radius: 8px; display: inline-block; }
  .logo-text { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
  .accent { height: 4px; background: linear-gradient(90deg, #59a985, #1AA9DB); }
  .body { padding: 40px; color: #4a4a4a; font-size: 15px; line-height: 1.7; }
  .body h1 { color: #171C33; font-size: 24px; font-weight: 700; margin: 0 0 20px; line-height: 1.3; }
  .body p { margin: 0 0 16px; }
  .benefits { background: #FAFBFC; border-radius: 8px; padding: 24px; margin: 24px 0; border: 1px solid #E8EAED; }
  .benefits h3 { color: #171C33; font-size: 13px; font-weight: 600; margin: 0 0 14px; text-transform: uppercase; letter-spacing: 0.5px; }
  .benefit { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; font-size: 14px; }
  .check { color: #59a985; font-weight: 700; flex-shrink: 0; }
  .cta-wrap { text-align: center; padding: 28px 0 8px; }
  .cta { display: inline-block; background: #59a985; color: #fff; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; }
  .footer { background: #FAFBFC; border-top: 1px solid #E8EAED; padding: 20px 40px; text-align: center; color: #9BA0AB; font-size: 13px; }
  .footer a { color: #9BA0AB; text-decoration: none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <span class="logo-icon"></span>
    <span class="logo-text">opstream</span>
  </div>
  <div class="accent"></div>
  <div class="body">
    <p>Hi [First Name],</p>
    <h1>[Compelling benefit-focused headline about ${featureName} — not "Announcing", focus on the outcome]</h1>
    <p>[2-3 sentence opening: hook, what the feature does, why it matters to them specifically]</p>
    <p>[1-2 sentences expanding the value — specific to their daily workflow]</p>
    <div class="benefits">
      <h3>What you can do now</h3>
      <div class="benefit"><span class="check">✓</span><span>[Concrete benefit 1 — measurable outcome]</span></div>
      <div class="benefit"><span class="check">✓</span><span>[Concrete benefit 2 — time saved or quality improved]</span></div>
      <div class="benefit"><span class="check">✓</span><span>[Concrete benefit 3 — strategic advantage]</span></div>
    </div>
    <p>[1-2 sentences: how to access the feature / what to do next]</p>
    <div class="cta-wrap">
      <a href="https://${SITE_URL}" class="cta">Try ${featureName} Now →</a>
    </div>
    <p style="margin-top:24px;font-size:14px;color:#9BA0AB;">Questions? Reply to this email — we're here to help.</p>
    <p style="margin-bottom:0;">Best,<br><strong>The OpStream Team</strong></p>
  </div>
  <div class="footer">
    <p>© 2025 OpStream · <a href="https://${SITE_URL}">${SITE_URL}</a></p>
    <p style="margin-top:6px;"><a href="#">Unsubscribe</a> · <a href="#">Privacy Policy</a></p>
  </div>
</div>
</body>
</html>${customNote}`
      );

    case 'onepager':
      return (
        base +
        `Generate a complete, professional HTML one-pager for the "${featureName}" feature of OpStream, suitable for sales presentations and marketing outreach.
Output ONLY valid, complete HTML — no markdown fences, no commentary.

Use the CSS design system and HTML structure below. Fill every [bracketed placeholder] with specific, compelling content based on the feature context.

<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${featureName} — OpStream</title>
<style>
${OPSTREAM_CSS}
</style>
</head>
<body>

<!-- NAV -->
<nav>
  <div class="container">
    <div class="nav-inner">
      ${logoSvg('op-nav')}
      <span class="nav-badge">Product Overview</span>
    </div>
  </div>
</nav>

<!-- HERO -->
<div class="hero">
  <div class="container">
    <div class="hero-grid">
      <div>
        <div class="hero-label">[Feature category, e.g. "Analytics &amp; Reporting"]</div>
        <h1>[Bold, specific headline — the main benefit of ${featureName} in 8-12 words]</h1>
        <p class="lead">[2-3 sentence subheadline: what it does, who it's for, the transformation it enables]</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="https://${SITE_URL}" class="btn">See It in Action →</a>
          <a href="https://${SITE_URL}/demo" class="btn-outline">Book a Demo</a>
        </div>
      </div>
      <div>
        <div class="browser-mock">
          <div class="browser-bar">
            <span class="browser-dot" style="background:#ff6059"></span>
            <span class="browser-dot" style="background:#ffbd2e"></span>
            <span class="browser-dot" style="background:#28c840"></span>
            <span style="flex:1;background:#fff;border-radius:4px;height:18px;margin:0 8px;opacity:0.7;font-size:11px;line-height:18px;padding:0 8px;color:#9BA0AB">${SITE_URL}/dashboard</span>
          </div>
          <div class="browser-content" style="background:#fff;min-height:200px;">
            [Create a realistic mini-UI mock of ${featureName}: use divs styled as data rows, status badges (green/gray), metric cards, or a simple table — use brand colors #59a985, #F4F5F7, #171C33. Make it look like a real product screenshot.]
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- BENEFITS -->
<section class="alt-bg">
  <div class="container">
    <div class="section-label">Key Benefits</div>
    <h2 style="margin-bottom:36px;">[Why teams choose ${featureName}]</h2>
    <div class="card-grid">
      <div class="card">
        <div style="font-size:28px;margin-bottom:12px;">[emoji]</div>
        <h3>[Benefit 1 heading]</h3>
        <p style="color:#9BA0AB;font-size:14px;margin:0;">[2-3 sentences about this benefit — specific to the feature context]</p>
      </div>
      <div class="card">
        <div style="font-size:28px;margin-bottom:12px;">[emoji]</div>
        <h3>[Benefit 2 heading]</h3>
        <p style="color:#9BA0AB;font-size:14px;margin:0;">[2-3 sentences]</p>
      </div>
      <div class="card">
        <div style="font-size:28px;margin-bottom:12px;">[emoji]</div>
        <h3>[Benefit 3 heading]</h3>
        <p style="color:#9BA0AB;font-size:14px;margin:0;">[2-3 sentences]</p>
      </div>
    </div>
  </div>
</section>

<!-- HOW IT WORKS -->
<section>
  <div class="container">
    <div class="section-label">How It Works</div>
    <h2 style="margin-bottom:36px;">From setup to results in minutes</h2>
    <div class="steps" style="max-width:640px;">
      <div class="step">
        <div class="step-num">1</div>
        <div><h3>[Step 1 title]</h3><p style="color:#9BA0AB;margin:0;">[What the user does and what happens — 1-2 sentences]</p></div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div><h3>[Step 2 title]</h3><p style="color:#9BA0AB;margin:0;">[Description]</p></div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div><h3>[Step 3 title — the outcome]</h3><p style="color:#9BA0AB;margin:0;">[The result the user gets]</p></div>
      </div>
    </div>
  </div>
</section>

<!-- STATS -->
<div class="stats-block">
  <div class="container">
    <div class="section-label" style="color:#59a985;text-align:center;">Results</div>
    <h2>The impact on your team</h2>
    <p class="stats-subtitle">Based on customer outcomes</p>
    <div class="stats-grid">
      <div><div class="stat-number">[X%]</div><div class="stat-label">[metric, e.g. "faster reporting"]</div></div>
      <div><div class="stat-number">[Xh]</div><div class="stat-label">[metric, e.g. "saved per week"]</div></div>
      <div><div class="stat-number">[X×]</div><div class="stat-label">[metric, e.g. "more visibility"]</div></div>
    </div>
  </div>
</div>

<!-- CTA -->
<section>
  <div class="container">
    <div class="cta-box">
      <div class="section-label">Get Started</div>
      <h2>[Ready to {main value prop of ${featureName}}?]</h2>
      <p>[1-2 sentences — benefit-focused call to action]</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <a href="https://${SITE_URL}" class="btn">Start Free Trial →</a>
        <a href="https://${SITE_URL}/demo" class="btn-outline">Schedule Demo</a>
      </div>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="container">
    <div class="footer-inner">
      ${logoSvg('op-footer')}
      <p style="font-size:13px;">© 2025 OpStream · <a href="https://${SITE_URL}">${SITE_URL}</a></p>
    </div>
  </div>
</footer>

</body>
</html>

Replace every [bracketed placeholder] with specific, compelling content based on the feature context. The browser mock must be a realistic, styled UI representation — not placeholder text. Output only the complete HTML.${customNote}`
      );

    case 'blog-post':
      return (
        base +
        `Generate a complete HTML blog post page for the OpStream blog announcing the "${featureName}" feature.
Output ONLY valid, complete HTML — no markdown fences, no commentary.

<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>[Blog post title] — OpStream Blog</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #4a4a4a; font-size: 16px; line-height: 1.75; }
  nav { background: #fff; border-bottom: 1px solid #E8EAED; padding: 16px 0; position: sticky; top: 0; z-index: 100; }
  .nav-inner { max-width: 960px; margin: 0 auto; padding: 0 48px; display: flex; align-items: center; justify-content: space-between; }
  .nav-cta { background: #59a985; color: #fff; padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; }
  .article-wrap { max-width: 720px; margin: 64px auto; padding: 0 24px 80px; }
  .tag { display: inline-block; background: #F2FDFB; color: #59a985; border: 1px solid #59a985; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
  h1 { font-size: 38px; font-weight: 800; color: #171C33; line-height: 1.2; letter-spacing: -0.5px; margin-bottom: 20px; }
  .meta { color: #9BA0AB; font-size: 14px; margin-bottom: 40px; display: flex; gap: 16px; flex-wrap: wrap; }
  hr { border: none; border-top: 1px solid #E8EAED; margin: 40px 0; }
  h2 { font-size: 26px; font-weight: 700; color: #171C33; margin: 40px 0 16px; }
  h3 { font-size: 20px; font-weight: 600; color: #171C33; margin: 28px 0 12px; }
  p { margin-bottom: 20px; }
  ul, ol { padding-left: 24px; margin-bottom: 20px; }
  li { margin-bottom: 10px; }
  .callout { background: #F2FDFB; border-left: 4px solid #59a985; border-radius: 0 8px 8px 0; padding: 20px 24px; margin: 28px 0; }
  .callout strong { color: #171C33; display: block; margin-bottom: 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
  .cta-block { background: #171C33; border-radius: 12px; padding: 48px; text-align: center; margin: 48px 0; }
  .cta-block h2 { color: #fff; margin: 0 0 12px; font-size: 24px; }
  .cta-block p { color: #9BA0AB; margin: 0 0 24px; }
  .cta-btn { display: inline-block; background: #59a985; color: #fff; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; }
  footer { background: #171C33; color: #9BA0AB; padding: 32px 0; text-align: center; font-size: 14px; }
  footer a { color: #9BA0AB; }
</style>
</head>
<body>

<nav>
  <div class="nav-inner">
    ${logoSvg('op-blog-nav', 120, 30)}
    <a href="https://${SITE_URL}" class="nav-cta">Try OpStream →</a>
  </div>
</nav>

<div class="article-wrap">
  <span class="tag">Product Update</span>
  <h1>[Compelling title — focus on the reader's outcome, not "Announcing ${featureName}"]</h1>
  <div class="meta">
    <span>By OpStream Team</span>
    <span>·</span>
    <span>[Month DD, 2025]</span>
    <span>·</span>
    <span>[X] min read</span>
  </div>
  <hr>

  [Write 2-3 opening paragraphs: start with a relatable problem or industry insight, build tension, then introduce ${featureName} as the answer. Make it engaging and specific.]

  <h2>[What Is ${featureName}?]</h2>
  [2 paragraphs clearly explaining what the feature is and what it does]

  <h2>Key Capabilities</h2>
  [3 sub-sections with h3 headers, each covering a key capability of the feature based on the epic context]

  <h2>Real-World Use Cases</h2>

  <div class="callout">
    <strong>Use Case 1: [Scenario title]</strong>
    [2-3 sentences describing a specific, realistic scenario where this feature solves a real problem]
  </div>

  <div class="callout">
    <strong>Use Case 2: [Scenario title]</strong>
    [2-3 sentences describing another scenario]
  </div>

  <h2>How to Get Started</h2>
  <ol>
    <li><strong>[Step 1]</strong> — [description]</li>
    <li><strong>[Step 2]</strong> — [description]</li>
    <li><strong>[Step 3]</strong> — [description]</li>
  </ol>

  [1-2 closing paragraphs: summary + forward-looking statement about what's next]

  <div class="cta-block">
    <h2>Ready to try ${featureName}?</h2>
    <p>Join product teams already using OpStream to ship better products faster.</p>
    <a href="https://${SITE_URL}" class="cta-btn">Get Started Free →</a>
  </div>
</div>

<footer>
  <p>© 2025 OpStream · <a href="https://${SITE_URL}">${SITE_URL}</a></p>
</footer>

</body>
</html>

Fill every [bracketed placeholder] with specific content. Write ~700 words of engaging article body. Output only the complete HTML.${customNote}`
      );

    case 'linkedin-post':
      return (
        base +
        `Write a LinkedIn post announcing the "${featureName}" feature for OpStream.

Requirements:
- Max 2,200 characters
- Start with a hook — open with a problem, insight, or surprising stat (no "I'm excited to announce")
- 2-3 short paragraphs
- 3-5 relevant hashtags at the end
- Include https://${SITE_URL}
- Professional but conversational tone
- Focus on the problem it solves and the value delivered

Output plain text only (no HTML, no markdown).${customNote}`
      );

    case 'landing-page':
      return (
        base +
        `Generate a complete, production-ready HTML landing page for the "${featureName}" feature of OpStream.
Output ONLY valid, complete HTML — no markdown fences, no commentary.

<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${featureName} — OpStream</title>
<style>
${OPSTREAM_CSS}
.nav-links { display: flex; gap: 28px; list-style: none; }
.nav-links a { color: #4a4a4a; font-size: 14px; font-weight: 500; text-decoration: none; }
.nav-links a:hover { color: #59a985; }
.nav-cta { background: #59a985; color: #fff !important; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none !important; }
.hero-full { padding: 100px 0 80px; text-align: center; }
.proof-bar { border-top: 1px solid #E8EAED; border-bottom: 1px solid #E8EAED; padding: 20px 0; background: #FAFBFC; text-align: center; }
.proof-text { color: #9BA0AB; font-size: 14px; font-weight: 500; }
.proof-num { color: #171C33; font-weight: 700; }
.feature-section { padding: 64px 0; }
.feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
.feature-grid.flip { direction: rtl; }
.feature-grid.flip > * { direction: ltr; }
.testimonial { background: #171C33; padding: 64px 0; text-align: center; }
.quote { font-size: 22px; font-style: italic; color: #fff; max-width: 620px; margin: 0 auto 20px; line-height: 1.6; }
.quote-attr { color: #9BA0AB; font-size: 14px; }
.faq { padding: 64px 0; }
.faq-item { border-bottom: 1px solid #E8EAED; padding: 20px 0; }
.faq-q { font-weight: 600; color: #171C33; margin-bottom: 8px; font-size: 16px; }
.faq-a { color: #4a4a4a; font-size: 14px; margin: 0; }
.cta-gradient { background: linear-gradient(135deg, #59a985 0%, #1AA9DB 100%); padding: 80px 0; text-align: center; }
.cta-gradient h2 { color: #fff; margin-bottom: 16px; }
.cta-gradient p { color: rgba(255,255,255,0.85); margin-bottom: 32px; }
.btn-white { background: #fff; color: #59a985 !important; }
@media (max-width: 768px) {
  .feature-grid { grid-template-columns: 1fr; }
  .nav-links { display: none; }
}
</style>
</head>
<body>

<nav>
  <div class="container">
    <div class="nav-inner">
      ${logoSvg('op-lp-nav')}
      <ul class="nav-links">
        <li><a href="#">Features</a></li>
        <li><a href="#">Pricing</a></li>
        <li><a href="#">Docs</a></li>
      </ul>
      <a href="https://${SITE_URL}" class="nav-cta">Get Started Free →</a>
    </div>
  </div>
</nav>

<div class="hero-full">
  <div class="container" style="max-width:760px;">
    <div class="hero-label">[Feature category]</div>
    <h1 style="margin-bottom:20px;">[Bold headline — the main promise of ${featureName}, 8-12 words]</h1>
    <p class="lead" style="margin:0 auto 36px;max-width:580px;">[Subheadline: who it's for, what it does, the transformation]</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
      <a href="https://${SITE_URL}" class="btn">Start Free Trial →</a>
      <a href="https://${SITE_URL}/demo" class="btn-outline">Watch Demo</a>
    </div>
  </div>
</div>

<div class="proof-bar">
  <div class="container">
    <span class="proof-text">Trusted by <span class="proof-num">[X]+ product teams</span> · Avg. <span class="proof-num">[Xh] saved per week</span> · <span class="proof-num">[X%] faster delivery</span></span>
  </div>
</div>

<section>
  <div class="container">
    <div style="text-align:center;margin-bottom:48px;">
      <div class="section-label">Features</div>
      <h2>[What makes ${featureName} powerful]</h2>
    </div>
    <div class="card-grid">
      <div class="card"><div style="font-size:32px;margin-bottom:16px;">[emoji]</div><h3>[Feature 1]</h3><p style="color:#9BA0AB;font-size:14px;margin:0;">[Description]</p></div>
      <div class="card"><div style="font-size:32px;margin-bottom:16px;">[emoji]</div><h3>[Feature 2]</h3><p style="color:#9BA0AB;font-size:14px;margin:0;">[Description]</p></div>
      <div class="card"><div style="font-size:32px;margin-bottom:16px;">[emoji]</div><h3>[Feature 3]</h3><p style="color:#9BA0AB;font-size:14px;margin:0;">[Description]</p></div>
    </div>
  </div>
</section>

<section class="alt-bg feature-section">
  <div class="container">
    <div style="text-align:center;margin-bottom:48px;">
      <div class="section-label">How It Works</div>
      <h2>Simple to set up. Powerful in practice.</h2>
    </div>
    <div class="feature-grid" style="margin-bottom:48px;">
      <div><div class="section-label">Step 1</div><h3>[Step 1 title]</h3><p>[2-3 sentences]</p></div>
      <div class="browser-mock">
        <div class="browser-bar"><span class="browser-dot" style="background:#ff6059"></span><span class="browser-dot" style="background:#ffbd2e"></span><span class="browser-dot" style="background:#28c840"></span></div>
        <div class="browser-content" style="background:#fff;min-height:140px;">[Step 1 UI mock — realistic styled HTML]</div>
      </div>
    </div>
    <div class="feature-grid flip" style="margin-bottom:48px;">
      <div><div class="section-label">Step 2</div><h3>[Step 2 title]</h3><p>[2-3 sentences]</p></div>
      <div class="browser-mock">
        <div class="browser-bar"><span class="browser-dot" style="background:#ff6059"></span><span class="browser-dot" style="background:#ffbd2e"></span><span class="browser-dot" style="background:#28c840"></span></div>
        <div class="browser-content" style="background:#fff;min-height:140px;">[Step 2 UI mock]</div>
      </div>
    </div>
    <div class="feature-grid">
      <div><div class="section-label">Step 3</div><h3>[Step 3 — the outcome]</h3><p>[2-3 sentences about the result]</p></div>
      <div class="browser-mock">
        <div class="browser-bar"><span class="browser-dot" style="background:#ff6059"></span><span class="browser-dot" style="background:#ffbd2e"></span><span class="browser-dot" style="background:#28c840"></span></div>
        <div class="browser-content" style="background:#fff;min-height:140px;">[Step 3 UI mock]</div>
      </div>
    </div>
  </div>
</section>

<div class="stats-block">
  <div class="container">
    <div class="section-label" style="text-align:center;color:#59a985;">Results</div>
    <h2>Real impact, real numbers</h2>
    <p class="stats-subtitle">From teams using ${featureName} today</p>
    <div class="stats-grid">
      <div><div class="stat-number">[X%]</div><div class="stat-label">[metric]</div></div>
      <div><div class="stat-number">[Xh]</div><div class="stat-label">[metric]</div></div>
      <div><div class="stat-number">[X×]</div><div class="stat-label">[metric]</div></div>
    </div>
  </div>
</div>

<div class="testimonial">
  <div class="container">
    <p class="quote">"[Realistic customer testimonial — specific outcome, not generic praise]"</p>
    <p class="quote-attr">[Name], [Title] at [Company type]</p>
  </div>
</div>

<div class="faq">
  <div class="container" style="max-width:720px;">
    <div style="text-align:center;margin-bottom:48px;"><div class="section-label">FAQ</div><h2>Common questions</h2></div>
    <div class="faq-item"><p class="faq-q">[Question 1 about ${featureName}]</p><p class="faq-a">[Clear answer]</p></div>
    <div class="faq-item"><p class="faq-q">[Question 2]</p><p class="faq-a">[Answer]</p></div>
    <div class="faq-item"><p class="faq-q">[Question 3]</p><p class="faq-a">[Answer]</p></div>
    <div class="faq-item"><p class="faq-q">[Question 4]</p><p class="faq-a">[Answer]</p></div>
  </div>
</div>

<div class="cta-gradient">
  <div class="container">
    <h2>[Final CTA headline — action-oriented, outcome-focused]</h2>
    <p>[1-2 sentence value prop]</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
      <a href="https://${SITE_URL}" class="btn btn-white">Start Free Trial →</a>
      <a href="https://${SITE_URL}/demo" style="color:#fff;border:2px solid rgba(255,255,255,0.5);padding:14px 28px;border-radius:8px;font-weight:600;text-decoration:none;display:inline-block;">Schedule Demo</a>
    </div>
  </div>
</div>

<footer>
  <div class="container">
    <div class="footer-inner">
      ${logoSvg('op-lp-footer')}
      <p style="font-size:13px;">© 2025 OpStream · <a href="https://${SITE_URL}">${SITE_URL}</a></p>
    </div>
  </div>
</footer>

</body>
</html>

Replace ALL [bracketed placeholders] with specific, compelling content. UI mocks must be realistic styled HTML. Output only the complete HTML.${customNote}`
      );

    case 'website-change':
      return (
        base +
        `Suggest specific changes to make to the ${SITE_URL} website to feature the "${featureName}" capability.

For each suggested change provide:
1. **Page/Section**: Which page and section to update
2. **Current state**: What's likely there now (or "New section" if adding)
3. **Proposed change**: Exact copy and content to add/replace
4. **Priority**: High / Medium / Low
5. **Rationale**: Why this change drives conversions or improves clarity

Cover: homepage hero, features page, navigation, and any new landing page needs. Be specific and actionable.${customNote}`
      );

    default:
      return base + `Write comprehensive content about the "${featureName}" feature.${customNote}`;
  }
}
