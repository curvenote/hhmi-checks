import type { FC } from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'warning' | 'error' | 'success';
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, variant = 'default' }) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      default:
        return 'border-blue-100 bg-blue-50 text-gray-900';
    }
  };

  return (
    <div
      className={`flex gap-1 items-center px-3 py-1 text-sm rounded-md border ${getVariantClasses()}`}
      role="status"
      aria-label={status}
    >
      {status}
    </div>
  );
};
