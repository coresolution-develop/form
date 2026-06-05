import { create } from 'zustand';

/**
 * 빌더 UI 상태 전용 (§9.7).
 *
 * <p>서버 상태(폼 메타·필드 배열)는 TanStack Query(useForm)가 SSOT다.
 * 이중 소스 stale 버그를 피하기 위해 이 스토어에는 데이터를 복제하지 않고
 * "선택된 필드 / 미리보기 모드" 같은 UI 상태만 둔다.
 */
type BuilderState = {
  selectedFieldId: number | null;
  previewMode: boolean;
  select: (id: number | null) => void;
  togglePreview: () => void;
  reset: () => void;
};

export const useBuilderStore = create<BuilderState>((set) => ({
  selectedFieldId: null,
  previewMode: false,
  select: (id) => set({ selectedFieldId: id }),
  togglePreview: () => set((s) => ({ previewMode: !s.previewMode })),
  reset: () => set({ selectedFieldId: null, previewMode: false }),
}));
