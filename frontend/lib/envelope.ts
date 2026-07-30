import type { Envelope } from './types';
import { dbConfigured } from './db';

export async function envelope<T>(
  loader: () => Promise<T>,
  fallback: T,
): Promise<Envelope<T>> {
  if (!dbConfigured()) {
    return { data: fallback, demo: true, error: 'POSTGRES_URL is not set — showing demo data' };
  }
  try {
    const data = await loader();
    return { data, demo: false, error: null };
  } catch (err) {
    console.error('DB query failed:', err);
    return { data: fallback, demo: true, error: String(err) };
  }
}
