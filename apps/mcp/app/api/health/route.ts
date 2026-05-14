// FOUND-04 smoke endpoint.
//
// Returns only `{ ok, ts }` — no version strings, no git SHA, no environment
// names (threat T-02-01: information disclosure via health endpoint).
//
// Plan 03 will curl this against a Vercel preview URL as the deploy smoke
// test. Keep the contract narrow.

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return Response.json({ ok: true, ts: Date.now() });
}
