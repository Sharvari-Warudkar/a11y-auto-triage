const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const fs = require('fs');
const path = require('path');

async function scanUrl(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

  const results = await new AxePuppeteer(page)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  await browser.close();

  const violations = results.violations.map(v => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    tags: v.tags.filter(t => t.startsWith('wcag')),
    nodes: v.nodes.map(n => ({
      html: n.html,
      target: n.target,
      failureSummary: n.failureSummary
    }))
  }));

  return {
    url,
    timestamp: new Date().toISOString(),
    violationCount: violations.length,
    violations
  };
}

async function scanFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const fileUrl = `file://${absolutePath}`;
  return scanUrl(fileUrl);
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node src/scan.js <url-or-file-path>');
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

  return results;
}

if (require.main === module) {
  main().catch(err => {
    console.error('Scan failed:', err.message);
    process.exit(1);
  });
}

module.exports = { scanUrl, scanFile };
