import type { ProofigDataSchema } from '../schema.js';
import { formatDate, ui } from '@curvenote/scms-core';
import { SimplifiedProgress } from './SimplifiedProgress.js';
import type { CheckServiceRunWithVersion } from '../routes/manuscript-checks/loadRuns.server.js';
import { FileDown } from 'lucide-react';

type RunData = {
  status?: string;
  serviceData?: ProofigDataSchema;
};

export function SimplifiedRunCard({ run }: { run: CheckServiceRunWithVersion }) {
  const runData = run.data as RunData | null | undefined;
  const proofigData = runData?.serviceData;
  const signedFiles = run.signedFiles ?? [];

  return (
    <ui.Card className="p-4">
      <div className="space-y-3">
        <div>
          <div className="text-3xl font-medium">{run.work_version.title || run.id}</div>
          <div className="text-sm text-muted-foreground">
            Last modified: {formatDate(run.date_modified, 'MMM d, yyyy h:mm a')}
          </div>
          {signedFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              {signedFiles.map((file) => (
                <a
                  key={file.signedUrl}
                  href={file.signedUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary underline hover:no-underline"
                >
                  <FileDown className="h-4 w-4 shrink-0" />
                  Download {file.name}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="pt-3 border-t">
          <SimplifiedProgress proofigData={proofigData} />
        </div>
      </div>
    </ui.Card>
  );
}
