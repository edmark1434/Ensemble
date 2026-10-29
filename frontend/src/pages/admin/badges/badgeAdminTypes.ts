export type CatalogBadge = {
  badge_id: string;
  registry_id: string;
  name: string;
  description: string;
  is_secret: boolean;
  trigger_event_code: string;
  condition_type: 'boolean' | 'count' | string;
  condition_value: number;
  category: string;
  claimed_count: number;
  pending_count: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type RequirementType = {
  code: string;
  label: string;
  group: string;
  kind: 'boolean' | 'count';
  description: string;
};

export type BadgeFormState = {
  registryId: string;
  name: string;
  description: string;
  category: string;
  isSecret: boolean;
  triggerEventCode: string;
  conditionValue: number;
};

export const emptyBadgeForm = (): BadgeFormState => ({
  registryId: '',
  name: '',
  description: '',
  category: 'Milestones',
  isSecret: false,
  triggerEventCode: 'admin_grant',
  conditionValue: 1,
});

export const formFromBadge = (badge: CatalogBadge): BadgeFormState => ({
  registryId: badge.registry_id,
  name: badge.name,
  description: badge.description,
  category: badge.category || 'Milestones',
  isSecret: Boolean(badge.is_secret),
  triggerEventCode: badge.trigger_event_code || 'admin_grant',
  conditionValue: Number(badge.condition_value || 1),
});

export const errorMessage = (err: unknown, fallback: string) => {
  const response = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return response || fallback;
};

export function summarizeUnlock(badge: CatalogBadge, types: RequirementType[]) {
  const code = badge.trigger_event_code || 'admin_grant';
  if (code === 'admin_grant') return 'Honorary — grant only';
  const type = types.find((item) => item.code === code);
  if ((type?.kind || badge.condition_type) === 'boolean') return type?.label || code;
  return `${type?.label || code} at least ${badge.condition_value}`;
}
