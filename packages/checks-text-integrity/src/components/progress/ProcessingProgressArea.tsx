import { useEffect, useState } from 'react';
import { cn, ui } from '@curvenote/scms-core';
import { StageProgressArea } from './StageProgressArea.js';

const LEAVE_HINT_DELAY_MS = 10_000;

export function ProcessingProgressArea() {
  const [showLeaveHint, setShowLeaveHint] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setShowLeaveHint(true), LEAVE_HINT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="info"
        message={
          <div>
            <p className={cn('mt-0', { 'mb-0': false })}>
              <span className="font-bold">Processing your submission...</span> Your documents are
              being analysed and large files may take longer to process.
            </p>
            {showLeaveHint ? (
              <p className="mb-0">
                You can leave this page and come back later to view the results.
              </p>
            ) : null}
          </div>
        }
      />
      <StageProgressArea step={3} numSteps={3} message="This may take several minutes…" />
    </div>
  );
}
