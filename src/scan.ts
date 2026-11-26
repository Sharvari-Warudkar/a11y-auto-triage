import { chromium, Browser, Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';
import { ScanResult, Violation } from './types';

/**
 * Custom check for a gap in axe-core: axe accepts `placeholder` as an accessible name, so inputs
 * that have ONLY a placeholder pass. WCAG 3.3.2 (Labels or Instructions) needs a persistent label.
 * Runs in the page; returns one violation with a node per offending input.
 */
export async function findPlaceholderOnlyInputs(page: Page): Promise<Violation | null> {
  const nodes = await page.evaluate(() => {
    const skip = ['hidden', 'submit', 'button', 'reset', 'image', 'checkbox', 'radio'];
    const out: Array<{ html: string; target: string }> = [];
    document.querySelectorAll('input, textarea').forEach(el => {
      const input = el as HTMLInputElement;
      if (skip.includes((input.type || '').toLowerCase())) return;
      if (!input.getAttribute('placeholder')) return;
      const hasLabel = (input.labels && input.labels.length > 0) ||
        input.getAttribute('aria-label') || input.getAttribute('aria-labelledby') || input.getAttribute('title');
      if (hasLabel) return;
      const target = input.id ? '#' + input.id : input.tagName.toLowerCase() + '[placeholder="' + input.getAttribute('placeholder') + '"]';
      out.push({ html: input.outerHTML.slice(0, 200), target });
    });
    return out;
  });
  if (nodes.length === 0) return null;
  return {
    id: 'placeholder-only-label',
    impact: 'serious',
    description: 'Ensures form inputs have a persistent visible label and do not rely only on placeholder text (WCAG 3.3.2)',
    help: 'Form inputs must have a persistent visible label, not only a placeholder',
    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
    tags: ['wcag2a', 'wcag332'],
    nodes: nodes.map(n => ({
      html: n.html,
      target: [n.target],
      failureSummary: 'Fix any of the following: input has a placeholder but no <label>, aria-label, aria-labelledby or title'
    }))
  };
}

export async function scanUrl(url: string): Promise<ScanResult> {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page: Page = await context.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  const placeholderViolation = await findPlaceholderOnlyInputs(page);

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
  if (placeholderViolation) violations.push(placeholderViolation);

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
