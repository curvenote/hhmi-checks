import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePingEvent, LoadingSpinner, primitives } from '@curvenote/scms-core';
import { HHMITrackEvent } from './analytics/events.js';
import myOpenAccessComplianceIcon from './assets/my-compliance-lock.svg';

export function ComplianceReportTaskCard() {
  const navigate = useNavigate();
  const pingEvent = usePingEvent();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    // Track button click
    pingEvent(
      HHMITrackEvent.HHMI_COMPLIANCE_REPORT_TASK_CLICKED,
      {},
      { anonymous: true, ignoreAdmin: true },
    );

    // Simulate a brief loading state
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Navigate to the compliance dashboard
    navigate('/app/compliance');
  };

  return (
    <primitives.Card
      lift
      className="relative p-0 h-full bg-white transition-colors cursor-pointer border-stone-400 hover:bg-accent/50"
    >
      <button
        type="button"
        onClick={handleClick}
        className="px-2 py-4 w-full h-full cursor-pointer"
        disabled={isLoading}
      >
        <div className="flex gap-0 items-center mx-2 h-full">
          <div className="flex-shrink-0">
            <img src={myOpenAccessComplianceIcon} alt="Check Compliance" className="w-20 h-20" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-lg font-normal">View Your Open Access Compliance</h3>
            <p className="text-sm text-muted-foreground">
              See the current status of your preprints and journal articles in relation to HHMI's
              open access policies.
            </p>
          </div>
        </div>
      </button>
      {isLoading && (
        <div className="flex absolute inset-0 justify-center items-center bg-white/80">
          <LoadingSpinner size={32} color="text-blue-600" thickness={4} />
        </div>
      )}
    </primitives.Card>
  );
}
