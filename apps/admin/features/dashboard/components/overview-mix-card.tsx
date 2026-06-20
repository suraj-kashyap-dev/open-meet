'use client';

import type { ChartData, ChartOptions } from 'chart.js';

import { cn } from '@open-meet/ui/cn';

import { ChartCanvas } from '@/features/dashboard/components/chart-canvas';
import { useChartPalette, withAlpha } from '@/features/dashboard/components/chart-theme';

interface Segment {
  label: string;
  value: number;
}

interface Props {
  activeLabel: string;
  activeValue: number;
  className?: string;
  segments: Segment[];
  title: string;
}

export function OverviewMixCard({ activeLabel, activeValue, className, segments, title }: Props) {
  const palette = useChartPalette();
  const colors = [
    palette.accent,
    withAlpha(palette.accent, 0.8),
    palette.success,
    palette.warning,
    withAlpha(palette.muted, 0.7),
  ];

  const data: ChartData<'doughnut'> = {
    labels: segments.map((segment) => segment.label),
    datasets: [
      {
        backgroundColor: segments.map((_, index) => colors[index % colors.length]),
        borderColor: palette.card,
        borderWidth: 6,
        data: segments.map((segment) => segment.value),
        hoverOffset: 6,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    animation: false,
    cutout: '72%',
    layout: {
      padding: 8,
    },
    maintainAspectRatio: false,
    radius: '92%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: palette.card,
        bodyColor: palette.foreground,
        borderColor: withAlpha(palette.border, 0.85),
        borderWidth: 1,
        padding: 12,
        titleColor: palette.foreground,
      },
    },
    responsive: true,
  };

  return (
    <section className={cn('rounded-2xl border border-border bg-card p-5 shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground">{activeLabel}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className="relative mx-auto h-56 w-56">
          <ChartCanvas
            ariaLabel={`${title} distribution`}
            data={data}
            options={options}
            type="doughnut"
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">
              {activeValue.toLocaleString()}
            </span>
            <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {activeLabel}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {segments.map((segment, index) => (
            <div
              key={segment.label}
              className={
                'flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3.5 py-3'
              }
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-sm font-medium">{segment.label}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {segment.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
