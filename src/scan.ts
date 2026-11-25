import { chromium, Browser, Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';
import { ScanResult, Violation } from './types';

export async function scanUrl(url: string): Promise<ScanResult> {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page: Page = await context.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  await browser.close();

  const violations: Violation[] = results.violations.map(v => ({
    id: v.id,
    impact: v.impact as Violation['impact'],
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    tags: v.tags.filter(t => t.startsWith('wcag')),
    nodes: v.nodes.map(n => ({
      html: n.html,
      target: n.target as string[],
      failureSummary: n.failureSummary || '',
      checks: [...(n.any || []), ...(n.all || []), ...(n.none || [])].map(c => ({ id: c.id, data: c.data }))
    }))
  }));

  return {
    url,
    timestamp: new Date().toISOString(),
    violationCount: violations.length,
    violations
  };
}

export async function scanFile(filePath: string): Promise<ScanResult> {
  const absolutePath = path.resolve(filePath);
  const fileUrl = `file://${absolutePath}`;
  return scanUrl(fileUrl);
}

async function main(): Promise<void> {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: ts-node src/scan.ts <url-or-file-path>');
    process.exit(1);
  }

  const isFile = fs.existsSync(target);
  const results = isFile ? await scanFile(target) : await scanUrl(target);

  const outputDir = path.join(__dirname, '..', 'results');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, `scan-${Date.now()}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

  console.log(`Scanned: ${results.url}`);
  console.log(`Violations found: ${results.violationCount}`);
  console.log(`Results saved: ${outputFile}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Scan failed:', err.message);
    process.exit(1);
  });
}
