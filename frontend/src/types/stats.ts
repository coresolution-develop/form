export interface Distribution {
  value: string;
  count: number;
  ratio: number;
}

export interface NumberStats {
  count: number;
  average: number;
  min: number;
  max: number;
  sum: number;
}

export interface FieldStat {
  fieldId: number;
  label: string;
  type: string;
  /** 이 필드에 응답한 인원 수(빈 답 제외). 조건부 필드 분석에 유용. */
  answeredCount: number;
  distribution?: Distribution[];
  sampleAnswers?: string[];
  numberStats?: NumberStats;
}

export interface StatsResponse {
  totalResponses: number;
  fields: FieldStat[];
}
