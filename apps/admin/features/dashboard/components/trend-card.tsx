'use client';

import type { ChartData, ChartOptions } from 'chart.js';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { DailyCountPoint } from '@open-meet/types';

import { cn } from '@open-meet/ui/cn';

import { ChartCanvas } from '@/features/dashboard/components/chart-canvas';
import {
  createVerticalGradient,
  useChartPalette,
  withAlpha,
} from '@/features/dashboard/components/chart-theme';
import {
  formatDayLabel,
  getSeriesDelta,
  getSeriesLastValue,
  getSeriesTotal,
} from '@/features/dashboard/lib/chart-insights';

interface Props {
  className?: string;
  series: DailyCountPoint[];
  summary?: string;
  title: string;
  tone?: 'accent' | 'success';
}

export function TrendCard({ className, series, summary, title, tone = 'accent' }: Props) {
  const t = useTranslations('dashboard.trends');
  const palette = useChartPalette();
  const total = getSeriesTotal(series);
  const last = series.at(-1);
  const lastValue = getSeriesLastValue(series);
  const delta = getSeriesDelta(series);
  const stroke = tone === 'success' ? palette.success : palette.accent;
  const summaryText = summary ?? t('range', { total });

  const data: ChartData<'line'> = {
    labels: series.map((point) => formatDayLabel(point.date)),
    datasets: [
      {
        data: series.map((point) => point.count),
        backgroundColor: (context) => {
          const area = context.chart.chartArea;

          if (!area) {
            return withAlpha(stroke, 0.18);
          }

          return createVerticalGradient(
            context.chart.ctx,
            area,
            withAlpha(stroke, 0.32),
            withAlpha(stroke, 0.02),
          );
        },
        borderColor: stroke,
        borderWidth: 2.5,
        clip: 16,
        fill: true,
        pointBackgroundColor: stroke,
        pointBorderWidth: 0,
        pointHitRadius: 22,
        pointHoverRadius: 4,
        pointRadius: 0,
        tension: 0.38,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    animation: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 12,
        right: 6,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: palette.card,
        bodyColor: palette.foreground,
        borderColor: withAlpha(palette.border, 0.85),
        borderWidth: 1,
        displayColors: false,
        padding: 12,
        titleColor: palette.foreground,
      },
    },
    responsive: true,
    scales: {
      x: {
        border: {
          display: false,
        },
        grid: {
          display: false,
        },
        ticks: {
          color: palette.muted,
          maxRotation: 0,
          maxTicksLimit: 4,
        },
      },
      y: {
        beginAtZero: true,
        grace: '12%',
        border: {
          display: false,
        },
        grid: {
          color: withAlpha(palette.border, 0.45),
          drawTicks: false,
        },
        ticks: {
          color: palette.muted,
          display: false,
          precision: 0,
        },
      },
    },
  };

  return (
    <section className={cn('rounded-2xl border border-border bg-card p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground">{summaryText}</p>
        </div>
        <span
          className={cn(
            [
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]',
              'font-medium',
            ].join(' '),
            delta > 0 && 'border-success/30 bg-success/10 text-success',
            delta < 0 && 'border-warning/30 bg-warning/10 text-warning',
            delta === 0 && 'border-border bg-muted/70 text-muted-foreground',
          )}
        >
          {delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}
          {delta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
          {delta > 0 ? '+' : ''}
          {delta}
        </span>
      </div>

      <div className="mt-5 h-48">
        <ChartCanvas ariaLabel={`${title} trend`} data={data} options={options} type="line" />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t('today')}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{lastValue}</p>
        </div>
        {last ? (
          <p className="text-right text-xs text-muted-foreground">
            <span className="block font-medium text-foreground">{last.count}</span>
            <span>{formatDayLabel(last.date)}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
