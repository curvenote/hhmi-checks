/** Proofig notify states that warrant Slack (excludes noisy Processing). */
export const PROOFIG_SLACK_MILESTONE_STATES = new Set([
  'Awaiting: Sub-Image Approval',
  'Awaiting: Review',
  'Report: Clean',
  'Report: Flagged',
  'Deleted',
]);

export function isProofigSlackMilestoneState(state: string): boolean {
  return PROOFIG_SLACK_MILESTONE_STATES.has(state);
}

export function proofigMilestoneColor(state: string): 'good' | 'warning' | 'danger' {
  if (state === 'Report: Clean') return 'good';
  if (state === 'Report: Flagged' || state === 'Deleted') return 'warning';
  return 'warning';
}

export function proofigMilestoneMessage(state: string, reportId?: string): string {
  const idSuffix = reportId?.trim() ? ` (${reportId.trim()})` : '';
  switch (state) {
    case 'Awaiting: Sub-Image Approval':
      return `Proofig awaiting sub-image approval${idSuffix}`;
    case 'Awaiting: Review':
      return `Proofig awaiting review${idSuffix}`;
    case 'Report: Clean':
      return `Proofig report clean${idSuffix}`;
    case 'Report: Flagged':
      return `Proofig report flagged${idSuffix}`;
    case 'Deleted':
      return `Proofig run deleted at provider${idSuffix}`;
    default:
      return `Proofig state: ${state}${idSuffix}`;
  }
}
