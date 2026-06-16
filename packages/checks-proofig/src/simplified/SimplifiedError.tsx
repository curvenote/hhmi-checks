import type { ProofigStage } from '../schema.js';
import { ui } from '@curvenote/scms-core';

export function SimplifiedError({
  data,
  message = 'Error',
}: {
  data: ProofigStage;
  message?: string;
}) {
  const text = data?.error ?? message;
  return (
    <ui.SimpleAlert
      type="error"
      message={
        <>
          <span className="font-bold">Error:</span> {text}
        </>
      }
    />
  );
}
