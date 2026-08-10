import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { scanUrl, scanFile } from './scan';
import { retrieveContext } from './rag/retrieve';
import { generateBugLog } from './generate';
import { deduplicate, markFiled } from './deduplicate';
import { BugLog, PipelineOutput } from './types';

interface PipelineOptions {
  skipDedup?: boolean;
  outputDir?: string;
}

export async function runPipeline(
  target: string,
  options: PipelineOptions = {}
): Promise<PipelineOutput> {
  const { skipDedup = false, outputDir } = options;
  const resultsDir = outputDir || path.join(__dirname, '..', 'results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  console.log('\n=== A11Y AUTO-TRIAGE PIPELINE ===\n');

  // Step 1: Scan
  console.log(`[1/5] Scanning: ${target}`);
  const isFile = fs.existsSync(target);
  const scanResults = isFile ? await scanFile(target) : await scanUrl(target);
  console.log(`      Found ${scanResults.violationCount} violations`);

  if (scanResults.violationCount === 0) {
    console.log('\nNo violations found. Page passes WCAG 2.1 AA checks.');
    return { bugLogs: [], url: scanResults.url, scanTimestamp: scanResults.timestamp, totalViolations: 0, newBugLogs: 0 };
  }

  // Step 2: Deduplicate
  let violations;
  if (skipDedup) {
    violations = scanResults.violations;
    console.log(`[2/5] Deduplication: skipped`);
  } else {
    const { newViolations, duplicates } = deduplicate(scanResults.violations);
    violations = newViolations;
    console.log(`[2/5] Deduplication: ${duplicates.length} already filed, ${violations.length} new`);
  }

  if (violations.length === 0) {
    console.log('\nAll violations already filed. Nothing new to report.');
    return { bugLogs: [], url: scanResults.url, scanTimestamp: scanResults.timestamp, totalViolations: scanResults.violationCount, newBugLogs: 0 };
  }

  // Step 3: Retrieve WCAG context
  console.log(`[3/5] Retrieving WCAG context for ${violations.length} violations...`);
  const contexts = [];
  for (const violation of violations) {
    const context = await retrieveContext(violation);
    contexts.push(context);
    await new Promise(r => setTimeout(r, 300));
  }

  // Step 4: Generate bug logs
  console.log(`[4/5] Generating bug logs...`);
  const bugLogs: BugLog[] = [];
  for (let i = 0; i < violations.length; i++) {
    const violation = violations[i];
    const context = contexts[i];
    console.log(`      Processing: ${violation.id} (${violation.impact})`);
    const bugLog = await generateBugLog(violation, context);
    bugLogs.push({
      ...bugLog,
      _metadata: {
        violationId: violation.id,
        scanTimestamp: scanResults.timestamp,
        retrievedCriteria: context.map(c => c.criterionId)
      }
    });
    await new Promise(r => setTimeout(r, 500));
  }

  // Step 5: Output & mark filed
  console.log(`[5/5] Writing results...`);
  if (!skipDedup) {
    markFiled(violations);
  }

  const output: PipelineOutput = {
    url: scanResults.url,
    scanTimestamp: scanResults.timestamp,
    totalViolations: scanResults.violationCount,
    newBugLogs: bugLogs.length,
    bugLogs
  };

  const outputFile = path.join(resultsDir, `bugs-${Date.now()}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

  console.log(`\n=== COMPLETE ===`);
  console.log(`Bug logs generated: ${bugLogs.length}`);
  console.log(`Output: ${outputFile}`);

  return output;
}

async function main(): Promise<void> {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: ts-node src/pipeline.ts <url-or-file-path> [--skip-dedup]');
    process.exit(1);
  }

  const skipDedup = process.argv.includes('--skip-dedup');
  await runPipeline(target, { skipDedup });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Pipeline failed:', err.message);
    process.exit(1);
  });
}
