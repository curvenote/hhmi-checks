import { useLoaderData } from 'react-router';
import { WorkFileUpload, ui } from '@curvenote/scms-core';
import { FILE_UPLOAD_CONFIGURATION } from '../common/fileUploadConfiguration.js';
import type { FileMetadataSection } from '@curvenote/scms-core';
import { ExternalLink } from 'lucide-react';

interface FilesSectionProps {
  cdnKey: string | null;
  readonly?: boolean;
  hideEmpty?: boolean;
  hideAlerts?: boolean;
}

export function FilesSection({
  cdnKey,
  readonly = false,
  hideEmpty = false,
  hideAlerts = false,
}: FilesSectionProps) {
  const { metadata } = useLoaderData() as { metadata: FileMetadataSection | null };

  if (!cdnKey) {
    return null;
  }

  // Helper function to get alert message for a slot
  function getSlotAlert(
    slot: string,
    fileCount: number,
    isReadonly: boolean = false,
  ): React.ReactNode | null {
    const goBackMessage = ' Go back and edit the deposit to change labels.';

    switch (slot) {
      case 'pmc/manuscript':
        return fileCount > 1 ? (
          <>
            <ui.SimpleAlert
              type="warning"
              message={`When uploading multiple manuscript files, labels should be descriptive.${isReadonly ? goBackMessage : ''}`}
              size="compact"
            />
          </>
        ) : null;
      case 'pmc/figures':
        return fileCount > 0 ? (
          <ui.SimpleAlert
            type="warning"
            message={`Labels should be descriptive when possible, mirroring how content is called out in the text (e.g. 2a, 2b)${isReadonly ? '.' + goBackMessage : ''}`}
            size="compact"
          />
        ) : null;
      case 'pmc/videos':
        return fileCount > 0 ? (
          <ui.SimpleAlert
            type="warning"
            message={
              isReadonly
                ? `Labels will be used as text for a hyperlink in the final manuscript on PMC.${goBackMessage}`
                : 'Labels will be used as text for a hyperlink in the final manuscript on PMC, please adjust as needed.'
            }
            size="compact"
          />
        ) : null;
      case 'pmc/tables':
        return fileCount > 0 ? (
          <ui.SimpleAlert
            type="warning"
            message={`Labels should be descriptive when possible, mirroring how content is called out in the text (e.g. 2a, 2b)${isReadonly ? '.' + goBackMessage : ''}`}
            size="compact"
          />
        ) : null;
      case 'pmc/supplementary':
        return fileCount > 0 ? (
          <ui.SimpleAlert
            type="warning"
            message={
              isReadonly
                ? `Labels will be used as text for a hyperlink in the final manuscript on PMC.${goBackMessage}`
                : 'Labels will be used as text for a hyperlink in the final manuscript on PMC, please adjust as needed.'
            }
            size="compact"
          />
        ) : null;
      default:
        return null;
    }
  }

  // Filter configurations based on hideEmpty prop
  const configurationsToShow = Object.values(FILE_UPLOAD_CONFIGURATION).filter((config) => {
    if (!hideEmpty) {
      return true; // Show all configurations when hideEmpty is false
    }

    // When hideEmpty is true, only show configurations that have files
    const filesForSlot = Object.values(metadata?.files ?? {}).filter(
      (file) => file.slot === config.slot,
    );
    return filesForSlot.length > 0;
  });

  return (
    <div id="files-section" className="space-y-6">
      <div>
        <h3 className="mb-2 text-lg font-medium">Files</h3>
        {!readonly && (
          <ui.SimpleAlert
            type="info"
            message={
              <span>
                Please upload your{' '}
                <span className="font-semibold">Author Accepted Manuscript (AAM)</span> in Microsoft
                Word (.docx) format. This is the author's final version that has been accepted for
                journal publication and includes all revisions resulting from the peer review
                process, including all associated{' '}
                <a
                  href="https://pmc.ncbi.nlm.nih.gov/pub/filespec-images/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex gap-0.5 items-center text-inherit"
                >
                  figures
                  <ExternalLink className="w-3 h-3" />
                </a>
                ,{' '}
                <ui.SimpleTooltip
                  title="Tables are not required to be uploaded separately from the manuscript text. They can be included in one manuscript file from where they will be extracted and the data captured during conversion, but if authors have table data as separate constituent files instead, in text, csv, Excel, Word document, or PDF files."
                  asChild={false}
                  className="max-w-[300px] text-sm"
                >
                  <span className="font-medium underline cursor-help">tables</span>
                </ui.SimpleTooltip>
                , and videos, and{' '}
                <a
                  href="https://pmc.ncbi.nlm.nih.gov/about/guidelines/#suppm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex gap-0.5 items-center text-inherit"
                >
                  supplementary files
                  <ExternalLink className="w-3 h-3" />
                </a>
                .
              </span>
            }
          />
        )}
      </div>
      <div className="p-1 space-y-2 sm:space-y-6">
        {configurationsToShow.map((config) => {
          const filesForSlot = Object.values(metadata?.files ?? {})
            .filter((file) => file.slot === config.slot)
            .sort((a, b) => {
              // Sort by order field if available, otherwise by uploadDate
              const orderA = a.order ?? 0;
              const orderB = b.order ?? 0;

              if (orderA !== orderB) {
                return orderA - orderB;
              }

              // Fallback to uploadDate if order is not available (backward compatibility)
              const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
              const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
              return dateA - dateB;
            });
          const fileCount = filesForSlot.length;
          const alertComponent = hideAlerts ? null : getSlotAlert(config.slot, fileCount, readonly);

          return (
            <div key={config.slot} className="space-y-1">
              <WorkFileUpload
                cdnKey={cdnKey}
                config={config}
                slug="pmc"
                loadedFileMetadata={metadata}
                readonly={readonly}
                icon={config.icon as 'file' | 'image' | 'video' | 'table'}
                alert={alertComponent}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
