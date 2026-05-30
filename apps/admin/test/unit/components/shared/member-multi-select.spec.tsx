import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MemberMultiSelect } from '@/components/shared/member-multi-select';

const useAdminUsers = vi.fn();

vi.mock('@/features/users/hooks/use-admin-users', () => ({
  useAdminUsers: (...args: unknown[]) => useAdminUsers(...args),
}));

const USERS = [
  { id: 'u-1', name: 'Ada Lovelace', email: 'ada@example.com', avatar: null },
  { id: 'u-2', name: 'Alan Turing', email: 'alan@example.com', avatar: null },
];

function renderSelect(props?: Partial<Parameters<typeof MemberMultiSelect>[0]>) {
  const onSelectedIdsChange = vi.fn();

  render(
    <MemberMultiSelect
      selectedIds={[]}
      onSelectedIdsChange={onSelectedIdsChange}
      searchPlaceholder="Search people"
      emptyLabel="No users"
      removeLabel="Remove"
      {...props}
    />,
  );

  return { onSelectedIdsChange };
}

describe('<MemberMultiSelect />', () => {
  beforeEach(() => {
    useAdminUsers.mockReset();
    useAdminUsers.mockReturnValue({ data: { items: USERS, total: USERS.length }, isFetching: false });
  });

  describe('initial render', () => {
    it('should keep the dropdown closed until the search box is focused', () => {
      renderSelect();

      expect(screen.getByPlaceholderText('Search people')).toBeInTheDocument();
      expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
      expect(screen.queryByText('Alan Turing')).not.toBeInTheDocument();
    });
  });

  describe('searching', () => {
    it('should preload users in the dropdown when the search box is focused', async () => {
      renderSelect();

      fireEvent.focus(screen.getByPlaceholderText('Search people'));

      expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
      expect(screen.getByText('Alan Turing')).toBeInTheDocument();
    });

    it('should select a user when their row is chosen', async () => {
      const { onSelectedIdsChange } = renderSelect();

      fireEvent.focus(screen.getByPlaceholderText('Search people'));
      fireEvent.click(await screen.findByText('Ada Lovelace'));

      expect(onSelectedIdsChange).toHaveBeenCalledWith(['u-1']);
    });
  });

  describe('selected members', () => {
    it('should list selected members below the search box with their email', () => {
      renderSelect({
        selectedIds: ['u-1'],
        initialSelectedUsers: [USERS[0]!],
      });

      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
      expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    });

    it('should deselect a member when its remove button is clicked', () => {
      const { onSelectedIdsChange } = renderSelect({
        selectedIds: ['u-1'],
        initialSelectedUsers: [USERS[0]!],
      });

      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

      expect(onSelectedIdsChange).toHaveBeenCalledWith([]);
    });
  });
});
