import type { TextIntegrityDataSchema } from '../schema.js';
import { TextIntegritySummaryBadge } from '../components/TextIntegritySummaryBadge.js';
import { TextIntegrityWorkListSummary } from '../components/TextIntegrityWorkListSummary.js';
import { DesignSection, WorkListSummaryChip } from './designShared.js';
import {
  SAMPLE_IN_PROGRESS,
  SAMPLE_NO_STAGES,
  SAMPLE_RESULTS_0_PERCENT,
  SAMPLE_RESULTS_5_PERCENT,
  SAMPLE_RESULTS_32_PERCENT,
  SAMPLE_RESULTS_55_PERCENT,
  SAMPLE_RESULTS_80_PERCENT,
  SAMPLE_STAGE_ERROR,
} from './designSampleData.js';

type SummaryBadgeSample = {
  name: string;
  description?: string;
  metadata: TextIntegrityDataSchema | undefined;
};

const SUMMARY_BADGE_SAMPLES: SummaryBadgeSample[] = [
  {
    name: 'No stages',
    description: 'Check run not started — em dash badge and PENDING work list label.',
    metadata: SAMPLE_NO_STAGES,
  },
  {
    name: 'In progress',
    description: 'Submission complete, processing underway.',
    metadata: SAMPLE_IN_PROGRESS,
  },
  {
    name: 'Error',
    description: 'Failed processing stage.',
    metadata: SAMPLE_STAGE_ERROR,
  },
  {
    name: '0% similar',
    description: 'Complete report — lowest similarity tier.',
    metadata: SAMPLE_RESULTS_0_PERCENT,
  },
  {
    name: '5% similar',
    description: 'Complete report — low similarity.',
    metadata: SAMPLE_RESULTS_5_PERCENT,
  },
  {
    name: '32% similar',
    description: 'Complete report — moderate similarity.',
    metadata: SAMPLE_RESULTS_32_PERCENT,
  },
  {
    name: '55% similar',
    description: 'Complete report — elevated similarity.',
    metadata: SAMPLE_RESULTS_55_PERCENT,
  },
  {
    name: '80% similar',
    description: 'Complete report — high similarity.',
    metadata: SAMPLE_RESULTS_80_PERCENT,
  },
];

function SummaryBadgeStateRow({ sample }: { sample: SummaryBadgeSample }) {
  return (
    <div className="grid gap-4 border-b border-gray-100 py-5 last:border-b-0 dark:border-gray-800 lg:grid-cols-[minmax(0,1.2fr)_auto_auto_auto] lg:items-center">
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{sample.name}</div>
        {sample.description ? (
          <p className="text-xs text-gray-600 dark:text-gray-400">{sample.description}</p>
        ) : null}
      </div>
      <div className="space-y-1">
        <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Timeline badge
        </div>
        <TextIntegritySummaryBadge metadata={sample.metadata} />
      </div>
      <div className="space-y-1">
        <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Work list
        </div>
        <WorkListSummaryChip>
          <TextIntegrityWorkListSummary metadata={sample.metadata} />
        </WorkListSummaryChip>
      </div>
      <div className="space-y-1">
        <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Work list (compact)
        </div>
        <WorkListSummaryChip compact>
          <TextIntegrityWorkListSummary metadata={sample.metadata} compact />
        </WorkListSummaryChip>
      </div>
    </div>
  );
}

export function SummaryBadgeDesigns() {
  return (
    <DesignSection
      name="Summary badges"
      description="Timeline badges and My Works check summary chips in normal and compact layouts."
      wide
    >
      <div className="space-y-0">
        {SUMMARY_BADGE_SAMPLES.map((sample) => (
          <SummaryBadgeStateRow key={sample.name} sample={sample} />
        ))}
      </div>
    </DesignSection>
  );
}
