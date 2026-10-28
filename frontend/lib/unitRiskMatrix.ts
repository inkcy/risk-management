export type RiskType = 'clinical' | 'nonclinical';
export const unitRiskColors = {
  clinical: [['green','green','green','yellow','yellow'],['green','yellow','yellow','orange','orange'],['yellow','yellow','orange','red','red'],['orange','orange','red','red','red'],['red','red','red','red','red']],
  nonclinical: [['green','green','green','yellow','yellow'],['green','yellow','yellow','yellow','orange'],['green','yellow','orange','orange','orange'],['yellow','yellow','orange','orange','red'],['yellow','orange','orange','red','red']],
} as const;

/** Thai fiscal Q1 starts October of the preceding Gregorian year. */
export function quarterDays(buddhistYear: number, quarter: number): number {
  const year = buddhistYear - 543;
  const start = quarter === 1 ? Date.UTC(year - 1, 9, 1) : Date.UTC(year, (quarter - 2) * 3, 1);
  const end = quarter === 1 ? Date.UTC(year, 0, 1) : Date.UTC(year, (quarter - 1) * 3, 1);
  return (end - start) / 86400000;
}
export function riskFrequency(count: number, year: number, quarter: number) {
  const annualRate = count * 365.2425 / quarterDays(year, quarter);
  const column = count === 0 ? 1 : annualRate <= 1 ? 2 : annualRate <= 36 ? 3 : annualRate <= 624 ? 4 : 5;
  return { annualRate, column };
}
