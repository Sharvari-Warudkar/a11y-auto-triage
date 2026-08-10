import { Violation, RetrievedContext, BugLog } from './types';

const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY;
const PORTKEY_VIRTUAL_KEY = process.env.PORTKEY_VIRTUAL_KEY;
const PORTKEY_GATEWAY = 'https://api.portkey.ai/v1';

const SYSTEM_PROMPT = `You are an accessibility QA engineer generating bug reports for WCAG 2.1 AA violations found on e-commerce websites.

For each violation, produce a structured JSON bug report with these fields:
- title: concise bug title (max 80 chars)
- severity: "critical", "major", "minor", or "trivial" based on user impact
- wcag_criterion: the specific WCAG success criterion ID (e.g., "1.4.3")
- wcag_criterion_name: human-readable criterion name
- affected_users: array of user groups affected (e.g., ["blind users", "keyboard-only users"])
- steps_to_reproduce: numbered steps to observe the violation
- expected_behavior: what should happen per WCAG
- actual_behavior: what currently happens
- suggested_fix: specific code-level fix suggestion
- element_selector: CSS selector of the affected element
- impact: "critical", "serious", "moderate", or "minor" (from axe-core)

Severity mapping:
- critical: blocks access entirely for a user group (e.g., no keyboard access to checkout)
- major: significantly impairs access (e.g., form inputs without labels)
- minor: causes difficulty but workaround exists (e.g., low contrast on non-essential text)
- trivial: best-practice improvement with minimal user impact

Always cite the specific WCAG criterion from the provided context. If the context doesn't contain the exact criterion, use the violation's helpUrl to identify it.

Output ONLY valid JSON. No markdown, no explanation outside the JSON.`;

interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

export async function generateBugLog(
  violation: Violation,
  wcagContext: RetrievedContext[]
): Promise<BugLog> {
  const contextText = wcagContext
    .map(c => `--- ${c.title} ---\n${c.content}`)
    .join('\n\n');

  const userPrompt = `Generate a bug report for this accessibility violation:

VIOLATION:
- Rule: ${violation.id}
- Impact: ${violation.impact}
- Description: ${violation.description}
- Help: ${violation.help}
- Affected elements:
${violation.nodes.map(n => `  - Selector: ${n.target.join(' > ')}
    HTML: ${n.html}
    Issue: ${n.failureSummary}`).join('\n')}

RELEVANT WCAG CRITERIA (from knowledge base):
${contextText}

Generate a JSON bug report for this violation. Return a single JSON object (not an array).`;

  const response = await fetch(`${PORTKEY_GATEWAY}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-portkey-api-key': PORTKEY_API_KEY || '',
      'x-portkey-virtual-key': PORTKEY_VIRTUAL_KEY || ''
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM request failed: ${response.status} - ${err}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices[0].message.content.trim();

  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    return JSON.parse(cleaned) as BugLog;
  } catch {
    console.error('Failed to parse LLM output:', content.slice(0, 200));
    return {
      title: violation.help,
      severity: violation.impact === 'critical' ? 'critical' : 'major',
      wcag_criterion: 'unknown',
      wcag_criterion_name: violation.description,
      affected_users: ['unknown'],
      steps_to_reproduce: '1. Navigate to the page\n2. Observe the violation',
      expected_behavior: 'Element should meet WCAG 2.1 AA requirements',
      actual_behavior: violation.help,
      suggested_fix: `See ${violation.helpUrl}`,
      element_selector: violation.nodes[0]?.target?.join(' > ') || 'unknown',
      impact: violation.impact,
      _parse_error: true
    };
  }
}
