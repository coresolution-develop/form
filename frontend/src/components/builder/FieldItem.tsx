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
        'flex items-center gap-2 rounded-lg border px-3 py-3',
        selected ? 'border-brand bg-brand-light' : 'border-gray-200 bg-white hover:bg-gray-50',
      )}
    >
      <button
        type="button"
        aria-label="드래그하여 순서 변경"
        className="cursor-grab touch-none px-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <span className="flex flex-1 items-center gap-2">
        <span className="text-xs text-gray-400">#{field.orderNum}</span>
        <span className="font-medium text-gray-900">{field.label}</span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
          {FIELD_TYPE_LABELS[field.type]}
        </span>
        {field.required && <span className="text-xs text-red-500">필수</span>}
      </span>
      <button
        type="button"
        aria-label="필드 삭제"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(field);
        }}
        className="rounded px-2 py-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-red-600"
      >
        ✕
      </button>
    </div>
  );
}
