export interface ResponseAnswer {
  fieldId: number;
  label: string;
  value: string;
}

export interface ResponseListItem {
  id: number;
  respondentKey: string;
  submittedAt: string;
  answers: ResponseAnswer[];
}
