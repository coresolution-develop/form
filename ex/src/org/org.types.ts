import { Org } from '@prisma/client';

export interface CreateOrgDto {
  name: string;
  slug: string;
  webhookSecret: string;
  sheetId?: string;
  gridTabPrefix?: string;
  settingsTab?: string;
  activeMonth?: string;
}

export type UpdateOrgDto = Partial<CreateOrgDto>;

/** 공개 응답 — webhookSecret 은 절대 노출하지 않는다. */
export interface OrgPublic {
  id: string;
  slug: string;
  name: string;
  sheetId: string;
  gridTabPrefix: string;
  settingsTab: string;
  activeMonth: string;
}

export function toPublicOrg(o: Org): OrgPublic {
  return {
    id: o.id,
    slug: o.slug,
    name: o.name,
    sheetId: o.sheetId,
    gridTabPrefix: o.gridTabPrefix,
    settingsTab: o.settingsTab,
    activeMonth: o.activeMonth,
  };
}
