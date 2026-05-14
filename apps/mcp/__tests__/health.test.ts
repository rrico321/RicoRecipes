import { describe, expect, it } from 'vitest';

import { GET } from '../app/api/health/route';

describe('GET /api/health', () => {
  it('returns 200 with { ok: true, ts: <positive integer> }', async () => {
    const response = await GET();

    expect(response.status).toBe(200);

    const body = (await response.json()) as { ok: boolean; ts: number };
    expect(body.ok).toBe(true);
    expect(typeof body.ts).toBe('number');
    expect(Number.isInteger(body.ts)).toBe(true);
    expect(body.ts).toBeGreaterThan(0);
  });
});
