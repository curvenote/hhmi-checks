import type { ZodError } from 'zod';
import type { GeneralError } from '@curvenote/scms-core';

interface ValidationErrorsProps {
  error: GeneralError;
}

function formatZodError(message: string, error: ZodError) {
  if (!error.issues || !Array.isArray(error.issues)) return null;

  return (
    <div
      className="inline-block p-4 text-red-700 border border-red-300 rounded-md bg-red-50"
      style={{ minWidth: 320, maxWidth: 600 }}
    >
      <div className="mb-4 text-lg font-bold text-red-700">{message}</div>
      <table className="w-auto border-separate table-auto border-spacing-y-1">
        <thead>
          <tr className="bg-red-100">
            <th className="px-3 py-2 font-semibold text-left text-red-700">Field</th>
            <th className="px-3 py-2 font-semibold text-left text-red-700">Expected</th>
            <th className="px-3 py-2 font-semibold text-left text-red-700">Received</th>
            <th className="px-3 py-2 font-semibold text-left text-red-700">Error</th>
          </tr>
        </thead>
        <tbody>
          {error.issues.map((i, idx) => (
            <tr key={idx} className="border-b border-red-200 last:border-b-0">
              <td className="px-3 py-2 text-red-700">
                {i.path.join('.') || <span className="italic">root</span>}
              </td>
              <td className="px-3 py-2 text-red-700">
                {i.code === 'invalid_type' ? (i as any).expected : '-'}
              </td>
              <td className="px-3 py-2 text-red-700">
                {i.code === 'invalid_type'
                  ? typeof (i as any).received === 'string'
                    ? (i as any).received
                    : typeof (i as any).input === 'string'
                      ? (i as any).input
                      : JSON.stringify((i as any).input ?? '-')
                  : '-'}
              </td>
              <td className="px-3 py-2 text-red-700">{i.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ValidationErrors({ error }: ValidationErrorsProps) {
  if (!error.details) {
    return (
      <div className="inline-block p-4 text-red-700 border border-red-300 rounded-md bg-red-50">
        <div className="text-lg font-bold">{error.message}</div>
      </div>
    );
  }

  // Check if details is a ZodError
  if (error.details.name === 'ZodError') {
    return formatZodError(error.message, error.details as unknown as ZodError);
  }

  // Handle other types of error details
  return (
    <div className="inline-block p-4 text-red-700 border border-red-300 rounded-md bg-red-50">
      <div className="text-lg font-bold">{error.message}</div>
      <div className="mt-2 text-sm">
        {Object.entries(error.details).map(([key, value]) => (
          <div key={key}>
            {key}: {JSON.stringify(value)}
          </div>
        ))}
      </div>
    </div>
  );
}
