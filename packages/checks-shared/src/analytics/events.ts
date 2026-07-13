export enum HHMIChecksTrackEvent {
  CHECKS_UPLOAD_OPTION_TOGGLED = 'HHMI Checks Upload Option Toggled',
  CHECKS_UPLOAD_CONFIRMED = 'HHMI Checks Upload Confirmed',
  CHECKS_PAGE_VIEWED = 'HHMI Checks Page Viewed',
  CHECKS_RUN_STARTED = 'HHMI Checks Run Started',
  CHECKS_RUN_START_FAILED = 'HHMI Checks Run Start Failed',
  CHECKS_RUN_COMPLETED = 'HHMI Checks Run Completed',
  CHECKS_RUN_FAILED = 'HHMI Checks Run Failed',
  CHECKS_RUN_RETRIED = 'HHMI Checks Run Retried',
  CHECKS_REPORT_OPENED = 'HHMI Checks Report Opened',
  CHECKS_PDF_DOWNLOADED = 'HHMI Checks PDF Downloaded',
  CHECKS_PDF_REGENERATION_REQUESTED = 'HHMI Checks PDF Regeneration Requested',
  CHECKS_RESULTS_DISPLAYED = 'HHMI Checks Results Displayed',
  CHECKS_EULA_STATUS_REQUESTED = 'HHMI Checks EULA Status Requested',
  CHECKS_EULA_DIALOG_OPENED = 'HHMI Checks EULA Dialog Opened',
  CHECKS_EULA_ACCEPTED = 'HHMI Checks EULA Accepted',
  CHECKS_EULA_DECLINED = 'HHMI Checks EULA Declined',
}

export const HHMIChecksTrackEventDescriptions: Record<HHMIChecksTrackEvent, string> = {
  [HHMIChecksTrackEvent.CHECKS_UPLOAD_OPTION_TOGGLED]:
    'User enabled or disabled a check option during work upload',
  [HHMIChecksTrackEvent.CHECKS_UPLOAD_CONFIRMED]:
    'User confirmed upload with one or more checks selected for dispatch',
  [HHMIChecksTrackEvent.CHECKS_PAGE_VIEWED]: 'User viewed the work checks page',
  [HHMIChecksTrackEvent.CHECKS_RUN_STARTED]: 'A check run was started and its job was enqueued',
  [HHMIChecksTrackEvent.CHECKS_RUN_START_FAILED]:
    'A check run failed before submission (validation, missing files, EULA, etc.)',
  [HHMIChecksTrackEvent.CHECKS_RUN_COMPLETED]: 'A check run reached a terminal success state',
  [HHMIChecksTrackEvent.CHECKS_RUN_FAILED]: 'A check run reached a terminal failure state',
  [HHMIChecksTrackEvent.CHECKS_RUN_RETRIED]: 'A failed check run was retried with a new run',
  [HHMIChecksTrackEvent.CHECKS_REPORT_OPENED]:
    'User opened a text integrity viewer or Proofig report',
  [HHMIChecksTrackEvent.CHECKS_PDF_DOWNLOADED]: 'User downloaded a text integrity PDF report',
  [HHMIChecksTrackEvent.CHECKS_PDF_REGENERATION_REQUESTED]:
    'User requested regeneration of a text integrity PDF report',
  [HHMIChecksTrackEvent.CHECKS_RESULTS_DISPLAYED]:
    'Check results became visible in the checks section UI',
  [HHMIChecksTrackEvent.CHECKS_EULA_STATUS_REQUESTED]:
    'Text integrity EULA status was requested before enabling a check',
  [HHMIChecksTrackEvent.CHECKS_EULA_DIALOG_OPENED]: 'Text integrity EULA dialog was shown',
  [HHMIChecksTrackEvent.CHECKS_EULA_ACCEPTED]: 'User accepted the text integrity EULA',
  [HHMIChecksTrackEvent.CHECKS_EULA_DECLINED]: 'User closed the EULA dialog without accepting',
};
