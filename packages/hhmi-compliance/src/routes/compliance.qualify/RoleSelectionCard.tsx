import { useFetcher } from 'react-router';
import { ui, LoadingSpinner, type GeneralError } from '@curvenote/scms-core';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface RoleSelectionCardProps {
  role: 'scientist' | 'lab-manager';
  title: string;
  description: string;
  icon: LucideIcon;
}

export function RoleSelectionCard({
  role,
  title,
  description,
  icon: Icon,
}: RoleSelectionCardProps) {
  const fetcher = useFetcher<{ error?: GeneralError | { message: string } }>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Optimistic UI: show busy state immediately
  useEffect(() => {
    if (fetcher.state === 'submitting') {
      setIsSubmitting(true);
    }
  }, [fetcher.state]);

  // Handle errors
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.error) {
        setIsSubmitting(false);
        let errorMessage: string;
        if (typeof fetcher.data.error === 'string') {
          errorMessage = fetcher.data.error;
        } else if (
          fetcher.data.error &&
          typeof fetcher.data.error === 'object' &&
          'message' in fetcher.data.error
        ) {
          errorMessage = fetcher.data.error.message;
        } else {
          errorMessage = 'An error occurred. Please try again.';
        }
        ui.toastError(errorMessage);
      }
    }
  }, [fetcher.state, fetcher.data]);

  const isBusy = fetcher.state !== 'idle' || isSubmitting;
  const disabled = isBusy;

  return (
    <fetcher.Form method="POST" className="h-full">
      <input type="hidden" name="role" value={role} />
      <button type="submit" disabled={disabled} className="w-full h-full text-left">
        <ui.Card
          className={`h-full p-6 transition-all hover:shadow hover:border-primary/50 cursor-pointer border-2 hover:scale-[1.01] lg:py-10 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'
          }`}
        >
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="p-4 rounded-full bg-primary/10">
              {isBusy ? (
                <LoadingSpinner size={32} className="text-primary" />
              ) : (
                <Icon className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </ui.Card>
      </button>
    </fetcher.Form>
  );
}
