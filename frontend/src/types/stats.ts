export interface Distribution {
  value: string;
  count: number;
  ratio: number;
}

export interface FieldStat {
  fieldId: number;
  label: string;
  type: string;
  distribution?: Distribution[];
  sampleAnswers?: string[];
}

export interface StatsResponse {
  totalResponses: number;
  fields: FieldStat[];
}
