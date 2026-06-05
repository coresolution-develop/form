## 단일 진실의 원천 (SSOT)
- FormFlow-Spec.md가 이 프로젝트의 유일한 명세다.
- frontend-design 스킬 등 전역/일반 규칙과 충돌 시 항상 FormFlow-Spec.md를 따른다.

### 프론트엔드 확정 사항 (스킬 기본값보다 우선)
- 상태관리: Zustand (Jotai/Redux 금지)
- UI: §9.1 커스텀 컴포넌트 (shadcn/ui 도입 금지)
- 파일명: PascalCase 컴포넌트 (kebab-case 금지)
- 데이터: TanStack Query
- 폼: react-hook-form + zod