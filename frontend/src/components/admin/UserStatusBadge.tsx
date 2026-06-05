import { cn } from '@/lib/cn';
import { USER_STATUS_LABELS } from '@/types/admin';
import type { UserStatus } from '@/types/user';

const STYLES: Record<UserStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  DELETED: 'bg-gray-200 text-gray-500',
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STYLES[status])}>
      {USER_STATUS_LABELS[status]}
    </span>
  );
}
