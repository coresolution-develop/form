'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { FieldItem } from '@/components/builder/FieldItem';
import { useToast } from '@/components/ui/Toast';
import { useReorderFields } from '@/hooks/useFields';
import { formKeys } from '@/hooks/useForms';
import { toUserMessage } from '@/lib/errorMessage';
import type { FormDetail } from '@/types/form';
import type { FormField } from '@/types/field';

interface Props {
  formId: number;
  fields: FormField[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDelete: (field: FormField) => void;
}

export function FieldList({ formId, fields, selectedId, onSelect, onDelete }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const reorder = useReorderFields(formId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (fields.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
        아직 필드가 없습니다. 오른쪽에서 필드를 추가해보세요.
      </div>
    );
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    // 재정렬 + orderNum 1..N 재계산
    const reordered = arrayMove(fields, oldIndex, newIndex).map((f, i) => ({ ...f, orderNum: i + 1 }));

    // 낙관적 업데이트: form 상세 캐시의 fields 교체
    qc.setQueryData<FormDetail>(formKeys.detail(formId), (prev) =>
      prev ? { ...prev, fields: reordered } : prev,
    );

    reorder.mutate(
      reordered.map((f) => ({ fieldId: f.id, orderNum: f.orderNum })),
      { onError: (e: any) => toast(toUserMessage(e?.response?.data?.code, '순서 변경에 실패했습니다.'), 'error') },
    );
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {fields.map((field) => (
            <li key={field.id}>
              <FieldItem
                field={field}
                selected={selectedId === field.id}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            </li>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
