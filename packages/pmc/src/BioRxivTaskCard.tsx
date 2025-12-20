import { useFetcher } from 'react-router';
import { primitives, LoadingSpinner, usePingEvent } from '@curvenote/scms-core';
import bioRxivGraphic from './assets/bioRxiv-favicon.svg';
import { PMCTrackEvent } from './analytics/events.js';

type ActionData = { error?: string } | undefined;

export function BioRxivTaskCard() {
  const fetcher = useFetcher<ActionData>();
  const pingEvent = usePingEvent();
  const isSubmitting = fetcher.state !== 'idle';

  return (
    <a
      href="https://www.biorxiv.org/submit-a-manuscript"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        pingEvent(
          PMCTrackEvent.COMPLIANCE_WIZARD_BIORXIV_CLICKED,
          {
            url: 'https://www.biorxiv.org/submit-a-manuscript',
          },
          { anonymous: true, ignoreAdmin: true },
        );
      }}
    >
      <primitives.Card
        lift
        className="p-4 border-stone-400 min-h-[120px] transition-colors relative w-[360px] not-prose"
        validateUsing={fetcher}
      >
        <button
          type="submit"
          className="absolute inset-0 w-full h-full cursor-pointer hover:bg-accent/50"
          disabled={isSubmitting}
        >
          <div className="flex items-center h-full gap-4 ml-3 mr-2">
            <div className="flex-shrink-0">
              <img src={bioRxivGraphic} alt="bioRxiv logo" className="w-20 h-20" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-lg font-normal">Submit to bioRXiv</h3>
              <p className="text-sm text-muted-foreground line-clamp-3">
                Visit bioRxiv to learn about preprint submissions and start the process.
              </p>
            </div>
          </div>
        </button>
        {isSubmitting && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <LoadingSpinner size={32} color="text-blue-600" thickness={4} />
          </div>
        )}
      </primitives.Card>
    </a>
  );
}
