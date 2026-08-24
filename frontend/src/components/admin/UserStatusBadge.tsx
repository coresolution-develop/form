import { cn } from '@/lib/cn';
import { USER_STATUS_LABELS } from '@/types/admin';
import type { UserStatus } from '@/types/user';

const STYLES: Record<UserStatus, string> = {
  PENDING: 'bg-surface-fill text-ink-500',
  ACTIVE: 'bg-ok-bg text-ok-fg',
  SUSPENDED: 'bg-danger-bg-strong text-danger-fg',
  DELETED: 'bg-surface-fill-hover text-ink-400',
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STYLES[status])}>
      {USER_STATUS_LABELS[status]}
    </span>
  );
}
