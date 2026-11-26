// Turns one pipeline result file (results/bugs-*.json) into a Jira-shaped summary (payload is mocked: no live Jira call).
// Usage: node scripts/triage-summary.js <path-to-bugs-json>   (prints one line of JSON to stdout)
const fs = require('fs');

const PRIORITY = { critical: 'Highest', major: 'High', minor: 'Medium', trivial: 'Low' };

function describe(b) {
  const steps = Array.isArray(b.steps_to_reproduce) ? b.steps_to_reproduce : String(b.steps_to_reproduce || '').split('\n');
  return [
    `*WCAG ${b.wcag_criterion}* ${b.wcag_criterion_name || ''}`.trim(),
    `*Element:* ${b.element_selector}`,
    `*Affected users:* ${(b.affected_users || []).join(', ')}`,
    `*Steps:*\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    `*Expected:* ${b.expected_behavior}`,
    `*Actual:* ${b.actual_behavior}`,
    `*Suggested fix:* ${b.suggested_fix}`
  ].join('\n');
}

function summarize(result) {
  const logs = result.bugLogs || [];
  const counts = { critical: 0, major: 0, minor: 0, trivial: 0 };
  for (const b of logs) if (counts[b.severity] !== undefined) counts[b.severity] += 1;
  const issues = logs.map(b => ({
    summary: String(b.title || '').slice(0, 80),
    priority: PRIORITY[b.severity] || 'Medium',
    labels: ['a11y', `wcag-${b.wcag_criterion}`, b._metadata ? b._metadata.violationId : 'unknown'],
    description: describe(b)
  }));
  const alert = counts.critical > 0;
  return {
    url: result.url,
    scannedAt: result.scanTimestamp,
    total: result.totalViolations,
    newBugLogs: logs.length,
    counts,
    parseErrors: logs.filter(b => b._parse_error).length,
    issues,
    alert,
    alertMessage: alert ? `A11Y ALERT: ${counts.critical} critical accessibility bug(s) on ${result.url}` : ''
  };
}

module.exports = { summarize };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node scripts/triage-summary.js <bugs-json>'); process.exit(1); }
  process.stdout.write(JSON.stringify(summarize(JSON.parse(fs.readFileSync(file, 'utf8')))));
}
