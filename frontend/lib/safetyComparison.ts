export function passesSafetyTarget(value: number, target: number, comparison: string): boolean {
  if (comparison === 'lt') return value < target;
  if (comparison === 'gt') return value > target;
  if (comparison === 'lte') return value <= target;
  if (comparison === 'gte') return value >= target;
  return value === target;
}
