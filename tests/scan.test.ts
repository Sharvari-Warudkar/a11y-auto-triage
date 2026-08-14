import { test, expect } from '@playwright/test';
import { scanFile } from '../src/scan';
import * as path from 'path';

test.describe('Scanner', () => {
  test('detects color-contrast violations in product-listing', async () => {
    const result = await scanFile(path.join(__dirname, '..', 'fixtures', 'product-listing.html'));
    expect(result.violationCount).toBeGreaterThan(0);
    const contrastViolation = result.violations.find(v => v.id === 'color-contrast');
    expect(contrastViolation).toBeDefined();
    expect(contrastViolation!.impact).toBe('serious');
  });

  test('detects image-alt violations in product-listing', async () => {
    const result = await scanFile(path.join(__dirname, '..', 'fixtures', 'product-listing.html'));
    const altViolation = result.violations.find(v => v.id === 'image-alt');
    expect(altViolation).toBeDefined();
    expect(altViolation!.impact).toBe('critical');
    expect(altViolation!.nodes.length).toBeGreaterThan(0);
  });

  test('detects html-has-lang in cart fixture', async () => {
    const result = await scanFile(path.join(__dirname, '..', 'fixtures', 'cart.html'));
    const langViolation = result.violations.find(v => v.id === 'html-has-lang');
    expect(langViolation).toBeDefined();
  });

  test('detects label violations in product-detail', async () => {
    const result = await scanFile(path.join(__dirname, '..', 'fixtures', 'product-detail.html'));
    const labelViolation = result.violations.find(v => v.id === 'label');
    expect(labelViolation).toBeDefined();
    expect(labelViolation!.nodes.length).toBeGreaterThan(0);
  });

  test('returns correct structure', async () => {
    const result = await scanFile(path.join(__dirname, '..', 'fixtures', 'product-listing.html'));
    expect(result.url).toContain('product-listing.html');
    expect(result.timestamp).toBeDefined();
    expect(typeof result.violationCount).toBe('number');
    expect(Array.isArray(result.violations)).toBe(true);
  });
});
