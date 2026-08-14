import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { runPipeline } from './pipeline';

interface SiteConfig {
  name: string;
  url: string;
  type: string;
  pages: string[];
}

interface Config {
  sites: SiteConfig[];
}

async function scanAll(): Promise<void> {
  const configPath = path.join(__dirname, '..', 'config', 'sites.json');
  const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  console.log(`\n=== SCANNING ${config.sites.length} SITES ===\n`);

  const allResults = [];

  for (const site of config.sites) {
    console.log(`\n--- Site: ${site.name} (${site.pages.length} pages) ---\n`);

    for (const pageUrl of site.pages) {
      try {
        const result = await runPipeline(pageUrl, { skipDedup: true });
        allResults.push({ site: site.name, pageUrl, ...result });
        await new Promise(r => setTimeout(r, 2000));
      } catch (err: any) {
        console.error(`  FAILED: ${pageUrl} — ${err.message}`);
        allResults.push({ site: site.name, url: pageUrl, error: err.message });
      }
    }
  }

  const summaryPath = path.join(__dirname, '..', 'results', `full-audit-${Date.now()}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(allResults, null, 2));
  console.log(`\n=== AUDIT COMPLETE ===`);
  console.log(`Total sites: ${config.sites.length}`);
  console.log(`Total pages: ${allResults.length}`);
  console.log(`Summary saved: ${summaryPath}`);
}

if (require.main === module) {
  scanAll().catch(err => {
    console.error('Scan-all failed:', err.message);
    process.exit(1);
  });
}
