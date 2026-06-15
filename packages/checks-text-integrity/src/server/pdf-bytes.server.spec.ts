// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';
import { boundedPdfBytes } from './pdf-bytes.server.js';

describe('boundedPdfBytes', () => {
  it('copies a standalone array for an exact-sized Uint8Array', () => {
    const buf = new Uint8Array([1, 2, 3]);
    const bounded = boundedPdfBytes(buf);
    expect(bounded).not.toBe(buf);
    expect(bounded.byteLength).toBe(3);
    expect(bounded.buffer.byteLength).toBe(3);
  });

  it('copies a subarray so buffer length matches PDF bytes (Node pool case)', () => {
    const pooled = Buffer.allocUnsafe(8192);
    pooled.fill(0xff);
    const view = pooled.subarray(0, 100);
    view.fill(0xab);

    const bounded = boundedPdfBytes(view);
    expect(bounded.byteLength).toBe(100);
    expect(bounded.buffer.byteLength).toBe(100);
    expect([...bounded].every((b) => b === 0xab)).toBe(true);
  });
});
