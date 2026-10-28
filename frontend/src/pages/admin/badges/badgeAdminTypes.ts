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
  requirements: BadgeRequirement[];
};

export type RequirementOperator = 'gte' | 'eq' | 'lte';

export type BadgeRequirement = {
  requirement_def_id: string;
  code: string;
  metric: string;
  name: string;
  slug?: string;
  operator: RequirementOperator | string;
  threshold: number;
  kind: 'boolean' | 'count' | string;
  description?: string;
};

export type RequirementType = {
  code: string;
  label: string;
  group: string;
  kind: 'boolean' | 'count';
  description: string;
};

export type RequirementDef = {
  requirement_def_id: string;
  slug: string;
  name: string;
  description: string;
  metric: string;
  operator: RequirementOperator | string;
  threshold: number;
  is_system: boolean;
  kind: 'boolean' | 'count' | string;
  attached_count: number;
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
  requirements: BadgeRequirement[];
};

export const OPERATORS: { id: RequirementOperator; label: string }[] = [
  { id: 'gte', label: 'at least' },
  { id: 'eq', label: 'exactly' },
  { id: 'lte', label: 'at most' },
];

export const emptyBadgeForm = (): BadgeFormState => ({
  registryId: '',
  name: '',
  description: '',
  categoryId: '',
  categoryName: '',
  categoryDescription: '',
  isSecret: false,
  requirements: [],
});

export const formFromBadge = (badge: CatalogBadge): BadgeFormState => ({
  registryId: badge.registry_id,
  name: badge.name,
  description: badge.description,
  categoryId: badge.badge_category_id,
  categoryName: '',
  categoryDescription: '',
  isSecret: Boolean(badge.is_secret),
  requirements: (badge.requirements || []).map((requirement) => ({
    requirement_def_id: requirement.requirement_def_id,
    code: requirement.metric || requirement.code,
    metric: requirement.metric || requirement.code,
    name: requirement.name || requirement.code,
    slug: requirement.slug,
    operator: requirement.operator || 'gte',
    threshold: Number(requirement.threshold || 1),
    kind: requirement.kind || 'count',
    description: requirement.description,
  })),
});

export const errorMessage = (err: unknown, fallback: string) => {
  const response = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return response || fallback;
};

export function operatorLabel(operator: string) {
  return OPERATORS.find((item) => item.id === operator)?.label || operator;
}

export function formatRequirement(requirement: Pick<RequirementDef, 'name' | 'metric' | 'operator' | 'threshold' | 'kind'>, types: RequirementType[]) {
  if (requirement.name) return requirement.name;
  const type = types.find((item) => item.code === requirement.metric);
  const label = type?.label || requirement.metric;
  if ((requirement.kind || type?.kind) === 'boolean') return label;
  return `${label} ${operatorLabel(requirement.operator)} ${requirement.threshold}`;
}

export function summarizeRequirements(badge: CatalogBadge, types: RequirementType[]) {
  const requirements = badge.requirements || [];
  if (!requirements.length) return 'Honorary — grant only';
  return requirements.map((requirement) => formatRequirement(requirement, types)).join(' + ');
}
