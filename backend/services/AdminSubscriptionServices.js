const {
  listPlansWithFeatures,
  lockPlan,
  listPlanFeatureValues,
  listExistingFeatures,
  updatePlanRow,
  replacePlanFeatures,
  withPlanTransaction,
} = require('../repositories/AdminSubscriptionRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { resolveStaffForSession } = require('../lib/StaffSession');

class PlanServiceError extends Error {
  constructor(message, statusCode = 400, { code = null, errors = null } = {}) {
    super(message);
    this.name = 'PlanServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PLAN_RULES = Object.freeze({
  descriptionMax: 500,
  priceMax: 100000,
  trialDaysMax: 90,
  featureValueMax: 100, // plan_features.value is varchar(100)
});

function mapPlans({ plans, features, planFeatures }) {
  const byPlan = new Map();
  for (const row of planFeatures) {
    const list = byPlan.get(row.plan_id) || [];
    list.push({ feature_id: row.feature_id, feature_key: row.feature_key, title: row.title, value: row.value ?? '' });
    byPlan.set(row.plan_id, list);
  }
  return {
    plans: plans.map((plan) => ({
      plan_id: plan.plan_id,
      name: plan.name,
      description: plan.description,
      billing_period: plan.billing_period,
      price: Number(plan.amount_php_cents) / 100,
      days_of_trials: Number(plan.days_of_trials) || 0,
      is_free: Number(plan.amount_php_cents) === 0,
      updated_at: plan.updated_at,
      features: byPlan.get(plan.plan_id) || [],
    })),
    allFeatures: features.map((feature) => ({
      feature_id: feature.feature_id,
      feature_key: feature.feature_key,
      title: feature.name || feature.feature_key,
      description: feature.description || '',
    })),
    rules: PLAN_RULES,
  };
}

async function getAdminPlansService() {
  return mapPlans(await listPlansWithFeatures());
}

function readFeatures(raw, errors) {
  if (!Array.isArray(raw)) {
    errors.features = 'Features must be a list.';
    return [];
  }
  const seen = new Set();
  const features = [];
  for (const item of raw) {
    const featureId = String(item?.feature_id || '').trim();
    if (!UUID_PATTERN.test(featureId)) {
      errors.features = 'One of the features is not valid.';
      continue;
    }
    if (seen.has(featureId)) continue;
    seen.add(featureId);
    const value = typeof item?.value === 'string' ? item.value.trim() : String(item?.value ?? '').trim();
    if (value.length > PLAN_RULES.featureValueMax) {
      errors[`features.${featureId}`] = `Use ${PLAN_RULES.featureValueMax} characters or fewer.`;
    }
    features.push({ featureId, value });
  }
  return features;
}

function planChanges(before, after, beforeFeatures, afterFeatures, titles) {
  const changes = [];
  const push = (label, from, to) => changes.push({ label, from: String(from), to: String(to) });
  if (before.amount_php_cents !== after.amount_php_cents) {
    push('Monthly price (PHP)', before.amount_php_cents / 100, after.amount_php_cents / 100);
  }
  if ((before.days_of_trials || 0) !== (after.days_of_trials || 0)) {
    push('Trial days', before.days_of_trials || 0, after.days_of_trials || 0);
  }
  if ((before.description || '') !== (after.description || '')) push('Description', 'Previous text', 'Updated text');
  if (afterFeatures) {
    const prev = new Map(beforeFeatures.map((f) => [f.feature_id, f.value ?? '']));
    const next = new Map(afterFeatures.map((f) => [f.featureId, f.value ?? '']));
    for (const [id, value] of prev) {
      if (!next.has(id)) push(`Feature: ${titles.get(id) || id}`, value || 'Included', 'Removed');
    }
    for (const [id, value] of next) {
      if (!prev.has(id)) push(`Feature: ${titles.get(id) || id}`, '—', value || 'Included');
      else if (prev.get(id) !== value) push(`Feature: ${titles.get(id) || id}`, prev.get(id) || '—', value || '—');
    }
  }
  return changes;
}

/**
 * Update a plan's price, trial and description, and optionally its feature list, in one
 * transaction. Plan names are not editable: code finds the free plan and tier limits by
 * name (SubscriptionServices, TeamsRepositories), so a rename would break them.
 */
async function updateAdminPlanService({ planId, body = {}, session = null, featuresOnly = false }) {
  if (!UUID_PATTERN.test(String(planId || ''))) {
    throw new PlanServiceError('Plan not found.', 404, { code: 'PLAN_NOT_FOUND' });
  }
  const actor = await resolveStaffForSession(session).catch(() => null);

  const outcome = await withPlanTransaction(async (client) => {
    const plan = await lockPlan(client, planId);
    if (!plan) throw new PlanServiceError('Plan not found.', 404, { code: 'PLAN_NOT_FOUND' });

    const errors = {};
    const isFree = Number(plan.amount_php_cents) === 0;

    if (!featuresOnly && body.name !== undefined && String(body.name).trim() !== plan.name) {
      errors.name = 'Plan names identify tiers in code and cannot be renamed here.';
    }

    let description = plan.description;
    let amountPhpCents = Number(plan.amount_php_cents);
    let daysOfTrials = Number(plan.days_of_trials) || 0;

    if (!featuresOnly) {
      if (body.description !== undefined) {
        description = typeof body.description === 'string' ? body.description.trim() : '';
        if (!description) errors.description = 'Required.';
        else if (description.length > PLAN_RULES.descriptionMax) errors.description = `Use ${PLAN_RULES.descriptionMax} characters or fewer.`;
      }
      if (body.price !== undefined) {
        const price = Number(body.price);
        if (!Number.isFinite(price)) errors.price = 'Enter a number.';
        else if (Math.abs(Math.round(price * 100) - price * 100) > 1e-6) errors.price = 'Use at most 2 decimal places.';
        else if (isFree && price !== 0) errors.price = 'The free plan must stay at ₱0. Other code finds it by its ₱0 price.';
        else if (!isFree && (price < 1 || price > PLAN_RULES.priceMax)) errors.price = `Enter a price from ₱1 to ₱${PLAN_RULES.priceMax.toLocaleString('en-US')}.`;
        else amountPhpCents = Math.round(price * 100);
      }
      if (body.days_of_trials !== undefined) {
        const days = Number(body.days_of_trials);
        if (!Number.isInteger(days) || days < 0 || days > PLAN_RULES.trialDaysMax) {
          errors.days_of_trials = `Enter a whole number from 0 to ${PLAN_RULES.trialDaysMax}.`;
        } else if (isFree && days > 0) {
          errors.days_of_trials = 'The free plan has no trial.';
        } else {
          daysOfTrials = days;
        }
      }
    }

    const wantsFeatures = body.features !== undefined;
    const features = wantsFeatures ? readFeatures(body.features, errors) : null;
    let titles = new Map();
    if (features && features.length && !errors.features) {
      const existing = await listExistingFeatures(client, features.map((f) => f.featureId));
      titles = new Map(existing.map((f) => [f.feature_id, f.name]));
      if (existing.length !== features.length) errors.features = 'One of the features no longer exists. Reload and try again.';
    }

    if (Object.keys(errors).length) {
      throw new PlanServiceError('Some plan details need attention before they can be saved.', 400, {
        code: 'PLAN_INVALID',
        errors,
      });
    }

    const beforeFeatures = await listPlanFeatureValues(client, planId);
    for (const f of beforeFeatures) titles.set(f.feature_id, f.title);

    const updated = featuresOnly
      ? plan
      : await updatePlanRow(client, planId, { description, amountPhpCents, daysOfTrials });
    if (features) await replacePlanFeatures(client, planId, features);

    const changes = planChanges(
      plan,
      { amount_php_cents: amountPhpCents, days_of_trials: daysOfTrials, description },
      beforeFeatures,
      features,
      titles
    );

    if (changes.length && actor?.account_id) {
      await client.query('SAVEPOINT plan_audit');
      const row = await recordAccountActivity({
        client,
        accountId: actor.account_id,
        action: `Updated ${plan.name} subscription plan`,
        eventCode: 'SUBSCRIPTION_PLAN_UPDATED',
        referenceTable: 'plans',
        referenceId: planId,
        actorStaffId: actor.staff_id,
        metadata: { planName: plan.name, changeCount: changes.length, changes: changes.slice(0, 40) },
      });
      await client.query(row ? 'RELEASE SAVEPOINT plan_audit' : 'ROLLBACK TO SAVEPOINT plan_audit');
    }

    return { plan: updated, changeCount: changes.length };
  });

  return outcome;
}

module.exports = {
  PlanServiceError,
  PLAN_RULES,
  getAdminPlansService,
  updateAdminPlanService,
};
