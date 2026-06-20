'use client';

import { useEffect, useRef } from 'react';
import { Chart as ChartJS, type ChartConfiguration, type ChartType } from 'chart.js';

import { cn } from '@open-meet/ui/cn';

interface Props<TType extends ChartType> {
  ariaLabel: string;
  className?: string;
  data: ChartConfiguration<TType>['data'];
  options?: ChartConfiguration<TType>['options'];
  type: TType;
}

export function ChartCanvas<TType extends ChartType>({
  ariaLabel,
  className,
  data,
  options,
  type,
}: Props<TType>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS<TType> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    chartRef.current?.destroy();

    chartRef.current = new ChartJS(canvas, { type, data, options });

    return () => {
      chartRef.current?.destroy();

      chartRef.current = null;
    };
  }, [data, options, type]);

  return (
    <div className={cn('h-full w-full overflow-visible', className)}>
      <canvas ref={canvasRef} aria-label={ariaLabel} className="block h-full w-full" role="img" />
    </div>
  );
}
