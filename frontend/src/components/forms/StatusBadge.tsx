import { cn } from '@/lib/cn';
import { FORM_STATUS_LABELS, type FormStatus } from '@/types/form';

const STYLES: Record<FormStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-amber-100 text-amber-700',
};

export function StatusBadge({ status }: { status: FormStatus }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STYLES[status])}>
      {FORM_STATUS_LABELS[status]}
    </span>
  );
}
