import { useState, useCallback } from 'react';
import type { ProofigDataSchema, ProofigStageStatus } from '../schema.js';
import { STAGE_ORDER } from '../schema.js';

/**
 * Custom hook for debugging Proofig state
 * Provides local state management and controls for testing different UI states
 */
export function useProofigDebugState(initialData?: ProofigDataSchema) {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugState, setDebugState] = useState<ProofigDataSchema | null>(null);

  // Get the active state - debug state if enabled, otherwise original data
  const activeState = isDebugMode && debugState ? debugState : initialData;

  // Toggle debug mode on/off
  const toggleDebugMode = useCallback(() => {
    setIsDebugMode((prev) => {
      if (!prev && initialData) {
        // Entering debug mode - initialize with current state
        setDebugState({ ...initialData });
      }
      return !prev;
    });
  }, [initialData]);

  // Update a specific stage's status
  const setStageStatus = useCallback(
    (stageName: keyof ProofigDataSchema['stages'], status: ProofigStageStatus) => {
      setDebugState((prev: ProofigDataSchema | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          stages: {
            ...prev.stages,
            [stageName]: {
              ...prev.stages[stageName],
              status,
              timestamp: new Date().toISOString(),
            },
          },
        };
      });
    },
    [],
  );

  // Reset to original state
  const resetDebugState = useCallback(() => {
    if (initialData) {
      setDebugState({ ...initialData });
    }
  }, [initialData]);

  // Quick presets for common scenarios
  const applyPreset = useCallback(
    (preset: 'all-pending' | 'all-completed' | 'mid-processing' | 'failed-at-3') => {
      if (!initialData) return;

      const newState = { ...initialData };

      switch (preset) {
        case 'all-pending':
          STAGE_ORDER.forEach((stage: keyof ProofigDataSchema['stages']) => {
            newState.stages[stage] = { status: 'pending', timestamp: new Date().toISOString() };
          });
          break;

        case 'all-completed':
          STAGE_ORDER.forEach((stage: keyof ProofigDataSchema['stages']) => {
            newState.stages[stage] = { status: 'completed', timestamp: new Date().toISOString() };
          });
          break;

        case 'mid-processing':
          newState.stages.initialPost = {
            status: 'completed',
            timestamp: new Date().toISOString(),
          };
          newState.stages.subimageDetection = {
            status: 'completed',
            timestamp: new Date().toISOString(),
          };
          newState.stages.subimageSelection = {
            status: 'processing',
            timestamp: new Date().toISOString(),
          };
          newState.stages.integrityDetection = {
            status: 'pending',
            timestamp: new Date().toISOString(),
          };
          newState.stages.resultsReview = {
            status: 'pending',
            timestamp: new Date().toISOString(),
          };
          newState.stages.finalReport = { status: 'pending', timestamp: new Date().toISOString() };
          break;

        case 'failed-at-3':
          newState.stages.initialPost = {
            status: 'completed',
            timestamp: new Date().toISOString(),
          };
          newState.stages.subimageDetection = {
            status: 'completed',
            timestamp: new Date().toISOString(),
          };
          newState.stages.subimageSelection = {
            status: 'failed',
            timestamp: new Date().toISOString(),
            error: 'Connection timeout',
          };
          newState.stages.integrityDetection = {
            status: 'pending',
            timestamp: new Date().toISOString(),
          };
          newState.stages.resultsReview = {
            status: 'pending',
            timestamp: new Date().toISOString(),
          };
          newState.stages.finalReport = { status: 'pending', timestamp: new Date().toISOString() };
          break;
      }

      setDebugState(newState);
    },
    [initialData],
  );

  return {
    isDebugMode,
    activeState,
    toggleDebugMode,
    setStageStatus,
    resetDebugState,
    applyPreset,
  };
}
