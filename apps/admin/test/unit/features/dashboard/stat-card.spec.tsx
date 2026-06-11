import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { StatCard } from '@/features/dashboard/components/stat-card';

describe('<StatCard />', () => {
  it('should render the label and the value', () => {
    render(<StatCard label="Active meetings" value={42} icon={Activity} />);

    expect(screen.getByText('Active meetings')).toBeInTheDocument();

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render the hint when one is provided', () => {
    render(<StatCard label="Users" value="1.2k" icon={Activity} hint="last 30 days" />);

    expect(screen.getByText('last 30 days')).toBeInTheDocument();
  });

  it('should omit the hint when none is provided', () => {
    render(<StatCard label="Users" value={3} icon={Activity} />);

    expect(screen.queryByText('last 30 days')).not.toBeInTheDocument();
  });
});
