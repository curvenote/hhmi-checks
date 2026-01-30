import { ChevronDown, ChevronUp, Bug, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { cn, ui } from '@curvenote/scms-core';
import { STAGE_ORDER } from '../schema.js';
import type { ProofigDataSchema, ProofigStageStatus } from '../schema.js';

interface StateDebugProps {
  proofigData: ProofigDataSchema | undefined;
  isDebugMode: boolean;
  onToggleDebug: () => void;
  onSetStageStatus: (stage: keyof ProofigDataSchema['stages'], status: ProofigStageStatus) => void;
  onReset: () => void;
  onApplyPreset: (
    preset: 'all-pending' | 'all-completed' | 'mid-processing' | 'failed-at-3',
  ) => void;
}

const STATUS_OPTIONS: ProofigStageStatus[] = [
  'pending',
  'processing',
  'completed',
  'failed',
  'skipped',
  'error',
];

const STAGE_LABELS: Record<keyof ProofigDataSchema['stages'], string> = {
  initialPost: 'Initial Post',
  subimageDetection: 'Subimage Detection',
  subimageSelection: 'Subimage Selection',
  integrityDetection: 'Integrity Detection',
  resultsReview: 'Results Review',
  finalReport: 'Final Report',
};

const STATUS_COLORS: Record<ProofigStageStatus, string> = {
  pending: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  processing: 'bg-blue-200 hover:bg-blue-300 text-blue-800',
  completed: 'bg-green-200 hover:bg-green-300 text-green-800',
  failed: 'bg-red-200 hover:bg-red-300 text-red-800',
  skipped: 'bg-yellow-200 hover:bg-yellow-300 text-yellow-800',
  error: 'bg-red-200 hover:bg-red-300 text-red-800',
};

export function StateDebug({
  proofigData,
  isDebugMode,
  onToggleDebug,
  onSetStageStatus,
  onReset,
  onApplyPreset,
}: StateDebugProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!proofigData) return null;

  return (
    <div className="mt-4 bg-orange-50 rounded-lg border dark:bg-orange-950/20">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex justify-between items-center px-4 py-2 w-full text-sm font-medium transition-colors hover:bg-orange-100 dark:hover:bg-orange-900/20"
      >
        <div className="flex gap-2 items-center">
          <Bug className="w-4 h-4 text-orange-600" />
          <span className="text-orange-800 dark:text-orange-200">Debug Controls</span>
          {isDebugMode && (
            <span className="px-2 py-0.5 text-xs rounded bg-orange-600 text-white">Active</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-orange-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-orange-600" />
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-orange-200 dark:border-orange-800">
          {/* Debug Mode Toggle */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">Enable debug mode to override state</div>
            <ui.Button
              variant={isDebugMode ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleDebug}
            >
              {isDebugMode ? 'Disable Debug' : 'Enable Debug'}
            </ui.Button>
          </div>

          {isDebugMode && (
            <>
              {/* Quick Presets */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Quick Presets</div>
                <div className="flex flex-wrap gap-2">
                  <ui.Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApplyPreset('all-pending')}
                  >
                    All Pending
                  </ui.Button>
                  <ui.Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApplyPreset('mid-processing')}
                  >
                    Mid-Processing
                  </ui.Button>
                  <ui.Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApplyPreset('failed-at-3')}
                  >
                    Failed at Stage 3
                  </ui.Button>
                  <ui.Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApplyPreset('all-completed')}
                  >
                    All Completed
                  </ui.Button>
                  <ui.Button variant="ghost" size="sm" onClick={onReset} className="ml-auto">
                    <RotateCcw className="mr-1 w-3 h-3" />
                    Reset
                  </ui.Button>
                </div>
              </div>

              {/* Stage Controls */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground">
                  Stage Status Controls
                </div>
                {STAGE_ORDER.map((stage: keyof ProofigDataSchema['stages'], index: number) => {
                  const currentStatus = proofigData.stages[stage]?.status || 'pending';
                  return (
                    <div key={stage} className="space-y-1">
                      <div className="text-xs font-medium">
                        {index + 1}. {STAGE_LABELS[stage]}
                      </div>
                      <div className="flex gap-1">
                        {STATUS_OPTIONS.map((status) => (
                          <button
                            key={status}
                            onClick={() => onSetStageStatus(stage, status)}
                            className={cn(
                              'px-2 py-1 text-xs rounded transition-all',
                              currentStatus === status
                                ? STATUS_COLORS[status]
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-400',
                            )}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
