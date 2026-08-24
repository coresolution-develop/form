'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/cn';
import { FIELD_TYPE_LABELS, type FormField } from '@/types/field';

interface Props {
  field: FormField;
  selected: boolean;
  onSelect: (id: number) => void;
  onDelete: (field: FormField) => void;
}

export function FieldItem({ field, selected, onSelect, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(field.id)}
      className={cn(
        'flex items-center gap-2 rounded-[9px] border px-3 py-[11px]',
        selected ? 'border-brand bg-brand-light' : 'border-line bg-white hover:border-line-input',
      )}
    >
      <button
        type="button"
        aria-label="드래그하여 순서 변경"
        className={cn(
          'cursor-grab touch-none px-1 active:cursor-grabbing',
          selected ? 'text-ink-200 hover:text-ink-400' : 'text-[#c9cdd3] hover:text-ink-300',
        )}
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <span className="flex flex-1 items-center gap-2">
        <span className="text-[11.5px] tabular-nums text-ink-300">#{field.orderNum}</span>
        <span className="text-[13.5px] font-medium text-ink-900">{field.label}</span>
        <span
          className={cn(
            'rounded-[5px] px-[7px] py-0.5 text-[11.5px] text-ink-500',
            selected ? 'bg-white' : 'bg-surface-fill',
          )}
        >
          {FIELD_TYPE_LABELS[field.type]}
        </span>
        {field.required && <span className="text-[11.5px] text-danger-accent">필수</span>}
      </span>
      <button
        type="button"
        aria-label="필드 삭제"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(field);
        }}
        className="rounded px-2 py-1 text-sm text-[#c9cdd3] hover:bg-surface-fill hover:text-danger-accent"
      >
        ✕
      </button>
    </div>
  );
}
