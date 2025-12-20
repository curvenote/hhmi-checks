// Generated compliance wizard configuration
// Generated on: 2025-09-30T10:49:54.689Z
// Source files: compliance-simplified.csv, compliance-next-steps.csv
// This file is auto-generated. Do not edit manually.
// Total unique mappings: 100
// Total outcomes defined: 15 (includes fallback outcome)
// Publishing stage options found: 5 (data-driven)

import type { ComplianceWizardConfig } from './complianceTypes.js';

export const complianceWizardConfig: ComplianceWizardConfig = {
  questions: {
    hhmiPolicy: {
      id: 'hhmiPolicy',
      title: "Is this article subject to HHMI's publication policies?",
      description:
        "An article is subject to [HHMI's publication policies](https://www.hhmi.org/about/policies/publishing-sharing) if:\n   1. the paper describes novel results, protocols, or methods, and is not a review, book chapter, commentary, perspective, or similar; and\n   2. an HHMI lab head or lab member is a (co)first, (co)last, or (co)corresponding author.",
      type: 'boolean',
      options: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' },
      ],
    },
    nihPolicy: {
      id: 'nihPolicy',
      title: 'Is this article subject to the 2024 NIH Public Access Policy?',
      description:
        'If you are unsure whether the 2024 NIH Public Access Policy applies, please contact your host institution or collaborators, if applicable, for assistance.',
      type: 'boolean',
      options: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' },
      ],
    },
    publishingStage: {
      id: 'publishingStage',
      title: 'Where are you in the publishing process?',
      type: 'vertical',
      options: [
        { value: 'preprint_ready', label: 'I am ready to submit a preprint to a preprint server' },
        {
          value: 'no_preprint_2025',
          label:
            'I have not published a preprint, and my manuscript was or will be submitted to a journal in 2025',
        },
        {
          value: 'no_preprint_2026',
          label:
            'I have not published a preprint, and my manuscript was or will be submitted to a journal in 2026 or later',
        },
        {
          value: 'preprint_submitted_2025',
          label:
            'I have already published a preprint, and my manuscript was or will be submitted to a journal in 2025',
        },
        {
          value: 'preprint_submitted_2026',
          label:
            'I have already published a preprint, and my manuscript was or will be submitted to a journal in 2026 or later',
        },
      ],
    },
    openAccess: {
      id: 'openAccess',
      title: 'Do you plan to publish this paper open access at a journal?',
      description:
        '__HHMI does not require you to select an open access option__, but letting us know which option you plan to choose will allow us to support you with the next steps for compliance. "Open access" means the text will be freely available to read on the journal website, without a paywall, immediately upon publication (no embargo). In most cases, this requires paying the journal an open access fee.',
      type: 'radio',
      options: [
        { value: 'open', label: 'Yes (free to read)', icon: 'open-access', iconAlt: 'Open Access' },
        {
          value: 'closed',
          label: 'No (paywalled article)',
          icon: 'closed-access',
          iconAlt: 'Closed Access',
        },
        {
          value: 'uncertain_oa',
          label: "I'm not sure",
          subLabel: 'or I am here to receive guidance on this decision',
        },
      ],
    },
    ccLicense: {
      id: 'ccLicense',
      title: 'Is the paper being published with a CC BY license?',
      type: 'radio',
      wide: true,
      conditional: "openAccess == 'open'",
      options: [
        { value: 'cc_by', label: 'Yes (CC-BY)', icon: 'cc-by', iconAlt: 'CC-BY License' },
        {
          value: 'cc_other',
          label: 'No (other license)',
          icon: 'cc-other',
          iconAlt: 'Other License',
        },
        {
          value: 'uncertain_license',
          label: "I'm not sure",
          subLabel: 'or I am here to receive guidance on this decision',
        },
      ],
    },
  },
  questionOrder: ['hhmiPolicy', 'nihPolicy', 'publishingStage', 'openAccess', 'ccLicense'],
  outcomes: {
    not_sure_contact_oapolicy: {
      id: 'not_sure_contact_oapolicy',
      title: 'Please contact the OA Support team',
      type: 'advice',
      subType: 'info',
      text: `It is not clear how to proceed in your case, please contact the OA Support team at oapolicy@hhmi.org.`,
    },
    explain_that_they_can_either_contact_the_journal_to_change_license_to_ccby_or_publish_initial_and_revised_preprints:
      {
        id: 'explain_that_they_can_either_contact_the_journal_to_change_license_to_ccby_or_publish_initial_and_revised_preprints',
        title: 'Change license or publish preprints',
        type: 'advice',
        subType: 'info',
        text: `Based on the information you provided, you have the option to comply with either HHMI's 2022 Open Access to Publications policy or HHMI's 2026 Immediate Access to Research policy. Choose one of the following: 
1. Choose CC-BY as the license for the journal article (or, if you already selected a different license, contact the journal to change the license to CC-BY). You can find out which license you selected by checking the license agreement that you signed. The license agreement should include "Creative Commons Attribution 4.0 International License," "CC-BY," or similar language. It should not display licenses with additional restrictions such as CC-BY-NC, CC-BY-NC-SA, CC-BY-ND, or CC-BY-NC-ND. 
2. If the journal article is not yet published, you can instead publish initial and revised preprints of your manuscript on a preprint server. 
 
If you choose the preprint option, bioRxiv is the preferred designated preprint server for HHMI articles. Articles that are out of scope for bioRxiv can be published on medRxiv (clinical medicine), ChemRxiv, (chemistry) or arXiv (computer science and physics). When you are asked to choose a license, choose CC-BY. Then, when you revise your manuscript based on peer feedback or new results or analysis, return to the preprint server and publish a revised version under a CC-BY license. At least one revised preprint version is required before the article appears in a journal.`,
      },
    contact_the_journal_to_change_license_to_ccby: {
      id: 'contact_the_journal_to_change_license_to_ccby',
      title: 'Contact The Journal To Change License To CC-BY',
      type: 'advice',
      subType: 'info',
      text: `Based on the information you provided, we recommend that you follow HHMI's 2022 Open Access to Publications policy. To comply with this policy, you should choose CC-BY as the license for the journal article (or, if you have already made your license selection, contact the journal to change the license to CC-BY). You can verify that you have selected the correct license by checking the license agreement that you signed. The license agreement should include "Creative Commons Attribution 4.0 International License," "CC-BY," or similar language. It should not display licenses with additional restrictions such as CC-BY-NC, CC-BY-NC-SA, CC-BY-ND, or CC-BY-NC-ND.`,
    },
    figure_out_oa_status_and_come_back_later: {
      id: 'figure_out_oa_status_and_come_back_later',
      title: 'Determine open access status',
      type: 'advice',
      subType: 'info',
      text: `Based on the information you provided, your next steps for compliance will depend on whether you selected or plan to select an open access publishing option at the journal. **HHMI does not require you to select an open access option**, but letting us know which option you plan to choose will allow us to support you with PubMed Central submission if needed. Once you determine which option you chose or plan to choose at the journal, you can modify your responses above to receive guidance on next steps. 
 
If you have already submitted your paper to a journal, you can determine the open access status of your paper by contacting the person who made the submission and/or handled any fees associated with this submission. If the journal charged an open access fee and you have paid or plan to pay this fee, you should select "yes" for the open access question above. 
 
For additional support about choosing an open access status for your paper, please contact the HHMI Open Science Team at oapolicy@hhmi.org. 
 
Here is a list of common journals selected by HHMI labs, along with their type. See the definitions and next steps for each journal type below. **HHMI does not require you to select an open access journal**, but the next steps for compliance will depend on whether the journal offers open access publishing options. 
 
<iframe class="airtable-embed" src="https://airtable.com/embed/appuBoDw7bAfzfyK4/shr3YGK805ls7260u?viewControls=on" frameborder="0" onmousewheel="" width="100%" height="533" style="background: transparent; border: 1px solid #ccc;"></iframe> 
 
**Open access journals** publish all content on an open access basis (free to read). The Directory of Open Access Journals (DOAJ) hosts a community-curated list of open access journals: https://doaj.org/ If the journal in which you plan to publish is open access, you should select "yes" for the open access question above. 
 
HHMI lab budgets can be used to pay open access fees at open access journals. 
 
**Transformative journals** publish both subscription and open access content. Their publishers have publicly committed to transitioning to full open access by (a) gradually increasing the share of open access content in their journals and (b) offsetting subscription income with payments for publishing services. If the journal in which you plan to publish is transformative and you have paid or plan to pay an open access fee, you should select "yes" for the open access question above. If you plan to publish under the subscription option, you should select "no." 
 
HHMI lab budgets can be used to pay open access fees at transformative journals for papers submitted on or before December 31, 2025. 
 
**Hybrid journals** publish both subscription and open access content but have not publicly committed to transitioning to full open access. If the journal in which you plan to publish is hybrid and you have paid or plan to pay an open access fee, you should select "yes" for the open access question above. If you plan to publish under the subscription option, you should select "no." 
 
HHMI lab budgets cannot be used to pay open access fees at hybrid journals, but can be used to pay other types of fees at these journals (e.g., page/color charges). 
 
**Subscription journals** publish articles behind a paywall and under a restrictive "rights reserved" license to control access to their articles. If the journal in which you plan to publish is a subscription journal, you should select "no" for the open access question above. 
 
Subscription journals do not have open access fees, but HHMI lab budgets can be used to pay other types of fees at these journals (e.g., page/color charges).`,
    },
    figure_out_license_and_come_back_later: {
      id: 'figure_out_license_and_come_back_later',
      title: 'Determine license choice',
      type: 'advice',
      subType: 'info',
      text: `Based on the information you provided, your next steps for compliance will depend on which license you selected or plan to select. 
 
If you plan to comply with HHMI's 2022 Open Access to Publications policy, you should choose CC-BY as the license for the journal article. To verify which license you selected, visit the journal submission portal to determine which option you chose for this submission, or check the license agreement that you signed. The license agreement should include "Creative Commons Attribution 4.0 International License," "CC-BY," or similar language. It should not display licenses with additional restrictions such as CC-BY-NC, CC-BY-NC-SA, CC-BY-ND, or CC-BY-NC-ND. 
 
If you have already selected or plan to select a license other than CC-BY, you can modify your responses above to receive guidance on next steps. 
 
For additional support about choosing a license, please contact the HHMI Open Science Team at oapolicy@hhmi.org.`,
    },
    no_action_needed_already_compliant: {
      id: 'no_action_needed_already_compliant',
      title: 'No action needed',
      type: 'advice',
      subType: 'reminder',
      text: `Based on the information you provided, your publication plan for this paper meets the requirements of the current open access policy(ies) that you indicated apply. No further action should be needed to meet these requirements if you have selected or will select the open access options you indicated here and, if you are located at a host institution, have confirmed with your host institution that your publication complies with all NIH and other policies and requirements applicable to them.

Journals typically deposit papers to PubMed Central when authors select an open access publishing option. If your publication is subject to the 2024 NIH Public Access Policy (as in effect on September 24, 2025), remember to confirm that the journal has done this.`,
    },
    no_action_needed_not_subject_to_either_policy: {
      id: 'no_action_needed_not_subject_to_either_policy',
      title: 'No action needed',
      type: 'advice',
      subType: 'success',
      text: `Based on the information you provided, this paper is not subject to the current HHMI open access or NIH public access policies. No further action should be needed.`,
    },
    no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend: {
      id: 'no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend',
      title: 'No action needed, no recommendations',
      type: 'advice',
      subType: 'success',
      text: `Based on the information you provided, this paper is not subject to the current HHMI open access or NIH public access policies. No further action should be needed.`,
    },
    proceed_to_biorxiv_submission: {
      id: 'proceed_to_biorxiv_submission',
      title: 'Submit to bioRxiv',
      type: 'advice',
      subType: 'info',
      text: `Based on the information you provided, we recommend that you follow HHMI's 2026 Immediate Access to Research policy. The next step is to publish a preprint of your manuscript. bioRxiv is the preferred designated preprint server for HHMI articles. Articles that are out of scope for bioRxiv can be published on medRxiv (clinical medicine), ChemRxiv, (chemistry) or arXiv (computer science and physics). When you are asked to choose a license, choose CC-BY.`,
    },
    optional_proceed_to_biorxiv_submission: {
      id: 'optional_proceed_to_biorxiv_submission',
      title: 'Optional: Submit to bioRxiv',
      type: 'advice',
      subType: 'optional',
      text: `Optional: If your paper reports original research and has not been published in a journal at this stage, you may consider publishing a preprint of your manuscript. bioRxiv is the preferred designated preprint server for HHMI articles. Articles that are out of scope for bioRxiv can be published on medRxiv (clinical medicine), ChemRxiv, (chemistry) or arXiv (computer science and physics). We also recommend choosing a CC-BY license for maximum accessibility, reuse, and distribution of your discovery.`,
    },
    reminder_to_publish_revised_preprints: {
      id: 'reminder_to_publish_revised_preprints',
      title: 'Publish revised preprints',
      type: 'advice',
      subType: 'reminder',
      text: `To comply with HHMI's 2026 Immediate Access to Research policy, remember to publish revised versions of your preprint. When you revise your manuscript based on peer feedback or new results or analysis, return to the preprint server and publish a revised version under a CC-BY license. At least one revised preprint version is required before the article appears in a journal.`,
    },
    reminder_to_come_back_later_to_submit_to_pmc: {
      id: 'reminder_to_come_back_later_to_submit_to_pmc',
      title: 'Submit to PMC later',
      type: 'advice',
      subType: 'reminder',
      text: `After you have completed any previous steps, when your manuscript is accepted by a journal, remember to return here to submit your accepted manuscript to PubMed Central. We will help you make this submission and apply a CC-BY license to your manuscript.`,
    },
    optional_reminder_to_come_back_later_to_submit_to_pmc: {
      id: 'optional_reminder_to_come_back_later_to_submit_to_pmc',
      title: 'Optional: Submit to PMC later',
      type: 'advice',
      subType: 'optional',
      text: `Optional: When your manuscript is accepted by a journal, you may consider returning here to submit your accepted manuscript to PubMed Central. We will help you make this submission and apply a CC-BY license to your manuscript for maximum accessibility, reuse, and distribution of your discovery.`,
    },
    proceed_to_pmc_submission_hhmi_and_nih: {
      id: 'proceed_to_pmc_submission_hhmi_and_nih',
      title: 'Proceed To PMC Submission',
      type: 'advice',
      subType: 'info',
      text: `Based on the information you provided and the 2025 submission date, submitting your accepted manuscript to PubMed Central is the simplest action that should satisfy the open access requirements of both the 2024 NIH Public Access Policy and HHMI's 2022 Open Access to Publications policy. Please remember that, if you are located at an HHMI host institution, you should always verify all policy requirements with your host institution and other funders.

Proceed to the next screen where we will help you make this submission and apply a CC-BY license to your manuscript.`,
    },
    proceed_to_pmc_submission_nih: {
      id: 'proceed_to_pmc_submission_nih',
      title: 'Proceed To PMC Submission',
      type: 'advice',
      subType: 'info',
      text: `Based on the information you provided, we recommend that you submit your accepted manuscript to PubMed Central. Please remember that, if you are located at an HHMI host institution, you should always verify all policy requirements with your host institution and other funders.

Proceed to the next screen where we will help you make this submission.`,
    },
  },
  logic: {
    default: ['not_sure_contact_oapolicy'],
    explicit_mappings: {
      'true,true,preprint_ready,open,cc_by': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,true,preprint_ready,open,cc_other': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,true,preprint_ready,open,uncertain_license': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,true,preprint_ready,closed,null': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
        'reminder_to_come_back_later_to_submit_to_pmc',
      ],
      'true,true,preprint_ready,uncertain_oa,null': ['figure_out_oa_status_and_come_back_later'],
      'true,true,preprint_submitted_2025,open,cc_by': ['no_action_needed_already_compliant'],
      'true,true,preprint_submitted_2025,open,cc_other': ['reminder_to_publish_revised_preprints'],
      'true,true,preprint_submitted_2025,open,uncertain_license': [
        'figure_out_license_and_come_back_later',
      ],
      'true,true,preprint_submitted_2025,closed,null': ['proceed_to_pmc_submission_hhmi_and_nih'],
      'true,true,preprint_submitted_2025,uncertain_oa,null': [
        'figure_out_oa_status_and_come_back_later',
      ],
      'true,true,preprint_submitted_2026,open,cc_by': ['reminder_to_publish_revised_preprints'],
      'true,true,preprint_submitted_2026,open,cc_other': ['reminder_to_publish_revised_preprints'],
      'true,true,preprint_submitted_2026,open,uncertain_license': [
        'reminder_to_publish_revised_preprints',
      ],
      'true,true,preprint_submitted_2026,closed,null': [
        'reminder_to_publish_revised_preprints',
        'proceed_to_pmc_submission_nih',
      ],
      'true,true,preprint_submitted_2026,uncertain_oa,null': [
        'figure_out_oa_status_and_come_back_later',
      ],
      'true,true,no_preprint_2025,open,cc_by': [
        'no_action_needed_already_compliant',
        'optional_proceed_to_biorxiv_submission',
      ],
      'true,true,no_preprint_2025,open,cc_other': ['contact_the_journal_to_change_license_to_ccby'],
      'true,true,no_preprint_2025,open,uncertain_license': [
        'figure_out_license_and_come_back_later',
      ],
      'true,true,no_preprint_2025,closed,null': ['proceed_to_pmc_submission_hhmi_and_nih'],
      'true,true,no_preprint_2025,uncertain_oa,null': ['figure_out_oa_status_and_come_back_later'],
      'true,true,no_preprint_2026,open,cc_by': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,true,no_preprint_2026,open,cc_other': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,true,no_preprint_2026,open,uncertain_license': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,true,no_preprint_2026,closed,null': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
        'reminder_to_come_back_later_to_submit_to_pmc',
      ],
      'true,true,no_preprint_2026,uncertain_oa,null': ['figure_out_oa_status_and_come_back_later'],
      'true,false,preprint_ready,open,cc_by': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,preprint_ready,open,cc_other': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,preprint_ready,open,uncertain_license': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,preprint_ready,closed,null': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,preprint_ready,uncertain_oa,null': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,preprint_submitted_2025,open,cc_by': ['no_action_needed_already_compliant'],
      'true,false,preprint_submitted_2025,open,cc_other': ['reminder_to_publish_revised_preprints'],
      'true,false,preprint_submitted_2025,open,uncertain_license': [
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,preprint_submitted_2025,closed,null': ['reminder_to_publish_revised_preprints'],
      'true,false,preprint_submitted_2025,uncertain_oa,null': [
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,preprint_submitted_2026,open,cc_by': ['reminder_to_publish_revised_preprints'],
      'true,false,preprint_submitted_2026,open,cc_other': ['reminder_to_publish_revised_preprints'],
      'true,false,preprint_submitted_2026,open,uncertain_license': [
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,preprint_submitted_2026,closed,null': ['reminder_to_publish_revised_preprints'],
      'true,false,preprint_submitted_2026,uncertain_oa,null': [
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,no_preprint_2025,open,cc_by': [
        'no_action_needed_already_compliant',
        'optional_proceed_to_biorxiv_submission',
      ],
      'true,false,no_preprint_2025,open,cc_other': [
        'explain_that_they_can_either_contact_the_journal_to_change_license_to_ccby_or_publish_initial_and_revised_preprints',
      ],
      'true,false,no_preprint_2025,open,uncertain_license': [
        'explain_that_they_can_either_contact_the_journal_to_change_license_to_ccby_or_publish_initial_and_revised_preprints',
      ],
      'true,false,no_preprint_2025,closed,null': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,no_preprint_2025,uncertain_oa,null': ['figure_out_oa_status_and_come_back_later'],
      'true,false,no_preprint_2026,open,cc_by': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,no_preprint_2026,open,cc_other': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,no_preprint_2026,open,uncertain_license': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,no_preprint_2026,closed,null': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'true,false,no_preprint_2026,uncertain_oa,null': [
        'proceed_to_biorxiv_submission',
        'reminder_to_publish_revised_preprints',
      ],
      'false,true,preprint_ready,open,cc_by': [
        'no_action_needed_already_compliant',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,true,preprint_ready,open,cc_other': [
        'no_action_needed_already_compliant',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,true,preprint_ready,open,uncertain_license': [
        'no_action_needed_already_compliant',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,true,preprint_ready,closed,null': [
        'reminder_to_come_back_later_to_submit_to_pmc',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,true,preprint_ready,uncertain_oa,null': ['figure_out_oa_status_and_come_back_later'],
      'false,true,preprint_submitted_2025,open,cc_by': ['no_action_needed_already_compliant'],
      'false,true,preprint_submitted_2025,open,cc_other': ['no_action_needed_already_compliant'],
      'false,true,preprint_submitted_2025,open,uncertain_license': [
        'no_action_needed_already_compliant',
      ],
      'false,true,preprint_submitted_2025,closed,null': ['proceed_to_pmc_submission_nih'],
      'false,true,preprint_submitted_2025,uncertain_oa,null': [
        'figure_out_oa_status_and_come_back_later',
      ],
      'false,true,preprint_submitted_2026,open,cc_by': ['no_action_needed_already_compliant'],
      'false,true,preprint_submitted_2026,open,cc_other': ['no_action_needed_already_compliant'],
      'false,true,preprint_submitted_2026,open,uncertain_license': [
        'no_action_needed_already_compliant',
      ],
      'false,true,preprint_submitted_2026,closed,null': ['proceed_to_pmc_submission_nih'],
      'false,true,preprint_submitted_2026,uncertain_oa,null': [
        'figure_out_oa_status_and_come_back_later',
      ],
      'false,true,no_preprint_2025,open,cc_by': [
        'no_action_needed_already_compliant',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,true,no_preprint_2025,open,cc_other': [
        'no_action_needed_already_compliant',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,true,no_preprint_2025,open,uncertain_license': [
        'no_action_needed_already_compliant',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,true,no_preprint_2025,closed,null': [
        'reminder_to_come_back_later_to_submit_to_pmc',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,true,no_preprint_2025,uncertain_oa,null': ['figure_out_oa_status_and_come_back_later'],
      'false,true,no_preprint_2026,open,cc_by': [
        'no_action_needed_already_compliant',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,true,no_preprint_2026,open,cc_other': [
        'no_action_needed_already_compliant',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,true,no_preprint_2026,open,uncertain_license': [
        'no_action_needed_already_compliant',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,true,no_preprint_2026,closed,null': [
        'reminder_to_come_back_later_to_submit_to_pmc',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,true,no_preprint_2026,uncertain_oa,null': ['figure_out_oa_status_and_come_back_later'],
      'false,false,preprint_ready,open,cc_by': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,false,preprint_ready,open,cc_other': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,false,preprint_ready,open,uncertain_license': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,false,preprint_ready,closed,null': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
        'optional_reminder_to_come_back_later_to_submit_to_pmc',
      ],
      'false,false,preprint_ready,uncertain_oa,null': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,false,preprint_submitted_2025,open,cc_by': [
        'no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend',
      ],
      'false,false,preprint_submitted_2025,open,cc_other': [
        'no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend',
      ],
      'false,false,preprint_submitted_2025,open,uncertain_license': [
        'no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend',
      ],
      'false,false,preprint_submitted_2025,closed,null': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_reminder_to_come_back_later_to_submit_to_pmc',
      ],
      'false,false,preprint_submitted_2025,uncertain_oa,null': [
        'no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend',
      ],
      'false,false,preprint_submitted_2026,open,cc_by': [
        'no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend',
      ],
      'false,false,preprint_submitted_2026,open,cc_other': [
        'no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend',
      ],
      'false,false,preprint_submitted_2026,open,uncertain_license': [
        'no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend',
      ],
      'false,false,preprint_submitted_2026,closed,null': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_reminder_to_come_back_later_to_submit_to_pmc',
      ],
      'false,false,preprint_submitted_2026,uncertain_oa,null': [
        'no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend',
      ],
      'false,false,no_preprint_2025,open,cc_by': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,false,no_preprint_2025,open,cc_other': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,false,no_preprint_2025,open,uncertain_license': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,false,no_preprint_2025,closed,null': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
        'optional_reminder_to_come_back_later_to_submit_to_pmc',
      ],
      'false,false,no_preprint_2025,uncertain_oa,null': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,false,no_preprint_2026,open,cc_by': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,false,no_preprint_2026,open,cc_other': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,false,no_preprint_2026,open,uncertain_license': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
      ],
      'false,false,no_preprint_2026,closed,null': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
        'optional_reminder_to_come_back_later_to_submit_to_pmc',
      ],
      'false,false,no_preprint_2026,uncertain_oa,null': [
        'no_action_needed_not_subject_to_either_policy',
        'optional_proceed_to_biorxiv_submission',
      ],
    },
  },
};
