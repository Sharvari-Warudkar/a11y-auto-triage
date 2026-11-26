export interface ViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
  checks?: Array<{ id: string; data?: unknown }>;
}

export interface Violation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: ViolationNode[];
}

export interface ScanResult {
  url: string;
  timestamp: string;
  violationCount: number;
  violations: Violation[];
}

export interface WcagChunk {
  id: string;
  title: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    criterionId: string;
    type: string;
  };
}

export interface RetrievedContext {
  criterionId: string;
  title: string;
  content: string;
  score: number;
}

export interface BugLog {
  title: string;
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  wcag_criterion: string;
  wcag_criterion_name: string;
  affected_users: string[];
  steps_to_reproduce: string | string[];
  expected_behavior: string;
  actual_behavior: string;
  suggested_fix: string;
  element_selector: string;
  impact: string;
  _parse_error?: boolean;
  _severity_override?: { from: string; rule: string };
  _metadata?: {
    violationId: string;
    scanTimestamp: string;
    retrievedCriteria: string[];
    model?: string;
    claudeMd?: boolean;
  };
}

export interface PipelineOutput {
  url: string;
  scanTimestamp: string;
  totalViolations: number;
  newBugLogs: number;
  bugLogs: BugLog[];
}

export interface FiledViolation {
  key: string;
  violationId: string;
  filedAt: string;
}

export interface DeduplicateResult {
  newViolations: Violation[];
  duplicates: { key: string; violation: string }[];
}
