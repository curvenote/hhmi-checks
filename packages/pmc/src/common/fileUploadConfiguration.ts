import type { FileUploadConfig } from '@curvenote/scms-core';

export const FILE_UPLOAD_CONFIGURATION: Record<string, FileUploadConfig> = {
  'pmc/manuscript': {
    slot: 'pmc/manuscript',
    label: 'Manuscript',
    icon: 'file',
    description: `Upload your author accepted manuscript in Microsoft Word (.doc, .docx) format. This is the author's final version that has been accepted for journal publication and includes all revisions resulting from the peer review process, including all associated tables, graphics, and supplemental material.`,
    optional: false,
    multiple: true,
    maxFiles: 100,
    hideFileCount: true,
    accept:
      '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize: 500 * 1024 * 1024, // 500MB
    requireLabel: true,
  },
  ['pmc/figures']: {
    slot: 'pmc/figures',
    label: 'Figures',
    icon: 'image',
    description:
      'Upload your figure files (.jpg, .jpeg, .png, .tiff, .tif, .eps, .svg, .pdf, .ai). These should only include figures referenced in the main manuscript.',
    optional: true,
    multiple: true,
    accept: '.jpg,.jpeg,.png,.tiff,.tif,.eps,.svg,.pdf,.ai',
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/svg+xml',
      'application/postscript',
      'application/pdf',
      'image/ai',
    ],
    maxSize: 500 * 1024 * 1024, // 500MB
    hideFileCount: true,
    maxFiles: 100,
    requireLabel: true,
  },
  'pmc/tables': {
    slot: 'pmc/tables',
    label: 'Tables',
    icon: 'table',
    description:
      'Upload your table files (.xls, .xlsx, .csv, .txt, .doc, .docx, .pdf), these should only include tables referenced in the main manuscript.',
    optional: true,
    multiple: true,
    accept: '.xls,.xlsx,.csv,.txt,.doc,.docx,.pdf',
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
    ],
    maxSize: 500 * 1024 * 1024, // 500MB
    hideFileCount: true,
    maxFiles: 100,
    requireLabel: true,
  },
  'pmc/videos': {
    slot: 'pmc/videos',
    label: 'Videos',
    icon: 'video',
    description:
      'Upload your video files (.mp4, .mov, .avi, .wmv), these will be accessible via links in the PMC article',
    optional: true,
    multiple: true,
    accept: '.mp4,.mov,.avi,.wmv',
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'],
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    hideFileCount: true,
    maxFiles: 100,
    requireLabel: true,
  },
  'pmc/supplementary': {
    slot: 'pmc/supplementary',
    label: 'Supplementary Material',
    icon: 'file',
    description:
      'Upload any supplementary files referenced in your manuscript including supplementary tables and figures.',
    optional: true,
    multiple: true,
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    hideFileCount: true,
    maxFiles: 100,
    requireLabel: true,
  },
};
