import { test, expect } from '@playwright/test';
import {
  normalizeSteps, parseJsonLoose, computeContrastFix, contrastRatio, passingColor,
  loadProjectContext, buildSystemPrompt, isCheckoutPage, applyProjectSeverityRules
} from '../src/generate';
import { Violation, BugLog } from '../src/types';

test.describe('Generator helpers', () => {
  test('normalizeSteps drops bare numbers and numbering prefixes', () => {
    expect(normalizeSteps([1, 'Open the page', 2, '3. Locate the image'])).toEqual(['Open the page', 'Locate the image']);
    expect(normalizeSteps([1, 2])).toEqual([]);
    expect(normalizeSteps('1. Open the page\n2. Observe the issue')).toEqual(['Open the page', 'Observe the issue']);
  });

  test('parseJsonLoose handles fences and surrounding text, returns null on truncation', () => {
    expect(parseJsonLoose('```json\n{"title":"x"}\n```')).toEqual({ title: 'x' });
    expect(parseJsonLoose('Here: {"title":"y"} done')).toEqual({ title: 'y' });
    expect(parseJsonLoose('{"title":"trunc')).toBeNull();
    expect(parseJsonLoose('')).toBeNull();
  });

  test('passingColor produces a colour that meets the required ratio', () => {
    expect(contrastRatio('#aaaaaa', '#ffffff')).toBeLessThan(4.5);
    const fixed = passingColor('#aaaaaa', '#ffffff', 4.5)!;
    expect(fixed).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(fixed, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  test('computeContrastFix uses axe colour data and ignores other rules', () => {
    const v = {
      id: 'color-contrast', impact: 'serious', description: '', help: '', helpUrl: '', tags: [],
      nodes: [{ html: '<p>', target: ['.price'], failureSummary: '', checks: [{ id: 'color-contrast',
        data: { fgColor: '#aaaaaa', bgColor: '#ffffff', contrastRatio: 2.32, expectedContrastRatio: '4.5:1' } }] }]
    } as Violation;
    const fix = computeContrastFix(v)!;
    expect(fix).toContain('.price');
    expect(fix).toContain('#aaaaaa');
    expect(computeContrastFix({ ...v, id: 'image-alt' })).toBeNull();
  });

  test('checkout rule: checkout pages are forced to critical, other pages untouched, rule off disables it', () => {
    expect(isCheckoutPage('file:///x/fixtures/checkout.html')).toBe(true);
    expect(isCheckoutPage('https://shop.test/checkout/payment')).toBe(true);
    expect(isCheckoutPage('https://shop.test/products')).toBe(false);
    expect(isCheckoutPage('file:///C:/Users/me/checkout-demo/fixtures/cart.html')).toBe(false);
    const mk = () => ({ severity: 'major' } as BugLog);
    const forced = applyProjectSeverityRules(mk(), 'file:///x/fixtures/checkout.html');
    expect(forced.severity).toBe('critical');
    expect(forced._severity_override).toEqual({ from: 'major', rule: expect.any(String) });
    expect(applyProjectSeverityRules(mk(), 'file:///x/fixtures/cart.html').severity).toBe('major');
    process.env.USE_CLAUDE_MD = '0';
    expect(applyProjectSeverityRules(mk(), 'file:///x/fixtures/checkout.html').severity).toBe('major');
    delete process.env.USE_CLAUDE_MD;
  });

  test('CLAUDE.md rules are injected into the system prompt and can be switched off', () => {
    expect(loadProjectContext()).toContain('Severity Rules');
    process.env.USE_CLAUDE_MD = '1';
    expect(buildSystemPrompt()).toContain('checkout flow violations are always critical');
    process.env.USE_CLAUDE_MD = '0';
    expect(buildSystemPrompt()).not.toContain('Severity Rules');
    delete process.env.USE_CLAUDE_MD;
  });
});
