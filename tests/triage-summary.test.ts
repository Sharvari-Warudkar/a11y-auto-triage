import { test, expect } from '@playwright/test';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { summarize } = require('../scripts/triage-summary');

const mk = (severity: string, extra = {}) => ({
  title: 'T'.repeat(100), severity, wcag_criterion: '1.4.3', wcag_criterion_name: 'Contrast (Minimum)',
  affected_users: ['low vision users'], steps_to_reproduce: ['Open page', 'Locate price'], expected_behavior: 'ok',
  actual_behavior: 'bad', suggested_fix: 'change color', element_selector: '.price', _metadata: { violationId: 'color-contrast' }, ...extra
});

test.describe('Triage summary (used by the n8n workflow)', () => {
  test('counts severities, maps Jira priorities and truncates titles to 80 chars', () => {
    const s = summarize({ url: 'u', scanTimestamp: 't', totalViolations: 3, bugLogs: [mk('critical'), mk('major'), mk('minor')] });
    expect(s.counts).toEqual({ critical: 1, major: 1, minor: 1, trivial: 0 });
    expect(s.issues.map((i: { priority: string }) => i.priority)).toEqual(['Highest', 'High', 'Medium']);
    expect(s.issues[0].summary.length).toBe(80);
    expect(s.issues[0].labels).toEqual(['a11y', 'wcag-1.4.3', 'color-contrast']);
  });

  test('alert is raised only when there is a critical bug', () => {
    expect(summarize({ url: 'u', totalViolations: 1, bugLogs: [mk('critical')] }).alert).toBe(true);
    const quiet = summarize({ url: 'u', totalViolations: 1, bugLogs: [mk('major')] });
    expect(quiet.alert).toBe(false);
    expect(quiet.alertMessage).toBe('');
  });

  test('handles string steps, parse errors and an empty result', () => {
    const s = summarize({ url: 'u', totalViolations: 1, bugLogs: [mk('major', { steps_to_reproduce: '1. a\n2. b', _parse_error: true })] });
    expect(s.parseErrors).toBe(1);
    expect(s.issues[0].description).toContain('1. 1. a');
    expect(summarize({ url: 'u', totalViolations: 0 }).newBugLogs).toBe(0);
  });

  test('CLI prints parseable JSON for a real saved result', () => {
    const { execFileSync } = require('child_process');
    const file = path.join(__dirname, '..', 'evidence', 'runs', 'with-claude-md-v2');
    const first = require('fs').readdirSync(file)[0];
    const out = execFileSync('node', [path.join(__dirname, '..', 'scripts', 'triage-summary.js'), path.join(file, first)]).toString();
    expect(JSON.parse(out).newBugLogs).toBeGreaterThan(0);
  });
});
