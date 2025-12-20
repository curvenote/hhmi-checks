import { useState } from 'react';
import { useNavigate } from 'react-router';
import { primitives, LoadingSpinner, usePingEvent } from '@curvenote/scms-core';
import checkComplianceIcon from './assets/check-compliance.svg';
import { PMCTrackEvent } from './analytics/events.js';

export function ComplianceWizardTaskCard() {
  const navigate = useNavigate();
  const pingEvent = usePingEvent();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    // Track button click
    pingEvent(PMCTrackEvent.COMPLIANCE_WIZARD_CLICKED, {}, { anonymous: true, ignoreAdmin: true });

    // Simulate a brief loading state
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Navigate to the compliance wizard
    navigate('/app/task/pmc/compliance');
  };

  return (
    <primitives.Card
      lift
      className="relative h-full p-0 transition-colors bg-white cursor-pointer border-stone-400 hover:bg-accent/50"
    >
      <button
        type="button"
        onClick={handleClick}
        className="w-full h-full px-2 py-4 cursor-pointer"
        disabled={isLoading}
      >
        <div className="flex items-center h-full gap-2 mx-2">
          <div className="flex-shrink-0">
            <img src={checkComplianceIcon} alt="Check Compliance" className="w-20 h-20" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-lg font-normal">Get Help with Open Access Policy Compliance</h3>
            <p className="text-sm text-muted-foreground">
              Planning to publish? Answer a few questions to understand HHMI and NIH open access
              policy requirements and receive guidance on next steps.
            </p>
          </div>
        </div>
      </button>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <LoadingSpinner size={32} color="text-blue-600" thickness={4} />
        </div>
      )}
    </primitives.Card>
  );
}
