/**
 * Minimal payload type for the submit-proofig task stub.
 * Can be extended with proofing-specific fields when implementing real logic.
 */
export type StubPayload = {
  taskId?: string;
  [key: string]: unknown;
};

/**
 * Validates payload for the stub: accepts any non-null object.
 */
export function validatePayload(payload: unknown): payload is StubPayload {
  return payload !== null && typeof payload === 'object';
}
