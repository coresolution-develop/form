import { cn } from '@/lib/cn';
import { FORM_STATUS_LABELS, type FormStatus } from '@/types/form';

const STYLES: Record<FormStatus, string> = {
  DRAFT: 'bg-surface-fill text-ink-500',
  PUBLISHED: 'bg-ok-bg text-ok-fg',
  CLOSED: 'bg-warn-bg text-warn-fg',
};

export function StatusBadge({ status }: { status: FormStatus }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-medium', STYLES[status])}>
      {FORM_STATUS_LABELS[status]}
    </span>
  );
}
