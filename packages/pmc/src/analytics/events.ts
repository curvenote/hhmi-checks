export enum PMCTrackEvent {
  PMC_DEPOSIT_CREATED = 'PMC Deposit Created',
  PMC_DEPOSIT_PREVIEWED = 'PMC Deposit Previewed',
  PMC_DEPOSIT_CONFIRMED = 'PMC Deposit Confirmed',
  PMC_DOI_LOOKUP_SUCCEEDED = 'PMC DOI Lookup Succeeded',
  PMC_DOI_LOOKUP_FAILED = 'PMC DOI Lookup Failed',
  // Wizard flow events
  COMPLIANCE_WIZARD_CLICKED = 'PMC Compliance Wizard Clicked',
  COMPLIANCE_WIZARD_STARTED = 'PMC Compliance Wizard Started',
  COMPLIANCE_WIZARD_COMPLETED = 'PMC Compliance Wizard Completed',
  COMPLIANCE_WIZARD_RESTARTED = 'PMC Compliance Wizard Restarted',
  COMPLIANCE_WIZARD_FINISHED = 'PMC Compliance Wizard Finished',

  // Question interaction events
  COMPLIANCE_WIZARD_QUESTION_ANSWERED = 'PMC Compliance Wizard Question Answered',
  COMPLIANCE_WIZARD_QUESTION_CHANGED = 'PMC Compliance Wizard Question Changed',

  // Outcome action events
  COMPLIANCE_WIZARD_OUTCOME_VIEWED = 'PMC Compliance Wizard Outcome Viewed',
  COMPLIANCE_WIZARD_BIORXIV_CLICKED = 'PMC Compliance Wizard BioRxiv Link Clicked',
  COMPLIANCE_WIZARD_PMC_DEPOSIT_CLICKED = 'PMC Compliance Wizard PMC Deposit Clicked',
  COMPLIANCE_WIZARD_HELP_LINK_CLICKED = 'PMC Compliance Wizard Help Link Clicked',

  COMPLIANCE_WIZARD_CONFIRM_USEFUL = 'PMC Compliance Wizard Confirmed Useful',
  COMPLIANCE_WIZARD_CONFIRM_NEED_HELP = 'PMC Compliance Wizard Confirmed Need Help',
  COMPLIANCE_WIZARD_HELP_REQUEST_SUBMITTED = 'PMC Compliance Wizard Help Request Submitted',
}

export const PMCTrackEventDescriptions: Record<PMCTrackEvent, string> = {
  [PMCTrackEvent.PMC_DEPOSIT_CREATED]: 'PMC deposit work created',
  [PMCTrackEvent.PMC_DEPOSIT_PREVIEWED]: 'PMC deposit previewed before submission',
  [PMCTrackEvent.PMC_DEPOSIT_CONFIRMED]: 'PMC deposit confirmed and submitted',
  [PMCTrackEvent.PMC_DOI_LOOKUP_SUCCEEDED]: 'DOI lookup succeeded for PMC deposit',
  [PMCTrackEvent.PMC_DOI_LOOKUP_FAILED]: 'DOI lookup failed for PMC deposit',
  [PMCTrackEvent.COMPLIANCE_WIZARD_CLICKED]:
    'User clicked the compliance wizard task card button on dashboard',
  [PMCTrackEvent.COMPLIANCE_WIZARD_STARTED]: 'User started the PMC compliance wizard page',
  [PMCTrackEvent.COMPLIANCE_WIZARD_COMPLETED]:
    'User completed the PMC compliance wizard; only tracks the first completion after wizard start, does not fire again after restart',
  [PMCTrackEvent.COMPLIANCE_WIZARD_RESTARTED]:
    'User clicked the Start Over button in PMC compliance wizard',
  [PMCTrackEvent.COMPLIANCE_WIZARD_FINISHED]: 'User clicked Finish button in PMC compliance wizard',

  [PMCTrackEvent.COMPLIANCE_WIZARD_QUESTION_ANSWERED]:
    'User answered a question in the PMC compliance wizard',
  [PMCTrackEvent.COMPLIANCE_WIZARD_QUESTION_CHANGED]:
    'User changed an answer in the PMC compliance wizard',

  [PMCTrackEvent.COMPLIANCE_WIZARD_OUTCOME_VIEWED]:
    'User viewed compliance outcomes; fires every time outcomes change during the wizard session',
  [PMCTrackEvent.COMPLIANCE_WIZARD_BIORXIV_CLICKED]: 'User clicked on BioRxiv submission link',
  [PMCTrackEvent.COMPLIANCE_WIZARD_PMC_DEPOSIT_CLICKED]: 'User clicked on PMC deposit task card',
  [PMCTrackEvent.COMPLIANCE_WIZARD_HELP_LINK_CLICKED]: 'User clicked on help link',

  [PMCTrackEvent.COMPLIANCE_WIZARD_CONFIRM_USEFUL]:
    'After completing the wizard, user confirmed the wizard was useful',
  [PMCTrackEvent.COMPLIANCE_WIZARD_CONFIRM_NEED_HELP]:
    'After completing the wizard, user confirmed they stil needed help',
  [PMCTrackEvent.COMPLIANCE_WIZARD_HELP_REQUEST_SUBMITTED]:
    'User submitted a help request form after indicating they needed help',
};
