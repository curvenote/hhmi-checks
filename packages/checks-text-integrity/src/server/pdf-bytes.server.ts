/**
 * Returns a standalone copy of PDF bytes for hashing and storage writes.
 * Use Uint8Array (not Buffer.slice) so the backing ArrayBuffer matches byteLength.
 */
export function boundedPdfBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}
