export enum HHMITrackEvent {
  HHMI_COMPLIANCE_SCIENTIST_SELECTED = 'HHMI Compliance Scientist Selected',
  HHMI_COMPLIANCE_FILTER_APPLIED = 'HHMI Compliance Filter Applied',
  HHMI_COMPLIANCE_POLICY_OPENED = 'HHMI Compliance Policy URL Opened',
  HHMI_COMPLIANCE_PUBLICATION_MODAL_OPENED = 'HHMI Compliance Publication Modal Opened',
  HHMI_COMPLIANCE_PMC_LINK_CLICKED = 'HHMI Compliance PMC Link Clicked',
  HHMI_COMPLIANCE_PUBMED_LINK_CLICKED = 'HHMI Compliance PubMed Link Clicked',
  HHMI_COMPLIANCE_DOI_LINK_CLICKED = 'HHMI Compliance DOI Link Clicked',
  HHMI_COMPLIANCE_URL_LINK_CLICKED = 'HHMI Compliance URL Link Clicked',
  HHMI_COMPLIANCE_ENHANCED_PMC_LINK_CLICKED = 'HHMI Compliance Enhanced PMC Link Clicked',
  HHMI_COMPLIANCE_ENHANCED_PREPRINT_LINK_CLICKED = 'HHMI Compliance Enhanced Preprint Link Clicked',
  HHMI_COMPLIANCE_PUBLICATION_MODAL_CLOSED = 'HHMI Compliance Publication Modal Closed',
  HHMI_COMPLIANCE_REPORT_SHARED = 'HHMI Compliance Report Shared',
  HHMI_COMPLIANCE_REPORT_ACCESS_REVOKED = 'HHMI Compliance Report Access Revoked',
  HHMI_COMPLIANCE_REPORT_HIDDEN = 'HHMI Compliance Report Hidden',
  HHMI_COMPLIANCE_REPORT_SHARE_CLICKED = 'HHMI Compliance Share Report Clicked',
  HHMI_COMPLIANCE_REPORT_SHARE_MODAL_CLOSED = 'HHMI Compliance Share Report Modal Closed',
  HHMI_COMPLIANCE_ACCESS_GRANTS_VIEWED = 'HHMI Compliance Access Grants Viewed',
  HHMI_COMPLIANCE_HELP_MODAL_CLOSED = 'HHMI Compliance Help Modal Closed',
  HHMI_COMPLIANCE_HELP_REQUESTED = 'HHMI Compliance Help Requested',
  HHMI_COMPLIANCE_REPORT_TASK_CLICKED = 'HHMI Compliance Report Task Card Clicked',
  HHMI_COMPLIANCE_ROLE_QUALIFIED = 'HHMI Compliance Role Qualified',
}

export const HHMITrackEventDescriptions: Record<HHMITrackEvent, string> = {
  [HHMITrackEvent.HHMI_COMPLIANCE_SCIENTIST_SELECTED]:
    'User selected a scientist for compliance review',
  [HHMITrackEvent.HHMI_COMPLIANCE_FILTER_APPLIED]: 'User applied a filter in HHMI compliance list',
  [HHMITrackEvent.HHMI_COMPLIANCE_POLICY_OPENED]: 'User opened the HHMI policy URL',
  [HHMITrackEvent.HHMI_COMPLIANCE_PMC_LINK_CLICKED]: 'User clicked on a PMC link',
  [HHMITrackEvent.HHMI_COMPLIANCE_PUBMED_LINK_CLICKED]: 'User clicked on a PubMed link',
  [HHMITrackEvent.HHMI_COMPLIANCE_DOI_LINK_CLICKED]: 'User clicked on a DOI link',
  [HHMITrackEvent.HHMI_COMPLIANCE_URL_LINK_CLICKED]: 'User clicked on a URL link',
  [HHMITrackEvent.HHMI_COMPLIANCE_ENHANCED_PMC_LINK_CLICKED]:
    'User clicked on an enhanced PMC link',
  [HHMITrackEvent.HHMI_COMPLIANCE_ENHANCED_PREPRINT_LINK_CLICKED]:
    'User clicked on an enhanced preprint link',
  [HHMITrackEvent.HHMI_COMPLIANCE_PUBLICATION_MODAL_CLOSED]:
    'User closed the publication details modal',
  [HHMITrackEvent.HHMI_COMPLIANCE_REPORT_SHARE_MODAL_CLOSED]: 'User closed the share report modal',
  [HHMITrackEvent.HHMI_COMPLIANCE_HELP_MODAL_CLOSED]: 'User closed the help request modal',
  [HHMITrackEvent.HHMI_COMPLIANCE_HELP_REQUESTED]: 'User requested help or support',
  [HHMITrackEvent.HHMI_COMPLIANCE_REPORT_SHARED]: 'Compliance report shared with another user',
  [HHMITrackEvent.HHMI_COMPLIANCE_REPORT_ACCESS_REVOKED]: 'Access to compliance report revoked',
  [HHMITrackEvent.HHMI_COMPLIANCE_REPORT_HIDDEN]: 'User hid their compliance report',
  [HHMITrackEvent.HHMI_COMPLIANCE_ACCESS_GRANTS_VIEWED]:
    'Admin viewed access grants for a scientist compliance report',
  [HHMITrackEvent.HHMI_COMPLIANCE_PUBLICATION_MODAL_OPENED]:
    'User opened the publication modal via article title',
  [HHMITrackEvent.HHMI_COMPLIANCE_REPORT_SHARE_CLICKED]:
    'User clicked the share this report button',
  [HHMITrackEvent.HHMI_COMPLIANCE_REPORT_TASK_CLICKED]:
    'User clicked the compliance report task card from dashboard',
  [HHMITrackEvent.HHMI_COMPLIANCE_ROLE_QUALIFIED]:
    'User qualified their compliance role (scientist or lab-manager)',
};
