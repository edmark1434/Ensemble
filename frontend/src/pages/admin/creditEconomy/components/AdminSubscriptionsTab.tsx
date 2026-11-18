import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Info, Loader2, Lock, Pencil, Save, Search, X } from 'lucide-react';
import api from '@/lib/axios';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';

interface PlanFeature {
  feature_id: string;
  feature_key?: string;
  title: string;
  value: string;
}

interface CatalogFeature {
  feature_id: string;
  feature_key?: string;
  title: string;
  description?: string;
}

interface Plan {
  plan_id: string;
  name: string;
  description: string;
  price: number;
  days_of_trials: number;
  is_free?: boolean;
  features: PlanFeature[];
}

type PlanRules = { descriptionMax: number; priceMax: number; trialDaysMax: number; featureValueMax: number };
type PlansPayload = { plans: Plan[]; allFeatures: CatalogFeature[]; rules?: PlanRules };
type FieldErrors = Record<string, string>;

const PLANS_URL = '/api/admin/subscriptions/plans';
const FALLBACK_RULES: PlanRules = { descriptionMax: 500, priceMax: 100000, trialDaysMax: 90, featureValueMax: 100 };

const INPUT =
  'w-full rounded-xl border bg-[#0c0d12] px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50';
const tone = (invalid?: boolean) =>
  invalid ? 'border-amber-500/50 focus:ring-amber-500/15' : 'border-white/10 focus:border-rose-500/40 focus:ring-rose-500/15';

function cachedPlans(): PlansPayload | null {
  const cached = peekStaffGet(PLANS_URL);
  return cached?.data?.success ? cached.data.data : null;
}

const isFreePlan = (plan: Plan) => plan.is_free ?? Number(plan.price) === 0;

