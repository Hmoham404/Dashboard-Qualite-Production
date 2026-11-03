export const scrapTargetsByDepartment = {
  Injection: 3,
  Soudure: 0.5,
  Metallisation: 7,
  Assemblage: 3,
  Serigraphie: 3,
};

export const scrapRateColors = {
  over: '#e23d3d',
  equal: '#d8a80e',
  under: '#1e9d5b',
};

const tolerance = 0.1;

export function scrapRateStatus(rate, targetRate) {
  // Include both boundaries despite floating-point rounding (for example 3.1 - 3).
  if (Math.abs(rate - targetRate) <= tolerance + 1e-9) return 'equal';
  return rate > targetRate ? 'over' : 'under';
}

export function scrapRateGradientStops(rates, targetRate) {
  if (!rates.length) return [];
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  if (minRate === maxRate) return [];
  const offset = (boundary) => Math.max(0, Math.min(100, (maxRate - boundary) / (maxRate - minRate) * 100));
  const upper = offset(targetRate + tolerance);
  const lower = offset(targetRate - tolerance);
  // Repeated offsets give sharp color changes exactly where a straight segment
  // crosses a threshold, including when no recorded point falls in the yellow band.
  return [
    { offset: 0, color: scrapRateColors.over },
    { offset: upper, color: scrapRateColors.over },
    { offset: upper, color: scrapRateColors.equal },
    { offset: lower, color: scrapRateColors.equal },
    { offset: lower, color: scrapRateColors.under },
    { offset: 100, color: scrapRateColors.under },
  ];
}
