import { useId, useState } from 'react';
import { ChevronDown, Coins, Link2, Package, Percent, Plus, Store, Trash2 } from 'lucide-react';
import type {
  CreditPackage,
  EconomySettings,
  FeeSetting,
  FeeUsage,
  FieldErrors,
  MarketplaceSettings,
  SettingsRules,
} from './settingsTypes';
import {
  FieldError,
  NumberInput,
  SettingRow,
  SettingsCard,
  Switch,
  TextInput,
  useFieldIds,
} from './settingsUi';

type Props = {
  draft: EconomySettings;
  saved: EconomySettings;
  defaults?: EconomySettings;
  rules: SettingsRules['economy'];
  feeUsage: Record<string, FeeUsage>;
  errors: FieldErrors;
  onChange: (next: EconomySettings) => void;
};

const php = (value: number, digits = 2) =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: digits })}`;

function perCreditLabel(pkg: CreditPackage, creditValuePhp: number) {
  if (!Number.isFinite(pkg.credits) || !Number.isFinite(pkg.pricePhp) || pkg.credits <= 0) return null;
  const perCredit = pkg.pricePhp / pkg.credits;
  const base = Number.isFinite(creditValuePhp) && creditValuePhp > 0 ? creditValuePhp : null;
  const discount = base ? Math.round((1 - perCredit / base) * 100) : null;
  return {
    perCredit: php(perCredit, 3),
    discount: discount == null || discount === 0 ? null : discount,
  };
}

// ---------------------------------------------------------------------------
// Credit packages
// ---------------------------------------------------------------------------

function PackageRow({
  pkg,
  saved,
  creditValuePhp,
  rules,
  errors,
  onChange,
  onRemove,
}: {
  pkg: CreditPackage;
  saved?: CreditPackage;
  creditValuePhp: number;
  rules: SettingsRules['economy'];
  errors: FieldErrors;
  onChange: (next: CreditPackage) => void;
  onRemove: () => void;
}) {
  const base = `creditPackages.${pkg.id}`;
  const rowId = useId();
  const value = perCreditLabel(pkg, creditValuePhp);
  const isNew = !saved;
  const edited = !isNew && (saved.name !== pkg.name || saved.credits !== pkg.credits || saved.pricePhp !== pkg.pricePhp || saved.active !== pkg.active);

  return (
    <li className={`px-5 py-4 ${pkg.active ? '' : 'bg-white/[0.015]'}`}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <label htmlFor={`${rowId}-name`} className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-zinc-500">
            Package name
            {isNew && <span className="rounded-full bg-emerald-500/15 px-1.5 py-px text-[10px] text-emerald-300">New</span>}
            {edited && <span className="rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] text-amber-200">Edited</span>}
          </label>
          <TextInput
            id={`${rowId}-name`}
            value={pkg.name}
            onChange={(name) => onChange({ ...pkg, name })}
            invalid={Boolean(errors[`${base}.name`])}
            maxLength={rules.packageName.max}
          />
          <FieldError>{errors[`${base}.name`]}</FieldError>
        </div>
        <div className="min-w-0">
          <label htmlFor={`${rowId}-credits`} className="mb-1.5 block text-[11px] font-medium text-zinc-500">
            Credits
          </label>
          <NumberInput
            id={`${rowId}-credits`}
            value={pkg.credits}
            onChange={(credits) => onChange({ ...pkg, credits })}
            rule={rules.packageCredits}
            invalid={Boolean(errors[`${base}.credits`])}
          />
          <FieldError>{errors[`${base}.credits`]}</FieldError>
        </div>
        <div className="min-w-0">
          <label htmlFor={`${rowId}-price`} className="mb-1.5 block text-[11px] font-medium text-zinc-500">
            Price
          </label>
          <NumberInput
            id={`${rowId}-price`}
            value={pkg.pricePhp}
            onChange={(pricePhp) => onChange({ ...pkg, pricePhp })}
            rule={rules.packagePricePhp}
            invalid={Boolean(errors[`${base}.pricePhp`])}
            prefix="₱"
          />
          <FieldError>{errors[`${base}.pricePhp`]}</FieldError>
        </div>
        <div className="flex items-center justify-between gap-4 md:flex-col md:items-end md:justify-start md:pt-6">
          <div className="flex items-center gap-2">
            <span className={`text-xs ${pkg.active ? 'text-white' : 'text-zinc-500'}`}>{pkg.active ? 'On sale' : 'Hidden'}</span>
            <Switch label={`${pkg.name || 'Package'} on sale`} checked={pkg.active} onChange={(active) => onChange({ ...pkg, active })} />
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300"
            aria-label={`Remove ${pkg.name || 'package'}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
        {value && (
          <span>
            {value.perCredit} per credit
            {value.discount != null && (
              <span className={value.discount > 0 ? 'text-emerald-300' : 'text-amber-200'}>
                {' '}
                · {value.discount > 0 ? `${value.discount}% below` : `${Math.abs(value.discount)}% above`} the base rate
              </span>
            )}
          </span>
        )}
        <span>
          {(pkg.salesCount ?? 0).toLocaleString()} paid top-up{pkg.salesCount === 1 ? '' : 's'} at this price
        </span>
      </div>
    </li>
  );
}

