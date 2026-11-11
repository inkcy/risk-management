import type { SafetyData } from './safety';

export function listSafetyGroups(data: SafetyData): string[] {
  return Array.from(new Set([...(data.indicatorGroups ?? []), ...data.indicators.map(item => item.group)]));
}
