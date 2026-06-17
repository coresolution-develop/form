/**
 * 근무형태 사전 시드 — 코어솔루션 2026-06 시트에서 역설계해 16명 전원 합계가
 * 1의 오차 없이 일치함을 검증한 규칙. (CSV 대조 결과: 전체 일치)
 *
 * 핵심: 한 코드가 여러 버킷에 쪼개져 기여할 수 있다.
 *   - 오후반차 M/  → 근무 0.5 + 연차 0.5
 *   - 오전반차 /M  → 근무 0.5 + 연차 0.5
 * 초과마커(M5/M7/M9/MO)·대체연차(DY)·공가(H) 등은 이 4개 합계엔 0 기여(별도 추적용).
 */

export interface Contribution {
  bucket: string; // AggregateBucket.key
  weight: number;
}

export interface ShiftTypeSeed {
  code: string;
  label: string;
  bgColor: string;
  fgColor: string;
  sortOrder: number;
  contributions: Contribution[];
}

// 색 팔레트 (라이트). UI/시트 배지에 그대로 사용.
const C = {
  none: { bg: 'transparent', fg: '' },
  blue: { bg: '#E6F1FB', fg: '#0C447C' },
  gray: { bg: '#F1EFE8', fg: '#5F5E5A' },
  green: { bg: '#EAF3DE', fg: '#27500A' },
  amber: { bg: '#FAEEDA', fg: '#633806' },
  teal: { bg: '#E1F5EE', fg: '#0F6E56' },
  red: { bg: '#FCEBEB', fg: '#791F1F' },
  pink: { bg: '#FBEAF0', fg: '#72243E' },
  purple: { bg: '#EEEDFE', fg: '#3C3489' },
  coral: { bg: '#FAECE7', fg: '#712B13' },
};

const mk = (
  code: string,
  label: string,
  color: { bg: string; fg: string },
  contributions: Contribution[],
): Omit<ShiftTypeSeed, 'sortOrder'> => ({
  code,
  label,
  bgColor: color.bg,
  fgColor: color.fg,
  contributions,
});

const M = (w: number) => ({ bucket: 'M', weight: w });
const Y = (w: number) => ({ bucket: 'Y', weight: w });
const OFF = (w: number) => ({ bucket: 'OFF', weight: w });
const HD = (w: number) => ({ bucket: 'HD', weight: w });

const DEFS = [
  mk('M', '평일근무', C.none, [M(1)]),
  // 평일근무 + 초과(집계에 +1) — M2/M4/M+
  mk('M2', '평일근무 후 초과(2h)', C.blue, [M(1)]),
  mk('M4', '평일근무 후 초과(4h)', C.blue, [M(1)]),
  mk('M+', '평일근무 후 초과', C.blue, [M(1)]),
  // 초과마커 — 근무 합계엔 0 기여(시트 검증값과 동일)
  mk('M5', '근무 후 초과(5h)', C.blue, []),
  mk('M7', '근무 후 초과(7h)', C.blue, []),
  mk('M9', '근무 후 초과(9h)', C.blue, []),
  mk('MO', '근무 후 초과', C.blue, []),
  // 반차 — 근무 0.5 + 연차 0.5 로 쪼개짐
  mk('/M', '오전 반차', C.gray, [M(0.5), Y(0.5)]),
  mk('M/', '오후 반차', C.gray, [M(0.5), Y(0.5)]),
  // 반반차류 — 연차 0.5
  mk('/M/Q', '오전 반반차', C.green, [Y(0.5)]),
  mk('M//Q', '오후 반반차', C.green, [Y(0.5)]),
  // 휴무/연차
  mk('/', 'OFF', C.gray, [OFF(1)]),
  mk('Y', '자기계발연차', C.green, [Y(1)]),
  // 대체연차/대체휴무 — 4개 합계엔 0 (별도 추적)
  mk('DY', '대체 연차', C.amber, []),
  mk('DY/', '오전 대체휴무 후 근무', C.amber, []),
  mk('/DY', '근무 후 오후 대체휴무', C.amber, []),
  // 기타 휴가/사유 — 0 기여
  mk('H', '공가', C.teal, []),
  mk('A', '병가', C.red, []),
  mk('B', '출산휴가', C.pink, []),
  mk('C', '육아휴직', C.pink, []),
  mk('S', '교육', C.purple, []),
  mk('F', '경조', C.coral, []),
  // 토요근무 — HD 버킷. (이번 달 사용 0건이라 가중치 1.0은 잠정값, 세팅에서 조정)
  mk('HD/A', '토요일 오전근무', C.purple, [HD(1)]),
  mk('HD/P', '토요일 오후근무', C.purple, [HD(1)]),
];

export const SHIFT_TYPE_SEED: ShiftTypeSeed[] = DEFS.map((d, i) => ({
  ...d,
  sortOrder: i,
}));

// 우측 합계 열 — 시트의 M / HD / / / Y 순서 그대로.
export const BUCKET_SEED = [
  { key: 'M', label: 'M', sortOrder: 0 },
  { key: 'HD', label: 'HD', sortOrder: 1 },
  { key: 'OFF', label: '/', sortOrder: 2 },
  { key: 'Y', label: 'Y', sortOrder: 3 },
];