function suggestCredits(packages: CreditPackage[]) {
  const amounts = packages.filter((p) => Number.isFinite(p.credits)).map((p) => p.credits);
  return amounts.length ? Math.max(...amounts) + 1000 : 1000;
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

function FeeRow({
  fee,
  saved,
  fallback,
  usage,
  rules,
  errors,
  onChange,
}: {
  fee: FeeSetting;
  saved?: FeeSetting;
  fallback?: FeeSetting;
  usage: FeeUsage;
  rules: SettingsRules['economy'];
  errors: FieldErrors;
  onChange: (next: FeeSetting) => void;
}) {
  const ids = useFieldIds(fee.id);
  const percentError = errors[`feeSettings.${fee.id}.percent`];
  const flatError = errors[`feeSettings.${fee.id}.flatFee`];
  const edited = saved ? saved.percent !== fee.percent || saved.flatFee !== fee.flatFee : false;
  const differsFromDefault = fallback
    ? (usage.percent && fallback.percent !== fee.percent) || (usage.flat && fallback.flatFee !== fee.flatFee)
    : false;
  const defaultLabel = fallback
    ? [usage.percent ? `${fallback.percent}%` : null, usage.flat ? `${fallback.flatFee} credits` : null].filter(Boolean).join(' + ')
    : null;

  return (
    <SettingRow
      label={fee.label}
      htmlFor={ids.input}
      description={
        <>
          {usage.note}
          {fee.paidBy && fee.paidBy !== '—' && <span className="text-zinc-600"> Paid by {fee.paidBy.toLowerCase()}.</span>}
        </>
      }
      modified={edited}
      defaultLabel={differsFromDefault ? defaultLabel : null}
      onReset={fallback ? () => onChange({ ...fee, percent: fallback.percent, flatFee: fallback.flatFee }) : undefined}
      control={
        <div className={`grid gap-2 ${usage.percent && usage.flat ? 'grid-cols-2' : ''}`}>
          {usage.percent && (
            <div>
              <NumberInput
                id={ids.input}
                value={fee.percent}
                onChange={(percent) => onChange({ ...fee, percent })}
                rule={rules.feePercent}
                invalid={Boolean(percentError)}
                suffix="%"
                ariaLabel={`${fee.label} percent`}
              />
              <FieldError>{percentError}</FieldError>
            </div>
          )}
          {usage.flat && (
            <div>
              <NumberInput
                id={usage.percent ? undefined : ids.input}
                value={fee.flatFee}
                onChange={(flatFee) => onChange({ ...fee, flatFee })}
                rule={rules.feeFlat}
                invalid={Boolean(flatError)}
                suffix={usage.percent ? '+ credits' : 'credits'}
                ariaLabel={`${fee.label} flat fee in credits`}
              />
              <FieldError>{flatError}</FieldError>
            </div>
          )}
        </div>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export default function EconomySettingsPanel({ draft, saved, defaults, rules, feeUsage, errors, onChange }: Props) {
  const [showUnused, setShowUnused] = useState(false);
  const creditValue = useFieldIds('credit-value');
  const listingFee = useFieldIds('listing-fee');
  const transactionFee = useFieldIds('transaction-fee');
  const minPayout = useFieldIds('min-payout');
  const refundWindow = useFieldIds('refund-window');

  const savedPackages = new Map(saved.creditPackages.map((p) => [p.id, p]));
  const savedFees = new Map(saved.feeSettings.map((f) => [f.id, f]));
  const defaultFees = new Map((defaults?.feeSettings || []).map((f) => [f.id, f]));

  const setPackage = (id: string, next: CreditPackage) =>
    onChange({ ...draft, creditPackages: draft.creditPackages.map((p) => (p.id === id ? next : p)) });
  const removePackage = (id: string) =>
    onChange({ ...draft, creditPackages: draft.creditPackages.filter((p) => p.id !== id) });
  const addPackage = () => {
    const credits = suggestCredits(draft.creditPackages);
    const rate = Number.isFinite(draft.creditValuePhp) && draft.creditValuePhp > 0 ? draft.creditValuePhp : 1;
    onChange({
      ...draft,
      creditPackages: [
        ...draft.creditPackages,
        { id: `pkg-${Date.now().toString(36)}`, name: 'New package', credits, pricePhp: Math.round(credits * rate), active: false, salesCount: 0 },
      ],
    });
  };
  const setFee = (next: FeeSetting) =>
    onChange({ ...draft, feeSettings: draft.feeSettings.map((f) => (f.id === next.id ? next : f)) });
  const setMarket = <K extends keyof MarketplaceSettings>(key: K, value: MarketplaceSettings[K]) =>
    onChange({ ...draft, marketplaceSettings: { ...draft.marketplaceSettings, [key]: value } });
  const marketDefault = defaults?.marketplaceSettings;
  const marketRow = (key: keyof MarketplaceSettings) => ({
    modified: draft.marketplaceSettings[key] !== saved.marketplaceSettings[key],
    defaultLabel: marketDefault && marketDefault[key] !== draft.marketplaceSettings[key] ? String(marketDefault[key]) : null,
    onReset: marketDefault ? () => setMarket(key, marketDefault[key]) : undefined,
    error: errors[`marketplaceSettings.${key}`],
  });

  const feesByMode = (mode: FeeUsage['mode']) =>
    draft.feeSettings.filter((fee) => (feeUsage[fee.id]?.mode ?? 'unused') === mode);
  const commissions = feesByMode('commission');
  const flatFees = feesByMode('flat');
  const linked = feesByMode('linked');
  const unused = feesByMode('unused');
  const activeCount = draft.creditPackages.filter((p) => p.active).length;

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={<Coins className="h-4 w-4" />}
        title="Credit value"
        description="The base exchange rate between credits and Philippine pesos."
      >
        <SettingRow
          label="Price of 1 credit"
          htmlFor={creditValue.input}
          description="Custom top-ups are charged at this rate and every cashout is converted with it. Package prices are set separately below."
          modified={draft.creditValuePhp !== saved.creditValuePhp}
          defaultLabel={defaults && defaults.creditValuePhp !== draft.creditValuePhp ? php(defaults.creditValuePhp, 4) : null}
          onReset={defaults ? () => onChange({ ...draft, creditValuePhp: defaults.creditValuePhp }) : undefined}
          error={errors.creditValuePhp}
          errorId={creditValue.error}
          control={
            <NumberInput
              id={creditValue.input}
              value={draft.creditValuePhp}
              onChange={(v) => onChange({ ...draft, creditValuePhp: v })}
              rule={rules.creditValuePhp}
              invalid={Boolean(errors.creditValuePhp)}
              prefix="₱"
              suffix="per credit"
              describedBy={errors.creditValuePhp ? creditValue.error : undefined}
            />
          }
        />
      </SettingsCard>

      <SettingsCard
        icon={<Package className="h-4 w-4" />}
        title="Credit packages"
        description={`Bundles on the member Credits page. ${activeCount} of ${draft.creditPackages.length} on sale. Members buy by credit amount, so packages on sale need different amounts.`}
        action={
          <button
            type="button"
            onClick={addPackage}
            disabled={draft.creditPackages.length >= rules.maxPackages}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:text-white disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add package
          </button>
        }
        flush
      >
        {errors.creditPackages && (
          <div className="px-5 pt-3">
            <FieldError>{errors.creditPackages}</FieldError>
          </div>
        )}
        {draft.creditPackages.length ? (
          <ul className="divide-y divide-white/[0.06]">
            {draft.creditPackages.map((pkg) => (
              <PackageRow
                key={pkg.id}
                pkg={pkg}
                saved={savedPackages.get(pkg.id)}
                creditValuePhp={draft.creditValuePhp}
                rules={rules}
                errors={errors}
                onChange={(next) => setPackage(pkg.id, next)}
                onRemove={() => removePackage(pkg.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-zinc-500">No packages. Members can still buy a custom amount at the credit price.</p>
        )}
        <p className="border-t border-white/[0.06] px-5 py-3 text-[11px] text-zinc-600">
          New packages start hidden. Removing or hiding a package takes it off the Credits page; past purchases are kept.
        </p>
      </SettingsCard>

      <SettingsCard
        icon={<Percent className="h-4 w-4" />}
        title="Platform fees"
        description="What the platform keeps from each kind of transaction. Changes apply to new charges right away."
      >
        {commissions.length > 0 && (
          <p className="pt-4 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Commissions</p>
        )}
        {commissions.map((fee) => (
          <FeeRow
            key={fee.id}
            fee={fee}
            saved={savedFees.get(fee.id)}
            fallback={defaultFees.get(fee.id)}
            usage={feeUsage[fee.id]}
            rules={rules}
            errors={errors}
            onChange={setFee}
          />
        ))}
        {flatFees.length > 0 && (
          <p className="pt-4 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Posting &amp; listing fees</p>
        )}
        {flatFees.map((fee) => (
          <FeeRow
            key={fee.id}
            fee={fee}
            saved={savedFees.get(fee.id)}
            fallback={defaultFees.get(fee.id)}
            usage={feeUsage[fee.id]}
            rules={rules}
            errors={errors}
            onChange={setFee}
          />
        ))}
        {linked.map((fee) => (
          <div key={fee.id} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{fee.label}</p>
              <p className="mt-1 text-xs text-zinc-500">{feeUsage[fee.id]?.note}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs tabular-nums text-zinc-300">
              <Link2 className="h-3 w-3 text-zinc-500" />
              {Number.isFinite(draft.marketplaceSettings.transactionFeePercent) ? `${draft.marketplaceSettings.transactionFeePercent}%` : '—'}
            </span>
          </div>
        ))}
        {unused.length > 0 && (
          <div className="py-3">
            <button
              type="button"
              onClick={() => setShowUnused((v) => !v)}
              aria-expanded={showUnused}
              className="flex w-full items-center justify-between gap-3 text-left text-xs text-zinc-500 transition hover:text-zinc-300"
            >
              <span>
                {unused.length} fee{unused.length === 1 ? ' is' : 's are'} listed for reference but not collected anywhere yet
              </span>
              <ChevronDown className={`h-4 w-4 transition ${showUnused ? 'rotate-180' : ''}`} />
            </button>
            {showUnused && (
              <ul className="mt-3 space-y-2">
                {unused.map((fee) => (
                  <li key={fee.id} className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-300">{fee.label}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">{feeUsage[fee.id]?.note || 'Not collected.'}</p>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">
                      {fee.percent ? `${fee.percent}%` : ''}
                      {fee.percent && fee.flatFee ? ' + ' : ''}
                      {fee.flatFee ? `${fee.flatFee} credits` : ''}
                      {!fee.percent && !fee.flatFee ? 'Free' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SettingsCard>

      <SettingsCard
        icon={<Store className="h-4 w-4" />}
        title="Marketplace rules"
        description="Asset listings, sales, refunds and cashouts."
      >
        <SettingRow
          label="Asset sale fee"
          htmlFor={transactionFee.input}
          description="Percent the platform keeps from each asset sale."
          {...marketRow('transactionFeePercent')}
          defaultLabel={marketRow('transactionFeePercent').defaultLabel ? `${marketDefault?.transactionFeePercent}%` : null}
          errorId={transactionFee.error}
          control={
            <NumberInput
              id={transactionFee.input}
              value={draft.marketplaceSettings.transactionFeePercent}
              onChange={(v) => setMarket('transactionFeePercent', v)}
              rule={rules.transactionFeePercent}
              invalid={Boolean(errors['marketplaceSettings.transactionFeePercent'])}
              suffix="%"
            />
          }
        />
        <SettingRow
          label="Asset listing fee"
          htmlFor={listingFee.input}
          description="Credits charged to list an asset. At 0, the “Uploading an asset” fee above applies instead."
          {...marketRow('listingFeeCredits')}
          defaultLabel={marketRow('listingFeeCredits').defaultLabel ? `${marketDefault?.listingFeeCredits} credits` : null}
          errorId={listingFee.error}
          control={
            <NumberInput
              id={listingFee.input}
              value={draft.marketplaceSettings.listingFeeCredits}
              onChange={(v) => setMarket('listingFeeCredits', v)}
              rule={rules.listingFeeCredits}
              invalid={Boolean(errors['marketplaceSettings.listingFeeCredits'])}
              suffix="credits"
            />
          }
        />
        <SettingRow
          label="Asset refund window"
          htmlFor={refundWindow.input}
          description="Buyers can ask for a refund within this many days of buying an asset. 0 turns refunds off."
          {...marketRow('refundWindowDays')}
          defaultLabel={marketRow('refundWindowDays').defaultLabel ? `${marketDefault?.refundWindowDays} days` : null}
          errorId={refundWindow.error}
          control={
            <NumberInput
              id={refundWindow.input}
              value={draft.marketplaceSettings.refundWindowDays}
              onChange={(v) => setMarket('refundWindowDays', v)}
              rule={rules.refundWindowDays}
              invalid={Boolean(errors['marketplaceSettings.refundWindowDays'])}
              suffix="days"
            />
          }
        />
        <SettingRow
          label="Minimum cashout"
          htmlFor={minPayout.input}
          description={
            Number.isFinite(draft.marketplaceSettings.minPayoutCredits) && Number.isFinite(draft.creditValuePhp)
              ? `Members need at least this many credits to cash out (about ${php(draft.marketplaceSettings.minPayoutCredits * draft.creditValuePhp)}).`
              : 'Members need at least this many credits to cash out.'
          }
          {...marketRow('minPayoutCredits')}
          defaultLabel={marketRow('minPayoutCredits').defaultLabel ? `${marketDefault?.minPayoutCredits} credits` : null}
          errorId={minPayout.error}
          control={
            <NumberInput
              id={minPayout.input}
              value={draft.marketplaceSettings.minPayoutCredits}
              onChange={(v) => setMarket('minPayoutCredits', v)}
              rule={rules.minPayoutCredits}
              invalid={Boolean(errors['marketplaceSettings.minPayoutCredits'])}
              suffix="credits"
            />
          }
        />
      </SettingsCard>
    </div>
  );
}