const formatPrice = (price: number) =>
  `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function planIcon(name: string) {
  const key = name.toLowerCase();
  if (key === 'premium') return '/icons/subscription/premium.png';
  if (key === 'business' || key === 'studio') return '/icons/subscription/studio.png';
  return '/icons/subscription/freemium.png';
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-300">
      <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
      {children}
    </p>
  );
}

type EditForm = {
  description: string;
  priceText: string;
  trialText: string;
  features: { feature_id: string; value: string }[];
};

function formFromPlan(plan: Plan): EditForm {
  return {
    description: plan.description || '',
    priceText: String(plan.price),
    trialText: String(plan.days_of_trials || 0),
    features: plan.features.map((f) => ({ feature_id: f.feature_id, value: f.value ?? '' })),
  };
}

function validate(form: EditForm, plan: Plan, rules: PlanRules): FieldErrors {
  const errors: FieldErrors = {};
  const free = isFreePlan(plan);
  const description = form.description.trim();
  if (!description) errors.description = 'Required.';
  else if (description.length > rules.descriptionMax) errors.description = `Use ${rules.descriptionMax} characters or fewer.`;

  const price = Number(form.priceText);
  if (form.priceText.trim() === '' || !Number.isFinite(price)) errors.price = 'Enter a number.';
  else if (Math.abs(Math.round(price * 100) - price * 100) > 1e-6) errors.price = 'Use at most 2 decimal places.';
  else if (free && price !== 0) errors.price = 'The free plan must stay at ₱0.';
  else if (!free && (price < 1 || price > rules.priceMax)) errors.price = `Enter a price from ₱1 to ₱${rules.priceMax.toLocaleString()}.`;

  const days = Number(form.trialText);
  if (form.trialText.trim() === '' || !Number.isInteger(days) || days < 0 || days > rules.trialDaysMax) {
    errors.days_of_trials = `Enter a whole number from 0 to ${rules.trialDaysMax}.`;
  } else if (free && days > 0) {
    errors.days_of_trials = 'The free plan has no trial.';
  }

  for (const f of form.features) {
    if (f.value.trim().length > rules.featureValueMax) errors[`features.${f.feature_id}`] = `Use ${rules.featureValueMax} characters or fewer.`;
  }
  return errors;
}

function PlanEditor({
  plan,
  catalog,
  rules,
  onClose,
  onSaved,
}: {
  plan: Plan;
  catalog: CatalogFeature[];
  rules: PlanRules;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<EditForm>(() => formFromPlan(plan));
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const titleId = useId();
  const free = isFreePlan(plan);

  const initial = useMemo(() => JSON.stringify(formFromPlan(plan)), [plan]);
  const dirty = JSON.stringify(form) !== initial;
  const errors = { ...validate(form, plan, rules), ...serverErrors };
  const hasErrors = Object.keys(errors).length > 0;

  const close = () => {
    if (saving) return;
    if (dirty && !window.confirm('Discard your changes to this plan?')) return;
    onClose();
  };
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const update = (patch: Partial<EditForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    if (Object.keys(serverErrors).length) setServerErrors({});
  };
  const selected = new Map(form.features.map((f) => [f.feature_id, f]));
  const toggle = (featureId: string) =>
    update({
      features: selected.has(featureId)
        ? form.features.filter((f) => f.feature_id !== featureId)
        : [...form.features, { feature_id: featureId, value: '' }],
    });
  const setValue = (featureId: string, value: string) =>
    update({ features: form.features.map((f) => (f.feature_id === featureId ? { ...f, value } : f)) });

  const q = query.trim().toLowerCase();
  const visible = q ? catalog.filter((f) => f.title.toLowerCase().includes(q) || f.feature_key?.toLowerCase().includes(q)) : catalog;

  const save = async () => {
    if (hasErrors || !dirty) return;
    setSaving(true);
    try {
      await api.put(`/api/admin/subscriptions/plans/${plan.plan_id}`, {
        description: form.description.trim(),
        price: Number(form.priceText),
        days_of_trials: Number(form.trialText),
        features: form.features.map((f) => ({ feature_id: f.feature_id, value: f.value.trim() })),
      });
      showSuccessToast(`${plan.name} plan saved`);
      await onSaved();
      onClose();
    } catch (err: unknown) {
      const body = (err as { response?: { data?: { message?: string; errors?: FieldErrors } } })?.response?.data;
      if (body?.errors) setServerErrors(body.errors);
      showErrorToast(body?.message || 'The plan could not be saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:pl-[260px]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="absolute inset-0 bg-black/70" onClick={close} aria-label="Close" />
      <div className="relative flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={planIcon(plan.name)} alt="" className="h-8 w-8 object-contain" />
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-bold text-white">
                Edit {plan.name} plan
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">Members see these details on the Credits &amp; Subscriptions page.</p>
            </div>
          </div>
          <button type="button" onClick={close} className="rounded-lg p-1.5 text-zinc-400 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto px-5 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-zinc-500">Plan name</p>
              <p className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-zinc-300">
                <Lock className="h-3.5 w-3.5 text-zinc-500" />
                {plan.name}
              </p>
              <p className="mt-1 text-[11px] text-zinc-600">Names identify tiers in code (free plan, team limits), so they are fixed.</p>
            </div>
            <div>
              <label htmlFor={`${titleId}-price`} className="mb-1.5 block text-[11px] font-medium text-zinc-500">
                Monthly price
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500">₱</span>
                <input
                  id={`${titleId}-price`}
                  type="text"
                  inputMode="decimal"
                  value={form.priceText}
                  disabled={free}
                  onChange={(e) => update({ priceText: e.target.value.replace(/[^\d.]/g, '') })}
                  className={`${INPUT} ${tone(Boolean(errors.price))} pl-7 tabular-nums`}
                />
              </div>
              <FieldError>{errors.price}</FieldError>
              {free && <p className="mt-1 text-[11px] text-zinc-600">The free plan stays at ₱0.</p>}
            </div>
            <div>
              <label htmlFor={`${titleId}-trial`} className="mb-1.5 block text-[11px] font-medium text-zinc-500">
                Free trial
              </label>
              <div className="relative">
                <input
                  id={`${titleId}-trial`}
                  type="text"
                  inputMode="numeric"
                  value={form.trialText}
                  disabled={free}
                  onChange={(e) => update({ trialText: e.target.value.replace(/\D/g, '') })}
                  className={`${INPUT} ${tone(Boolean(errors.days_of_trials))} pr-14 tabular-nums`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">days</span>
              </div>
              <FieldError>{errors.days_of_trials}</FieldError>
            </div>
            <div>
              <label htmlFor={`${titleId}-description`} className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-zinc-500">
                Description
                <span className={form.description.trim().length > rules.descriptionMax ? 'text-amber-300' : 'text-zinc-600'}>
                  {form.description.trim().length}/{rules.descriptionMax}
                </span>
              </label>
              <textarea
                id={`${titleId}-description`}
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={4}
                className={`${INPUT} ${tone(Boolean(errors.description))} resize-none`}
              />
              <FieldError>{errors.description}</FieldError>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-zinc-500">Included features</p>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">{form.features.length} included</span>
            </div>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter features"
                aria-label="Filter features"
                className={`${INPUT} ${tone()} pl-8`}
              />
            </div>
            <FieldError>{errors.features}</FieldError>
            <ul className="max-h-[340px] divide-y divide-white/[0.05] overflow-y-auto rounded-xl border border-white/[0.08] bg-[#0c0d12]">
              {visible.map((feature) => {
                const current = selected.get(feature.feature_id);
                const valueError = errors[`features.${feature.feature_id}`];
                return (
                  <li key={feature.feature_id} className={`px-3 py-2.5 ${current ? 'bg-rose-500/[0.04]' : ''}`}>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={Boolean(current)}
                        aria-label={feature.title}
                        onClick={() => toggle(feature.feature_id)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                          current ? 'border-rose-400 bg-rose-500' : 'border-white/20 hover:border-white/40'
                        }`}
                      >
                        {current && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(feature.feature_id)}
                        className={`min-w-0 flex-1 text-left text-sm ${current ? 'font-medium text-white' : 'text-zinc-400'}`}
                      >
                        {feature.title}
                      </button>
                      {current && (
                        <input
                          type="text"
                          value={current.value}
                          onChange={(e) => setValue(feature.feature_id, e.target.value)}
                          placeholder="e.g. 1080p, Unlimited"
                          aria-label={`${feature.title} value`}
                          className={`w-1/2 rounded-lg border bg-[#14151c] px-2 py-1 text-right text-xs text-emerald-300 outline-none focus:ring-2 ${tone(Boolean(valueError))}`}
                        />
                      )}
                    </div>
                    <FieldError>{valueError}</FieldError>
                  </li>
                );
              })}
              {!visible.length && <li className="px-3 py-4 text-xs text-zinc-500">No features match “{query}”.</li>}
            </ul>
            <p className="mt-2 text-[11px] text-zinc-600">
              Some values are read by the product (for example team or upload limits), so keep the format consistent: a number, “Unlimited”, or a resolution.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.08] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-[11px] text-zinc-500">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            Members see changes right away. Recurring billing already set up with the payment provider is not changed by this save.
          </p>
          <div className="flex shrink-0 justify-end gap-2">
            <button type="button" onClick={close} disabled={saving} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:text-white">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || hasErrors || !dirty}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500/90 px-5 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminSubscriptionsTab() {
  const [payload, setPayload] = useState<PlansPayload | null>(cachedPlans);
  const [loading, setLoading] = useState(() => !cachedPlans());
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<Plan | null>(null);

  const fetchPlans = async () => {
    try {
      const res = await staffGet(PLANS_URL);
      if (res.data?.success) {
        setPayload(res.data.data);
        setLoadError('');
      } else {
        setLoadError('Subscription plans could not be loaded.');
      }
    } catch {
      setLoadError('Subscription plans could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlans();
  }, []);

  const rules = payload?.rules ?? FALLBACK_RULES;
  const plans = payload?.plans ?? [];

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Subscription plans</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Monthly price, free trial and included features of each membership tier.</p>
      </div>

      {loading && !payload ? (
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="console-skeleton h-56 rounded-2xl" />
          ))}
        </div>
      ) : loadError && !payload ? (
        <div className="p-5">
          <p className="text-sm text-red-200">{loadError}</p>
          <button type="button" onClick={() => void fetchPlans()} className="mt-3 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:text-white">
            Try again
          </button>
        </div>
      ) : (
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {plans.map((plan) => {
            const free = isFreePlan(plan);
            return (
              <article key={plan.plan_id} className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2.5">
                  <img src={planIcon(plan.name)} alt="" className="h-8 w-8 object-contain" />
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-zinc-400">{plan.description}</p>
                <p className="mt-4 text-2xl font-bold text-white">
                  {free ? 'Free' : formatPrice(plan.price)}
                  {!free && <span className="ml-1 text-sm font-normal text-zinc-500">/mo</span>}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {plan.days_of_trials > 0 ? `${plan.days_of_trials}-day free trial` : 'No free trial'}
                </p>
                <div className="my-4 h-px bg-white/[0.06]" />
                <ul className="flex-1 space-y-2">
                  {plan.features.length ? (
                    plan.features.map((feature) => (
                      <li key={feature.feature_id} className="flex items-start gap-2 text-xs">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span className="text-zinc-300">
                          {feature.title}
                          {feature.value && <strong className="ml-1 font-semibold text-white">{feature.value}</strong>}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-zinc-500">No features assigned</li>
                  )}
                </ul>
                <button
                  type="button"
                  onClick={() => setEditing(plan)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <Pencil className="h-4 w-4" />
                  Edit plan
                </button>
              </article>
            );
          })}
          {!plans.length && <p className="text-sm text-zinc-500">No subscription plans found.</p>}
        </div>
      )}

      {editing && payload && (
        <PlanEditor
          plan={editing}
          catalog={payload.allFeatures}
          rules={rules}
          onClose={() => setEditing(null)}
          onSaved={fetchPlans}
        />
      )}
    </section>
  );
}
