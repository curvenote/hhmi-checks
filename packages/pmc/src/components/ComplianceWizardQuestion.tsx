import React from 'react';
import { WizardQuestion, type SpecialRenderer } from '@curvenote/scms-core';
import type { WizardQuestion as ComplianceQuestion } from '../common/complianceTypes.js';
import { processPublishingStageBold } from './ComplianceTextRenderer.js';
import { processMarkdownFormatting } from './markdownTextHelpers.js';
import { usePingEvent } from '@curvenote/scms-core';
import { PMCTrackEvent } from '../analytics/events.js';
// Import SVG assets
import openAccessIcon from '../assets/open-access.svg';
import closedAccessIcon from '../assets/closed-access.svg';
import byIcon from '../assets/by.svg';
import ncIcon from '../assets/nc.svg';
import ndIcon from '../assets/nd.svg';

/**
 * Compliance-specific icon mapping from config names to imported SVG assets
 */
const complianceIconMap: Record<string, string> = {
  'open-access': openAccessIcon,
  'closed-access': closedAccessIcon,
  'cc-by': byIcon,
  'cc-other': ncIcon, // fallback (not used due to special renderer)
};

/**
 * Multiple CC license icons for the "cc-other" option
 */
const ccOtherIcons = [
  { icons: [ncIcon, ndIcon], label: 'CC-NC-ND', description: 'Non-commercial/derivative' },
  { icons: [ncIcon], label: 'CC-BY-NC', description: 'Non-commercial' },
  { icons: [ndIcon], label: 'CC-BY-ND', description: 'No derivatives' },
];

/**
 * Special renderer for CC license "cc-other" option
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ccOtherRenderer: SpecialRenderer = (_option, _isSelected) => (
  <div className="flex flex-col items-start justify-center flex-grow gap-2 my-2">
    {ccOtherIcons.map((ccIcon, index) => (
      <div key={index} className="flex items-center justify-start gap-2">
        <div className="flex flex-row items-center justify-center w-12 gap-1">
          {ccIcon.icons.map((iconSrc, iconIndex) => (
            <img
              key={iconIndex}
              src={iconSrc}
              alt={`${ccIcon.label} icon ${iconIndex + 1}`}
              className="w-6 h-6"
            />
          ))}
        </div>
        <div className="flex flex-col">
          <div className="text-xs font-semibold">{ccIcon.label}</div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Compliance-specific special renderers
 */
const complianceSpecialRenderers: Record<string, SpecialRenderer> = {
  'cc-other': ccOtherRenderer,
};

interface ComplianceWizardQuestionProps {
  question: ComplianceQuestion;
  value: string | boolean | null;
  onChange: (value: string | boolean) => void;
  buttonClassName?: string;
  containerClassName?: string;
  disabled?: boolean;
}

/**
 * ComplianceWizardQuestion: Compliance-specific wrapper for the generic WizardQuestion
 *
 * Provides compliance-specific icon mappings and special renderers (like CC license display)
 * while leveraging the generic wizard question component for consistent behavior.
 *
 * @param question - Compliance question configuration
 * @param value - Current answer value
 * @param onChange - Callback when answer changes
 * @param className - Optional CSS classes
 * @param disabled - Whether the question is disabled
 */
export function ComplianceWizardQuestion({
  question,
  value,
  onChange,
  buttonClassName,
  containerClassName,
  disabled = false,
}: ComplianceWizardQuestionProps) {
  const pingEvent = usePingEvent();

  // Track question interactions
  const handleChange = (answer: string | boolean) => {
    const previousAnswer = value;
    // Track if this is a change (not initial answer)
    if (previousAnswer !== null && previousAnswer !== undefined) {
      pingEvent(
        PMCTrackEvent.COMPLIANCE_WIZARD_QUESTION_CHANGED,
        {
          questionId: question.id,
          questionTitle: question.title,
          answer,
          previousAnswer,
        },
        { anonymous: true, ignoreAdmin: true },
      );
    } else {
      pingEvent(
        PMCTrackEvent.COMPLIANCE_WIZARD_QUESTION_ANSWERED,
        {
          questionId: question.id,
          questionTitle: question.title,
          answer,
          previousAnswer,
        },
        { anonymous: true, ignoreAdmin: true },
      );
    }

    onChange(answer);
  };
  // Process the question to apply publishing stage bold formatting to option labels
  const processedQuestion = React.useMemo(() => {
    let result = { ...question };
    if (question.id === 'publishingStage') {
      // Process each option label for bold formatting
      const processedOptions = question.options.map((option) => {
        const processedLabel = processPublishingStageBold(option.label as string);
        return {
          ...option,
          label: processedLabel, // Replace string with React elements
        };
      });

      result = {
        ...result,
        options: processedOptions,
      };
    }

    if (question.description) {
      const updatedDescription = processMarkdownFormatting(question.description as string);
      result = {
        ...result,
        description: updatedDescription,
      };
    }

    return result;
  }, [question]);

  return (
    <WizardQuestion
      question={processedQuestion}
      value={value}
      onChange={handleChange}
      buttonClassName={buttonClassName}
      containerClassName={containerClassName}
      disabled={disabled}
      iconMap={complianceIconMap}
      specialRenderers={complianceSpecialRenderers}
    />
  );
}
