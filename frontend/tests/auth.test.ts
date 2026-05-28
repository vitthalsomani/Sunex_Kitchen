import { describe, expect, it } from 'vitest';

// Trivial smoke test so `vitest run` exits 0 in CI.
describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
