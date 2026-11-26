import * as fs from 'fs';
import * as path from 'path';
import { Violation, RetrievedContext, BugLog } from './types';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const MAX_RATE_LIMIT_RETRIES = 6;

// Role + output fields only. Project rules (severity, citation, fix, domain context)
// are loaded from CLAUDE.md at runtime so that the effect of CLAUDE.md can be measured
// by turning it off (USE_CLAUDE_MD=0).
const BASE_PROMPT = `You are an accessibility QA engineer generating bug reports for WCAG 2.1 AA violations found on e-commerce websites.

For each violation, produce a structured JSON bug report with these fields:
- title: concise bug title (max 80 chars)
- severity: "critical", "major", "minor", or "trivial"
- wcag_criterion: the WCAG success criterion ID (e.g., "1.4.3")
- wcag_criterion_name: human-readable criterion name
- affected_users: array of user groups affected (e.g., ["blind users", "keyboard-only users"])
- steps_to_reproduce: JSON array of plain-text strings, one per step, without numbering (e.g., ["Open the page", "Locate the image"])
- expected_behavior: what should happen per WCAG
- actual_behavior: what currently happens
- suggested_fix: code-level fix suggestion
- element_selector: CSS selector of the affected element
- impact: "critical", "serious", "moderate", or "minor" (from axe-core)

Output ONLY valid JSON (a single object). No markdown, no explanation outside the JSON.`;

const CLAUDE_MD_SECTIONS = [
  'Bug Report Output Schema',
  'Severity Rules',
  'WCAG Criterion Citation Rules',
  'Fix Suggestion Rules',
  'E-commerce Domain Context'
];

export function useClaudeMd(): boolean {
  return process.env.USE_CLAUDE_MD !== '0';
}

export function currentModel(): string {
  return process.env.GROQ_MODEL || DEFAULT_MODEL;
}

/** Extract the rule sections of CLAUDE.md that are injected into the system prompt. */
export function loadProjectContext(claudeMdPath = path.join(__dirname, '..', 'CLAUDE.md')): string {
  if (!fs.existsSync(claudeMdPath)) return '';
  const text = fs.readFileSync(claudeMdPath, 'utf8').replace(/\r\n/g, '\n');
  const sections = text.split(/^## /m).slice(1);
  const picked = sections.filter(s => CLAUDE_MD_SECTIONS.some(name => s.startsWith(name)));
  return picked.map(s => '## ' + s.trim()).join('\n\n');
}

export function buildSystemPrompt(): string {
  if (!useClaudeMd()) return BASE_PROMPT;
  const ctx = loadProjectContext();
  return ctx ? `${BASE_PROMPT}\n\nPROJECT RULES (from CLAUDE.md, follow exactly):\n\n${ctx}` : BASE_PROMPT;
}

interface ChatCompletionResponse {
  choices: Array<{ message: { content: string | null } }>;
}

// ---------- helpers (exported for tests) ----------

export function parseJsonLoose(content: string): BugLog | null {
  if (!content) return null;
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as BugLog;
  } catch {
    return null;
  }
}

/** Keep only readable text steps; split strings; drop bare numbers and numbering prefixes. */
export function normalizeSteps(steps: unknown): string[] {
  let list: unknown[] = [];
  if (Array.isArray(steps)) list = steps;
  else if (typeof steps === 'string') list = steps.split('\n');
  return list
    .filter((s): s is string => typeof s === 'string')
    .map(s => s.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(s => s.length > 3);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const a = hexToRgb(fg), b = hexToRgb(bg);
  if (!a || !b) return 0;
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Move the foreground colour toward black (or white on dark backgrounds) until it passes. */
export function passingColor(fg: string, bg: string, required: number): string | null {
  const f = hexToRgb(fg), b = hexToRgb(bg);
  if (!f || !b) return null;
  const target: [number, number, number] = luminance(b) > 0.5 ? [0, 0, 0] : [255, 255, 255];
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const c = f.map((v, i) => Math.round(v + (target[i] - v) * t)) as [number, number, number];
    const hex = '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
    if (contrastRatio(hex, bg) >= required) return hex;
  }
  return null;
}

/** Deterministic, code-level contrast fix from axe-core's measured colours. */
export function computeContrastFix(violation: Violation): string | null {
  if (violation.id !== 'color-contrast') return null;
  const node = violation.nodes[0];
  const check = node?.checks?.find(c => c.id === 'color-contrast');
  const d = check?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number; expectedContrastRatio?: string } | undefined;
  if (!d?.fgColor || !d?.bgColor) return null;
  const required = parseFloat(d.expectedContrastRatio || '4.5') || 4.5;
  const fixed = passingColor(d.fgColor, d.bgColor, required);
  if (!fixed) return null;
  const selector = node.target.join(' > ');
  return `In the CSS rule for ${selector}, change color from ${d.fgColor} to ${fixed} (${contrastRatio(fixed, d.bgColor).toFixed(2)}:1 on ${d.bgColor}; measured ${d.contrastRatio}:1, required ${required}:1).`;
}

