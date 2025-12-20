interface ImageStateLegendProps {
  /**
   * Total number of images
   */
  total: number;
  /**
   * Number of images with issues/failures
   */
  bad: number;
  /**
   * Number of images waiting for review or processing
   */
  waiting: number;
  /**
   * Number of images that passed checks
   */
  good: number;
}

export function ImageStateLegend({ total, bad, waiting, good }: ImageStateLegendProps) {
  const stats = [
    {
      value: total,
      label: 'Figures detected',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-600',
    },
    {
      value: waiting,
      label: 'Waiting on you to review them',
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-600',
    },
    {
      value: good,
      label: 'Marked fine',
      textColor: 'text-[#1B8364]',
      borderColor: 'border-[#1B8364]',
    },
    {
      value: bad,
      label: 'Marked as problematic',
      textColor: 'text-[#9B1E1E]',
      borderColor: 'border-[#9B1E1E]',
    },
  ];

  return (
    <div className="flex flex-wrap">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`flex-1 min-w-[140px] px-4 py-6 border-l-2 ${stat.borderColor}`}
        >
          <div className={`text-5xl font-light ${stat.textColor}`}>{stat.value}</div>
          <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
