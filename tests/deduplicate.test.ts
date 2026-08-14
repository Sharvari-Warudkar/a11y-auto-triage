import { test, expect } from '@playwright/test';
import { deduplicate, markFiled } from '../src/deduplicate';
import { Violation } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

const HISTORY_PATH = path.join(__dirname, '..', 'data', 'filed-violations.json');

const mockViolation: Violation = {
  id: 'color-contrast',
  impact: 'serious',
  description: 'Elements must have sufficient color contrast',
  help: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA',
  helpUrl: 'https://dequeuniversity.com/rules/axe/4.12/color-contrast',
  tags: ['wcag2aa', 'wcag143'],
  nodes: [
    { html: '<p class="price">$89.99</p>', target: ['.product-price'], failureSummary: 'Fix any of the following: Element has insufficient color contrast of 2.32' }
  ]
};

test.describe('Deduplication', () => {
  test.beforeEach(() => {
    if (fs.existsSync(HISTORY_PATH)) {
      fs.unlinkSync(HISTORY_PATH);
    }
  });

  test('first run reports all violations as new', () => {
    const { newViolations, duplicates } = deduplicate([mockViolation]);
    expect(newViolations.length).toBe(1);
    expect(duplicates.length).toBe(0);
  });

  test('after marking filed, same violation is detected as duplicate', () => {
    markFiled([mockViolation]);
    const { newViolations, duplicates } = deduplicate([mockViolation]);
    expect(newViolations.length).toBe(0);
    expect(duplicates.length).toBe(1);
    expect(duplicates[0].violation).toBe('color-contrast');
  });

  test('different violation on same page is not a duplicate', () => {
    markFiled([mockViolation]);
    const differentViolation: Violation = {
      ...mockViolation,
      id: 'image-alt',
      nodes: [{ html: '<img src="test.jpg">', target: ['img'], failureSummary: 'Missing alt' }]
    };
    const { newViolations } = deduplicate([differentViolation]);
    expect(newViolations.length).toBe(1);
  });

  test.afterAll(() => {
    if (fs.existsSync(HISTORY_PATH)) {
      fs.unlinkSync(HISTORY_PATH);
    }
  });
});