/** CLAUDE.md E-commerce Domain Context: checkout flow violations are always critical. */
export function isCheckoutPage(pageUrl: string): boolean {
  // http(s): look at the URL path; local files: only the file name (parent folders are irrelevant).
  if (/^https?:/i.test(pageUrl)) {
    try { return /checkout/i.test(new URL(pageUrl).pathname); } catch { return false; }
  }
  const name = pageUrl.split(String.fromCharCode(92)).join('/').split('/').pop() || '';
  return /checkout/i.test(name);
}

/**
 * The prompt states the checkout rule but the model does not always follow it (measured: the checkout
 * contrast bug came back "major" in both arms), so it is enforced in code. The model's own severity is kept
 * in _severity_override.from for transparency. Only applies when CLAUDE.md rules are enabled.
 */
export function applyProjectSeverityRules(log: BugLog, pageUrl: string): BugLog {
  if (useClaudeMd() && isCheckoutPage(pageUrl) && log.severity !== 'critical') {
    log._severity_override = { from: log.severity, rule: 'CLAUDE.md: checkout flow violations are always critical' };
    log.severity = 'critical';
  }
  return log;
}

function fallbackBugLog(violation: Violation): BugLog {
  const node = violation.nodes[0];
  const selector = node?.target?.join(' > ') || 'unknown';
  const summary = (node?.failureSummary || '').replace(/\s+/g, ' ').trim();
  return {
    title: violation.help.slice(0, 80),
    severity: violation.impact === 'critical' ? 'critical' : 'major',
    wcag_criterion: 'unknown',
    wcag_criterion_name: violation.description,
    affected_users: ['unknown'],
    steps_to_reproduce: [`Open the page and locate ${selector}`, `Observe: ${violation.help}`],
    expected_behavior: 'Element should meet WCAG 2.1 AA requirements',
    actual_behavior: violation.help,
    suggested_fix: `On ${selector}: ${summary || violation.help}. Reference: ${violation.helpUrl}`,
    element_selector: selector,
    impact: violation.impact,
    _parse_error: true
  } as BugLog;
}

async function callLlm(system: string, user: string, maxTokens: number): Promise<string> {
  const model = currentModel();
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    max_tokens: maxTokens,
    temperature: 0.2
  };
  if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(body)
    });
    if (response.status === 429) {
      console.log(`      Rate limited. Waiting 10s...`);
      await new Promise(r => setTimeout(r, 10000));
      continue;
    }
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM request failed: ${response.status} - ${err}`);
    }
    const data = (await response.json()) as ChatCompletionResponse;
    return (data.choices[0].message.content || '').trim();
  }
  throw new Error('LLM request failed: rate limited too many times');
}

export async function generateBugLog(
  violation: Violation,
  wcagContext: RetrievedContext[],
  pageUrl = ''
): Promise<BugLog> {
  const contextText = wcagContext
    .map(c => `--- ${c.title} ---\n${c.content}`)
    .join('\n\n');

  const userPrompt = `Generate a bug report for this accessibility violation:

PAGE: ${pageUrl || 'unknown'}

VIOLATION:
- Rule: ${violation.id}
- Impact: ${violation.impact}
- Description: ${violation.description}
- Help: ${violation.help}
- Affected elements (${violation.nodes.length}):
${violation.nodes.slice(0, 3).map(n => `  - Selector: ${n.target.join(' > ')}
    HTML: ${n.html.slice(0, 200)}
    Issue: ${n.failureSummary}`).join('\n')}

RELEVANT WCAG CRITERIA (from knowledge base):
${contextText}

Generate a JSON bug report for this violation. Return a single JSON object (not an array).`;

  const system = buildSystemPrompt();
  const baseTokens = Number(process.env.GROQ_MAX_TOKENS) || 4000;

  let parsed = parseJsonLoose(await callLlm(system, userPrompt, baseTokens));
  if (!parsed) {
    console.log('      Parse failed, retrying once with a larger token budget...');
    parsed = parseJsonLoose(await callLlm(system, userPrompt, baseTokens * 2));
  }
  if (!parsed) return applyProjectSeverityRules(fallbackBugLog(violation), pageUrl);

  const log = parsed as BugLog;
  let steps = normalizeSteps(log.steps_to_reproduce);
  if (steps.length < 2) {
    const selector = violation.nodes[0]?.target?.join(' > ') || 'the element';
    steps = [`Open ${pageUrl || 'the page'}`, `Locate ${selector}`, `Observe: ${violation.help}`];
  }
  log.steps_to_reproduce = steps;

  const fix = computeContrastFix(violation);
  if (fix) log.suggested_fix = fix;
  return applyProjectSeverityRules(log, pageUrl);
}
