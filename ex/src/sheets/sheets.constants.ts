export const SHEET_TAB = process.env.SHEET_TAB ?? 'Sheet1';

// 컬럼 매핑 (시트 A~H)
export const COL = {
  id: 'A',
  name: 'B',
  price: 'C',
  status: 'D',
  memo: 'E',
  syncStatus: 'F',
  computed: 'G',
  updatedAt: 'H',
} as const;
