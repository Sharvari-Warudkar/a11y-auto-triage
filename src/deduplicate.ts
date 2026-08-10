import * as fs from 'fs';
import * as path from 'path';
import { Violation, FiledViolation, DeduplicateResult } from './types';

const HISTORY_PATH = path.join(__dirname, '..', 'data', 'filed-violations.json');

function loadHistory(): FiledViolation[] {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
}

function saveHistory(history: FiledViolation[]): void {
  const dir = path.dirname(HISTORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function violationKey(violation: Violation, node: { target: string[] }): string {
  return `${violation.id}::${node.target.join(' > ')}`;
}

export function deduplicate(violations: Violation[]): DeduplicateResult {
  const history = loadHistory();
  const filedKeys = new Set(history.map(h => h.key));
  const newViolations: Violation[] = [];
  const duplicates: Array<{ key: string; violation: string }> = [];

  for (const violation of violations) {
    const newNodes = [];
    for (const node of violation.nodes) {
      const key = violationKey(violation, node);
      if (filedKeys.has(key)) {
        duplicates.push({ key, violation: violation.id });
      } else {
        newNodes.push(node);
      }
    }
    if (newNodes.length > 0) {
      newViolations.push({ ...violation, nodes: newNodes });
    }
  }

  return { newViolations, duplicates };
}

export function markFiled(violations: Violation[]): void {
  const history = loadHistory();
  for (const violation of violations) {
    for (const node of violation.nodes) {
      history.push({
        key: violationKey(violation, node),
        violationId: violation.id,
        filedAt: new Date().toISOString()
      });
    }
  }
  saveHistory(history);
}
