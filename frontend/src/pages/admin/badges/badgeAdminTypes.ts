export type CatalogBadge = {
  badge_id: string;
  registry_id: string;
  name: string;
  description: string;
  is_secret: boolean;
  trigger_event_code: string;
  condition_type: 'boolean' | 'count' | string;
  condition_value: number;
  badge_category_id: string;
  category_name: string;
  claimed_count: number;
  pending_count: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type BadgeCategory = {
  badge_category_id: string;
  name: string;
  description: string;
};

export type BadgeFormState = {
  registryId: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categoryDescription: string;
  isSecret: boolean;
  triggerEventCode: string;
  customTrigger: string;
  conditionType: 'boolean' | 'count';
  conditionValue: string;
};

export const TRIGGER_OPTIONS: { value: string; label: string }[] = [
  { value: 'admin_grant', label: 'Honorary / admin grant' },
  { value: 'alpha_access', label: 'Signup during alpha' },
  { value: 'beta_access', label: 'Beta flag' },
  { value: 'profile_complete', label: 'Profile checklist 100%' },
  { value: 'gig_completed', label: 'Successful freelancer close' },
  { value: 'contract_funded', label: 'Successful client close' },
  { value: 'asset_published', label: 'Marketplace asset published' },
  { value: 'custom', label: 'Custom trigger' },
];

export const emptyBadgeForm = (): BadgeFormState => ({
  registryId: '',
  name: '',
  description: '',
  categoryId: '',
  categoryName: '',
  categoryDescription: '',
  isSecret: false,
  triggerEventCode: 'admin_grant',
  customTrigger: '',
  conditionType: 'boolean',
  conditionValue: '1',
});

export const formFromBadge = (badge: CatalogBadge): BadgeFormState => {
  const known = TRIGGER_OPTIONS.some((option) => option.value === badge.trigger_event_code);
  return {
    registryId: badge.registry_id,
    name: badge.name,
    description: badge.description,
    categoryId: badge.badge_category_id,
    categoryName: '',
    categoryDescription: '',
    isSecret: Boolean(badge.is_secret),
    triggerEventCode: known ? badge.trigger_event_code : 'custom',
    customTrigger: known ? '' : badge.trigger_event_code,
    conditionType: badge.condition_type === 'count' ? 'count' : 'boolean',
    conditionValue: String(badge.condition_value ?? 1),
  };
};

export const errorMessage = (err: unknown, fallback: string) => {
  const response = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return response || fallback;
};
