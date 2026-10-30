import assert from 'node:assert/strict';
import test from 'node:test';
import { scrapTargetsByDepartment, scrapRateColors, scrapRateStatus, scrapRateGradientStops } from '../src/scrapRate.js';

test('Assemblage has a 3% target', () => {
  assert.equal(scrapTargetsByDepartment.Assemblage, 3);
});

test('yellow includes 2.9% and 3.1%; green and red start outside the band', () => {
  for (const rate of [2.9, 3, 3.1]) assert.equal(scrapRateStatus(rate, 3), 'equal', `${rate}%`);
  for (const rate of [0, 2.89]) assert.equal(scrapRateStatus(rate, 3), 'under', `${rate}%`);
  for (const rate of [3.11, 9]) assert.equal(scrapRateStatus(rate, 3), 'over', `${rate}%`);
});

test('a segment crossing both thresholds includes the yellow band without a yellow data point', () => {
  const stops = scrapRateGradientStops([0, 6], 3);
  assert.ok(Math.abs(stops[1].offset - (6 - 3.1) / 6 * 100) < 1e-9);
  assert.ok(Math.abs(stops[3].offset - (6 - 2.9) / 6 * 100) < 1e-9);
  assert.deepEqual(stops.map(({ color }) => color), [
    scrapRateColors.over, scrapRateColors.over,
    scrapRateColors.equal, scrapRateColors.equal,
    scrapRateColors.under, scrapRateColors.under,
  ]);
  assert.equal(stops[1].offset, stops[2].offset);
  assert.equal(stops[3].offset, stops[4].offset);
});

test('flat lines use a solid color and gradient offsets stay within the line bounds', () => {
  assert.deepEqual(scrapRateGradientStops([], 3), []);
  for (const rate of [0, 3, 8]) assert.deepEqual(scrapRateGradientStops([rate, rate], 3), []);
  for (const rates of [[0, 2], [2.95, 3.05], [4, 8]]) {
    const offsets = scrapRateGradientStops(rates, 3).map(({ offset }) => offset);
    assert.ok(offsets.every((offset) => offset >= 0 && offset <= 100));
    assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b));
  }
});
